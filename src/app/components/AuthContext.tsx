'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { initFirebase } from '@/lib/firebase';
import { getStaffRole } from '@/lib/firestoreOps';
import type { StaffRole } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  staffRole: StaffRole | null;
  authLoading: boolean;
  authError: string | null;
  signInAsStaff: (email: string, password: string) => Promise<void>;
  createStaffAccount: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<string>;
  signInAsCustomer: () => Promise<void>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  staffRole: null,
  authLoading: true,
  authError: null,
  signInAsStaff: async () => void 0,
  createStaffAccount: async () => void 0,
  sendPasswordReset: async () => '',
  signInAsCustomer: async () => void 0,
  signOutUser: async () => void 0,
  clearAuthError: () => void 0,
});

function cleanFirebaseError(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Authentication failed';
  return raw
    .replace('Firebase: ', '')
    .replace(/\(auth\/.*?\)/, '')
    .replace('Error ', '')
    .trim();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const { auth, db } = initFirebase();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && u.email) {
        const role = await getStaffRole(db, u.email);
        setStaffRole(role);
      } else {
        setStaffRole(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const signInAsStaff = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const { auth, db } = initFirebase();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (cred.user.email) {
        const role = await getStaffRole(db, cred.user.email);
        setStaffRole(role);
      }
    } catch (err) {
      setAuthError(cleanFirebaseError(err));
    }
  }, []);

  const createStaffAccount = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const { auth } = initFirebase();
      await createUserWithEmailAndPassword(auth, email, password);
      // Note: role must be assigned in Firestore by an admin after account creation
    } catch (err) {
      setAuthError(cleanFirebaseError(err));
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string): Promise<string> => {
    setAuthError(null);
    try {
      const { auth } = initFirebase();
      await sendPasswordResetEmail(auth, email);
      return 'success';
    } catch (err) {
      const msg = cleanFirebaseError(err);
      setAuthError(msg);
      return 'error';
    }
  }, []);

  const signInAsCustomer = useCallback(async () => {
    setAuthError(null);
    try {
      const { auth } = initFirebase();
      await signInAnonymously(auth);
    } catch (err) {
      setAuthError(cleanFirebaseError(err));
    }
  }, []);

  const signOutUser = useCallback(async () => {
    const { auth } = initFirebase();
    await signOut(auth);
    setStaffRole(null);
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user, staffRole, authLoading, authError,
        signInAsStaff, createStaffAccount, sendPasswordReset,
        signInAsCustomer, signOutUser, clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
