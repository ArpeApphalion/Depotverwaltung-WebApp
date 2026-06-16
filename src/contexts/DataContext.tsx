import React, { createContext, useContext, useCallback, ReactNode, useState } from 'react';
import { Depot, Withdrawal, FeePayment, ValueEntry, AppBackup } from '../types';

// ---- Storage helpers ----

const KEY = {
  depots: 'dvw_depots',
  withdrawals: 'dvw_withdrawals',
  fees: 'dvw_fees',
  history: 'dvw_history',
};

function load<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function save<T>(key: string, data: Record<string, T>): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function uid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// ---- Context ----

interface DataCtx {
  // trigger re-render across components
  version: number;
  refresh: () => void;

  getDepots: () => Depot[];
  addDepot: (d: Omit<Depot, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDepot: (id: string, d: Partial<Depot>) => void;
  deleteDepot: (id: string) => void;

  getWithdrawals: (depotId: string) => Withdrawal[];
  addWithdrawal: (d: Omit<Withdrawal, 'id' | 'createdAt'>) => string;
  deleteWithdrawal: (id: string) => void;

  getFeePayments: (depotId: string) => FeePayment[];
  addFeePayment: (d: Omit<FeePayment, 'id' | 'createdAt'>) => string;

  getValueHistory: (depotId: string) => ValueEntry[];
  addValueEntry: (d: Omit<ValueEntry, 'id' | 'createdAt'>) => string;
  deleteValueEntry: (id: string) => void;

  exportBackup: () => void;
  importBackup: (file: File) => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(v => v + 1), []);

  // ---- Depots ----
  const getDepots = useCallback((): Depot[] => {
    const all = load<Depot>(KEY.depots);
    return Object.values(all).sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [version]);

  const addDepot = useCallback((data: Omit<Depot, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const all = load<Depot>(KEY.depots);
    const id = uid();
    all[id] = { ...data, id, createdAt: now(), updatedAt: now() };
    save(KEY.depots, all);
    refresh();
    return id;
  }, [refresh]);

  const updateDepot = useCallback((id: string, data: Partial<Depot>): void => {
    const all = load<Depot>(KEY.depots);
    if (all[id]) all[id] = { ...all[id], ...data, updatedAt: now() };
    save(KEY.depots, all);
    refresh();
  }, [refresh]);

  const deleteDepot = useCallback((id: string): void => {
    // Delete depot
    const depots = load<Depot>(KEY.depots);
    delete depots[id];
    save(KEY.depots, depots);
    // Delete related withdrawals
    const w = load<Withdrawal>(KEY.withdrawals);
    Object.keys(w).forEach(k => { if (w[k].depotId === id) delete w[k]; });
    save(KEY.withdrawals, w);
    // Delete related fee payments
    const f = load<FeePayment>(KEY.fees);
    Object.keys(f).forEach(k => { if (f[k].depotId === id) delete f[k]; });
    save(KEY.fees, f);
    // Delete related value history
    const h = load<ValueEntry>(KEY.history);
    Object.keys(h).forEach(k => { if (h[k].depotId === id) delete h[k]; });
    save(KEY.history, h);
    refresh();
  }, [refresh]);

  // ---- Withdrawals ----
  const getWithdrawals = useCallback((depotId: string): Withdrawal[] => {
    const all = load<Withdrawal>(KEY.withdrawals);
    return Object.values(all)
      .filter(w => w.depotId === depotId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [version]);

  const addWithdrawal = useCallback((data: Omit<Withdrawal, 'id' | 'createdAt'>): string => {
    const all = load<Withdrawal>(KEY.withdrawals);
    const id = uid();
    all[id] = { ...data, id, createdAt: now() };
    save(KEY.withdrawals, all);
    refresh();
    return id;
  }, [refresh]);

  const deleteWithdrawal = useCallback((id: string): void => {
    const all = load<Withdrawal>(KEY.withdrawals);
    delete all[id];
    save(KEY.withdrawals, all);
    refresh();
  }, [refresh]);

  // ---- Fee Payments ----
  const getFeePayments = useCallback((depotId: string): FeePayment[] => {
    const all = load<FeePayment>(KEY.fees);
    return Object.values(all)
      .filter(f => f.depotId === depotId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [version]);

  const addFeePayment = useCallback((data: Omit<FeePayment, 'id' | 'createdAt'>): string => {
    const all = load<FeePayment>(KEY.fees);
    const id = uid();
    all[id] = { ...data, id, createdAt: now() };
    save(KEY.fees, all);
    refresh();
    return id;
  }, [refresh]);

  // ---- Value History ----
  const getValueHistory = useCallback((depotId: string): ValueEntry[] => {
    const all = load<ValueEntry>(KEY.history);
    return Object.values(all)
      .filter(v => v.depotId === depotId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [version]);

  const addValueEntry = useCallback((data: Omit<ValueEntry, 'id' | 'createdAt'>): string => {
    const all = load<ValueEntry>(KEY.history);
    const id = uid();
    all[id] = { ...data, id, createdAt: now() };
    save(KEY.history, all);
    refresh();
    return id;
  }, [refresh]);

  const deleteValueEntry = useCallback((id: string): void => {
    const all = load<ValueEntry>(KEY.history);
    delete all[id];
    save(KEY.history, all);
    refresh();
  }, [refresh]);

  // ---- Backup / Restore ----
  const exportBackup = useCallback((): void => {
    const backup: AppBackup = {
      version: 1,
      exportedAt: now(),
      depots: load<Depot>(KEY.depots),
      withdrawals: load<Withdrawal>(KEY.withdrawals),
      feePayments: load<FeePayment>(KEY.fees),
      valueHistory: load<ValueEntry>(KEY.history),
    };
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `depotverwaltung_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importBackup = useCallback(async (file: File): Promise<void> => {
    const text = await file.text();
    const backup: AppBackup = JSON.parse(text);
    if (!backup.version || !backup.depots) throw new Error('Ungültige Backup-Datei.');
    save(KEY.depots, backup.depots);
    save(KEY.withdrawals, backup.withdrawals || {});
    save(KEY.fees, backup.feePayments || {});
    save(KEY.history, backup.valueHistory || {});
    refresh();
  }, [refresh]);

  return (
    <Ctx.Provider value={{
      version, refresh,
      getDepots, addDepot, updateDepot, deleteDepot,
      getWithdrawals, addWithdrawal, deleteWithdrawal,
      getFeePayments, addFeePayment,
      getValueHistory, addValueEntry, deleteValueEntry,
      exportBackup, importBackup,
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
