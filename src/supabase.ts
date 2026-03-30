import {
  AuthChangeEvent,
  RealtimeChannel,
  Session,
  SupabaseClient,
  User,
  createClient,
} from '@supabase/supabase-js';

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

type SessionResponse = {
  data: { session: Session | null };
  error: Error | null;
};

type SignInWithOtpResponse = {
  data: {
    session: Session | null;
    user: User | null;
  };
  error: Error | null;
};

type MissingSupabaseClient = Pick<SupabaseClient<Database>, 'removeChannel'> & {
  auth: {
    signInWithOtp: () => Promise<SignInWithOtpResponse>;
    signOut: () => Promise<never>;
    getSession: () => Promise<SessionResponse>;
    onAuthStateChange: (
      callback: (event: AuthChangeEvent, session: Session | null) => void
    ) => {
      data: {
        subscription: {
          unsubscribe: () => void;
        };
      };
    };
  };
  from: () => never;
  channel: () => never;
};

function createMissingSupabaseClient(): MissingSupabaseClient {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'auth') {
          return {
            signInWithOtp: async () => throwMissingSupabaseConfig(),
            signOut: async () => throwMissingSupabaseConfig(),
            getSession: async () => ({
              data: { session: null },
              error: new Error(SUPABASE_MISSING_ENV_MESSAGE),
            }),
            onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
              callback('INITIAL_SESSION', null);
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
  ) as MissingSupabaseClient;
}

// Add the database types as needed.
export interface Database {
  public: {
    Tables: {
      metadata: {
        Row: {
          id: string;
          data: Record<string, unknown>;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['metadata']['Row']>;
        Update: Partial<Database['public']['Tables']['metadata']['Row']>;
        Relationships: [];
      };
      inventory: {
        Row: {
          id: string;
          bucketId?: string;
          category: string;
          difficulty: string;
          count: number;
          threshold?: number | null;
          last_updated: string;
        };
        Insert: Partial<Database['public']['Tables']['inventory']['Row']>;
        Update: Partial<Database['public']['Tables']['inventory']['Row']>;
        Relationships: [];
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
        Relationships: [];
      };
      triggers: {
        Row: {
          id: string;
          action: string;
          params: Record<string, unknown>;
          status: string;
          timestamp: string;
        };
        Insert: Partial<Database['public']['Tables']['triggers']['Row']>;
        Update: Partial<Database['public']['Tables']['triggers']['Row']>;
        Relationships: [];
      }
    };
  };
}

export const supabase = (
  isSupabaseConfigured
    ? createClient<Database>(supabaseUrl, supabaseAnonKey)
    : createMissingSupabaseClient()
) as SupabaseClient<Database> | MissingSupabaseClient;

export const signIn = async (email: string) => {
  if (!isSupabaseConfigured) throwMissingSupabaseConfig();
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
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

export const onAuthStateChange = (callback: (user: User | null) => void) => {
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
