export interface Depot {
  id: string;
  clientName: string;
  clientEmail: string;
  startValue: number;
  currentValue: number;
  startDate: string;
  billingDate: string;
  lastBillingDate: string | null;
  targetReturn: number;
  managementFeeRate: number;
  performanceFeeRate: number;
  highWaterMark: number;
  benchmarkRate: number;
  notes: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Withdrawal {
  id: string;
  depotId: string;
  amount: number;
  date: string;
  note: string;
  createdAt: string;
}

export interface FeePayment {
  id: string;
  depotId: string;
  managementFee: number;
  performanceFee: number;
  totalFee: number;
  period: string;
  date: string;
  depotValueAtBilling: number;
  adjustedValue: number;
  netWithdrawals: number;
  highWaterMarkBefore: number;
  highWaterMarkAfter: number;
  benchmarkRate: number;
  hurdle: number;
  createdAt: string;
}

export interface ValueEntry {
  id: string;
  depotId: string;
  value: number;
  date: string;
  note: string;
  createdAt: string;
}

export interface AppBackup {
  version: number;
  exportedAt: string;
  depots: Record<string, Depot>;
  withdrawals: Record<string, Withdrawal>;
  feePayments: Record<string, FeePayment>;
  valueHistory: Record<string, ValueEntry>;
}
