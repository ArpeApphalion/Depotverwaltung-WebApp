import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, Timestamp, writeBatch, getDoc
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { Depot, Withdrawal, FeePayment, ValueEntry } from '../types';

interface DataCtx {
  getDepots: () => Promise<Depot[]>;
  addDepot: (d: Omit<Depot, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateDepot: (id: string, d: Partial<Depot>) => Promise<void>;
  deleteDepot: (id: string) => Promise<void>;

  getWithdrawals: (depotId: string) => Promise<Withdrawal[]>;
  addWithdrawal: (d: Omit<Withdrawal, 'id' | 'createdAt'>) => Promise<string>;
  deleteWithdrawal: (depotId: string, id: string) => Promise<void>;

  getFeePayments: (depotId: string) => Promise<FeePayment[]>;
  addFeePayment: (d: Omit<FeePayment, 'id' | 'createdAt'>) => Promise<string>;

  getValueHistory: (depotId: string) => Promise<ValueEntry[]>;
  addValueEntry: (d: Omit<ValueEntry, 'id' | 'createdAt'>) => Promise<string>;
  deleteValueEntry: (depotId: string, id: string) => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

const path = (uid: string, depotId?: string, sub?: string) => {
  if (depotId && sub) return `users/${uid}/depots/${depotId}/${sub}`;
  if (depotId) return `users/${uid}/depots/${depotId}`;
  return `users/${uid}/depots`;
};

export function DataProvider({ children }: { children: ReactNode }) {
  const { db, user } = useAuth();
  const uid = user!.uid;

  // ---- Depots ----
  const getDepots = useCallback(async (): Promise<Depot[]> => {
    const snap = await getDocs(query(collection(db, path(uid)), orderBy('clientName')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Depot));
  }, [db, uid]);

  const addDepot = useCallback(async (data: Omit<Depot, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const ref = await addDoc(collection(db, path(uid)), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return ref.id;
  }, [db, uid]);

  const updateDepot = useCallback(async (id: string, data: Partial<Depot>): Promise<void> => {
    await updateDoc(doc(db, path(uid, id)), { ...data, updatedAt: Timestamp.now() });
  }, [db, uid]);

  const deleteDepot = useCallback(async (id: string): Promise<void> => {
    const batch = writeBatch(db);
    for (const sub of ['withdrawals', 'feePayments', 'valueHistory']) {
      const snap = await getDocs(collection(db, path(uid, id, sub)));
      snap.docs.forEach(d => batch.delete(d.ref));
    }
    batch.delete(doc(db, path(uid, id)));
    await batch.commit();
  }, [db, uid]);

  // ---- Withdrawals ----
  const getWithdrawals = useCallback(async (depotId: string): Promise<Withdrawal[]> => {
    const snap = await getDocs(query(
      collection(db, path(uid, depotId, 'withdrawals')),
      orderBy('date', 'desc')
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Withdrawal));
  }, [db, uid]);

  const addWithdrawal = useCallback(async (data: Omit<Withdrawal, 'id' | 'createdAt'>): Promise<string> => {
    const ref = await addDoc(collection(db, path(uid, data.depotId, 'withdrawals')), {
      ...data,
      createdAt: Timestamp.now(),
    });
    return ref.id;
  }, [db, uid]);

  const deleteWithdrawal = useCallback(async (depotId: string, id: string): Promise<void> => {
    await deleteDoc(doc(db, path(uid, depotId, 'withdrawals'), id));
  }, [db, uid]);

  // ---- Fee Payments ----
  const getFeePayments = useCallback(async (depotId: string): Promise<FeePayment[]> => {
    const snap = await getDocs(query(
      collection(db, path(uid, depotId, 'feePayments')),
      orderBy('date', 'desc')
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FeePayment));
  }, [db, uid]);

  const addFeePayment = useCallback(async (data: Omit<FeePayment, 'id' | 'createdAt'>): Promise<string> => {
    const ref = await addDoc(collection(db, path(uid, data.depotId, 'feePayments')), {
      ...data,
      createdAt: Timestamp.now(),
    });
    return ref.id;
  }, [db, uid]);

  // ---- Value History ----
  const getValueHistory = useCallback(async (depotId: string): Promise<ValueEntry[]> => {
    const snap = await getDocs(query(
      collection(db, path(uid, depotId, 'valueHistory')),
      orderBy('date', 'desc')
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ValueEntry));
  }, [db, uid]);

  const addValueEntry = useCallback(async (data: Omit<ValueEntry, 'id' | 'createdAt'>): Promise<string> => {
    const ref = await addDoc(collection(db, path(uid, data.depotId, 'valueHistory')), {
      ...data,
      createdAt: Timestamp.now(),
    });
    return ref.id;
  }, [db, uid]);

  const deleteValueEntry = useCallback(async (depotId: string, id: string): Promise<void> => {
    await deleteDoc(doc(db, path(uid, depotId, 'valueHistory'), id));
  }, [db, uid]);

  return (
    <Ctx.Provider value={{
      getDepots, addDepot, updateDepot, deleteDepot,
      getWithdrawals, addWithdrawal, deleteWithdrawal,
      getFeePayments, addFeePayment,
      getValueHistory, addValueEntry, deleteValueEntry,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData outside DataProvider');
  return ctx;
}
