import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User, onAuthStateChanged,
  signInWithPopup, GoogleAuthProvider, signOut
} from 'firebase/auth';
import { initFirebase } from '../firebase';
import { FirebaseConfig } from '../types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  auth: any;
  db: any;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ config, children }: { config: FirebaseConfig; children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { auth, db } = initFirebase(config);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, [auth]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <Ctx.Provider value={{ user, loading, auth, db, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
