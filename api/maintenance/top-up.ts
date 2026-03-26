import 'dotenv/config';
import { getAdminDb } from '../_lib/supabase-admin.js';
import { runQuestionPipeline } from '../generate-questions.js';
import { getPlayableCategories } from '../../types.js';
import {
  AUTO_REPLENISH_BATCH_SIZE,
  MAINTENANCE_REPLENISH_THRESHOLD,
} from '../../services/questionInventoryConfig.js';

const supabase = getAdminDb();

function parseAllowedEmails(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

async function verifyAuthorizedCaller(req: any) {
  const secretToken = process.env.MAINTENANCE_TOKEN;
  const authHeader = req.headers.authorization;
  const maintenanceToken = req.headers['x-maintenance-token'];

  if (secretToken && maintenanceToken === secretToken) {
    return { authType: 'maintenance-token' as const, email: null };
  }

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing bearer token');
  }

  const accessToken = authHeader.slice('Bearer '.length).trim();
  if (!accessToken) {
    throw new Error('Missing bearer token');
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    throw new Error('Invalid access token');
  }

  const email = user.email?.toLowerCase() || null;
  const allowedEmails = parseAllowedEmails(process.env.MAINTENANCE_ALLOWED_EMAILS);

  if (!email || !allowedEmails.includes(email)) {
    throw new Error('Caller is not on the maintenance email allowlist');
  }

  return { authType: 'supabase-token' as const, email };
}

async function getExistingQuestions(category: string): Promise<{ category: string; question: string }[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('category, question')
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching existing questions:', error);
    return [];
  }

  return data || [];
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const caller = await verifyAuthorizedCaller(req);
    console.info('[top-up] authorized caller', caller);
  } catch (error) {
    return res.status(401).json({
      error: error instanceof Error ? error.message : 'Unauthorized',
    });
  }

  const results: any[] = [];
  const categories = getPlayableCategories();
  const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];

  const requestId = `topup-${Date.now()}`;
  const requestUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host || ''}`;

  console.info(`[top-up] Starting replenishment for ${categories.length} categories...`);

  for (const category of categories) {
    for (const difficulty of difficulties) {
      try {
        // 1. Check current inventory
        const { count, error: countError } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('category', category)
          .eq('difficulty', difficulty)
          .eq('validation_status', 'approved');

        if (countError) throw countError;
        
        const currentCount = count || 0;
        
        if (currentCount < MAINTENANCE_REPLENISH_THRESHOLD) {
          console.info(`[top-up] Replenishing ${category}/${difficulty}: current count ${currentCount} < ${MAINTENANCE_REPLENISH_THRESHOLD}`);
          
          // 2. Fetch existing questions for deduplication
          const existingQuestions = await getExistingQuestions(category);
          
          // 3. Trigger pipeline
          const context = {
            requestId: `${requestId}-${category}-${difficulty}`,
            startedAt: Date.now(),
          };

          const newQuestions = await runQuestionPipeline({
            categories: [category],
            countPerCategory: AUTO_REPLENISH_BATCH_SIZE,
            existingQuestions,
            requestedDifficulty: difficulty,
            requestUrl,
            context,
          });

          if (newQuestions.length > 0) {
            // 4. Store in Supabase
            const rows = newQuestions.map(q => ({
              ...q,
              validation_status: 'approved',
              created_at: Math.floor(Date.now() / 1000), // Using unix timestamp as in types
              used_count: 0,
              used: false,
            }));

            const { error: insertError } = await supabase.from('questions').insert(rows);
            if (insertError) throw insertError;
            
            console.info(`[top-up] Successfully added ${newQuestions.length} questions to ${category}/${difficulty}`);
            results.push({ category, difficulty, added: newQuestions.length, status: 'replenished' });
            
            // 5. Stagger requests to avoid Gemini rate limits
            await sleep(2000); 
          } else {
            console.warn(`[top-up] Pipeline returned 0 questions for ${category}/${difficulty}`);
            results.push({ category, difficulty, added: 0, status: 'pipeline_empty' });
          }
        } else {
          results.push({ category, difficulty, count: currentCount, status: 'sufficient' });
        }
      } catch (error) {
        console.error(`[top-up] Error replenishing ${category}/${difficulty}:`, error);
        results.push({ category, difficulty, error: error instanceof Error ? error.message : String(error), status: 'error' });
      }
    }
  }

  return res.status(200).json({
    message: 'Maintenance top-up completed',
    requestId,
    results,
  });
}
