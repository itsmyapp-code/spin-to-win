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
  getAuth,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { initFirebase } from '@/lib/firebase';
import { getStaffRole } from '@/lib/firestoreOps';
import { getFirestore } from 'firebase/firestore';
import type { StaffRole } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  staffRole: StaffRole | null;
  authLoading: boolean;
  signInAsStaff: (email: string, password: string) => Promise<void>;
  signInAsCustomer: () => Promise<void>;
  signOutUser: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  staffRole: null,
  authLoading: true,
  signInAsStaff: async () => void 0,
  signInAsCustomer: async () => void 0,
  signOutUser: async () => void 0,
  authError: null,
});

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setAuthError(msg.replace('Firebase: ', '').replace(/\(auth\/.*?\)/, '').trim());
    }
  }, []);

  const signInAsCustomer = useCallback(async () => {
    setAuthError(null);
    try {
      const { auth } = initFirebase();
      await signInAnonymously(auth);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Anonymous sign-in failed';
      setAuthError(msg);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    const { auth } = initFirebase();
    await signOut(auth);
    setStaffRole(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, staffRole, authLoading, signInAsStaff, signInAsCustomer, signOutUser, authError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
