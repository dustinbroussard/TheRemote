import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { auth, googleProvider } from '../firebase';
import { isAdminUser } from '../config/admin';

type AuthContextValue = {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function shouldUseRedirectSignIn() {
  if (typeof window === 'undefined') {
    return false;
  }

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const mobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  return standalone || mobile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authReady,
      isAdmin: isAdminUser(user),
      signIn: async () => {
        if (shouldUseRedirectSignIn()) {
          await signInWithRedirect(auth, googleProvider);
          return;
        }

        try {
          await signInWithPopup(auth, googleProvider);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const shouldFallback =
            message.includes('popup') || message.includes('redirect');

          if (!shouldFallback) {
            throw error;
          }

          await signInWithRedirect(auth, googleProvider);
        }
      },
      signOutUser: async () => {
        await signOut(auth);
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
