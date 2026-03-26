import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingSupabaseVars = [
  !supabaseUrl ? 'VITE_SUPABASE_URL' : null,
  !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null,
].filter(Boolean) as string[];

export const SUPABASE_MISSING_ENV_MESSAGE =
  `Supabase is not configured. Missing environment variables: ${missingSupabaseVars.join(', ')}. ` +
  'Add them to .env.local and restart the Vite dev server.';

export const isSupabaseConfigured = missingSupabaseVars.length === 0;

if (!isSupabaseConfigured) {
  console.warn(SUPABASE_MISSING_ENV_MESSAGE);
}

function throwMissingSupabaseConfig(): never {
  throw new Error(SUPABASE_MISSING_ENV_MESSAGE);
}

function createMissingSupabaseClient() {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'auth') {
          return {
            signInWithOAuth: async () => throwMissingSupabaseConfig(),
            signOut: async () => throwMissingSupabaseConfig(),
            getSession: async () => ({
              data: { session: null },
              error: new Error(SUPABASE_MISSING_ENV_MESSAGE),
            }),
            onAuthStateChange: (callback: (_user: any) => void) => {
              callback(null);
              return {
                data: {
                  subscription: {
                    unsubscribe() {},
                  },
                },
              };
            },
          };
        }

        if (prop === 'removeChannel') {
          return () => undefined;
        }

        return () => throwMissingSupabaseConfig();
      },
    }
  );
}

// Add the database types as needed
export interface Database {
  public: {
    Tables: {
      metadata: {
        Row: {
          id: string;
          data: any;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['metadata']['Row']>;
        Update: Partial<Database['public']['Tables']['metadata']['Row']>;
      };
      inventory: {
        Row: {
          id: string;
          category: string;
          difficulty: string;
          count: number;
          last_updated: string;
        };
        Insert: Partial<Database['public']['Tables']['inventory']['Row']>;
        Update: Partial<Database['public']['Tables']['inventory']['Row']>;
      };
      error_logs: {
        Row: {
          id: string;
          message: string;
          stage: string;
          timestamp: string;
          bucketId: string | null;
        };
        Insert: Partial<Database['public']['Tables']['error_logs']['Row']>;
        Update: Partial<Database['public']['Tables']['error_logs']['Row']>;
      };
      triggers: {
        Row: {
          id: string;
          action: string;
          params: any;
          status: string;
          timestamp: string;
        };
        Insert: Partial<Database['public']['Tables']['triggers']['Row']>;
        Update: Partial<Database['public']['Tables']['triggers']['Row']>;
      }
    };
  };
}

export const supabase = (
  isSupabaseConfigured
    ? createClient<Database>(supabaseUrl, supabaseAnonKey)
    : createMissingSupabaseClient()
) as any;

export const signIn = async () => {
  if (!isSupabaseConfigured) throwMissingSupabaseConfig();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data;
};

export const signOut = () => {
  if (!isSupabaseConfigured) {
    return Promise.resolve({ error: new Error(SUPABASE_MISSING_ENV_MESSAGE) });
  }
  return supabase.auth.signOut();
};

export const getSession = () => {
  if (!isSupabaseConfigured) {
    return Promise.resolve({
      data: { session: null },
      error: new Error(SUPABASE_MISSING_ENV_MESSAGE),
    });
  }
  return supabase.auth.getSession();
};

export const onAuthStateChange = (callback: (user: any) => void) => {
  if (!isSupabaseConfigured) {
    callback(null);
    return {
      unsubscribe() {},
    };
  }
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return subscription;
};
