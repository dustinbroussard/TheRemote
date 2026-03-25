import { initializeApp } from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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

export async function signIn() {
  if (shouldUseRedirectSignIn()) {
    await signInWithRedirect(auth, googleProvider);
    return;
  }

  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const shouldFallback = message.includes('popup') || message.includes('redirect');

    if (!shouldFallback) {
      throw error;
    }

    await signInWithRedirect(auth, googleProvider);
  }
}

export async function finishSignInRedirect() {
  return getRedirectResult(auth);
}

export async function signOut() {
  await firebaseSignOut(auth);
}

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'metadata', 'system'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  void testConnection();
}
