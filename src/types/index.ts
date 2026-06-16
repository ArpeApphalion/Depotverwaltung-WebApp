export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface Depot {
  id: string;
  clientName: string;
  clientEmail: string;
  startValue: number;
  currentValue: number;
  startDate: string;          // YYYY-MM-DD
  billingDate: string;        // MM-DD (jährliches Abrechnungsdatum)
  lastBillingDate: string | null; // YYYY-MM-DD
  targetReturn: number;       // % p.a.
  managementFeeRate: number;  // % p.a. (laufende Vergütung)
  performanceFeeRate: number; // % auf Überperformance (Übergewinnvergütung)
  highWaterMark: number;      // Höchststand (bereinigt)
  benchmarkRate: number;      // ING-Benchmark %
  notes: string;
  currency: string;
  createdAt: any;
  updatedAt: any;
}

export interface Withdrawal {
  id: string;
  depotId: string;
  amount: number;   // negativ = Entnahme, positiv = Einzahlung
  date: string;     // YYYY-MM-DD
  note: string;
  createdAt: any;
}

export interface FeePayment {
  id: string;
  depotId: string;
  managementFee: number;
  performanceFee: number;
  totalFee: number;
  period: string;              // z.B. "2024"
  date: string;               // YYYY-MM-DD
  depotValueAtBilling: number;
  adjustedValue: number;
  netWithdrawals: number;
  highWaterMarkBefore: number;
  highWaterMarkAfter: number;
  benchmarkRate: number;
  hurdle: number;
  createdAt: any;
}

export interface ValueEntry {
  id: string;
  depotId: string;
  value: number;
  date: string; // YYYY-MM-DD
  note: string;
  createdAt: any;
}
