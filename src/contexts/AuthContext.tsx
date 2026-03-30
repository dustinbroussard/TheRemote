import { User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { AdminCandidate, isAdminUser } from '../config/admin';
import { onAuthStateChange, signIn, signOut, getSession } from '../supabase';

type AuthContextValue = {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  signIn: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Initial session check
    getSession()
      .then(({ data }) => {
        setUser(data.session?.user ?? null);
        setAuthReady(true);
      })
      .catch((error) => {
        console.error('Initial auth session check failed:', error);
        setUser(null);
        setAuthReady(true);
      });

    const subscription = onAuthStateChange((nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authReady,
      isAdmin: isAdminUser(user as AdminCandidate),
      signIn: async (email: string) => {
        try {
          await signIn(email);
        } catch (error) {
          console.error('Sign in error:', error);
          throw error;
        }
      },
      signOutUser: async () => {
        await signOut();
      },
    }),
    [authReady, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
