import { Depot, Withdrawal } from '../types';

export interface BillingResult {
  currentValue: number;
  adjustedValue: number;
  netWithdrawals: number;
  managementFee: number;
  hurdle: number;
  outperformance: number;
  performanceFee: number;
  totalFee: number;
  newCurrentValue: number;
  newHighWaterMark: number;
  performanceFeeApplied: boolean;
  returnAbsolute: number;
  returnPercent: number;
}

export function calculateBilling(
  depot: Depot,
  withdrawalsSinceLastBilling: Withdrawal[]
): BillingResult {
  const currentValue = depot.currentValue;

  // Nettoentnahmen: negativ = Entnahme, positiv = Einzahlung
  const netWithdrawals = withdrawalsSinceLastBilling.reduce((s, w) => s + w.amount, 0);

  // Bereinigter Depotwert: so als ob keine Entnahmen/Einzahlungen stattgefunden hätten
  const adjustedValue = currentValue - netWithdrawals;

  // Laufende Vergütung: % p.a. auf aktuellen Depotwert
  const managementFee = currentValue * (depot.managementFeeRate / 100);

  // High-Water-Mark Hurdle: HWM * (1 + Benchmark)
  const hurdle = depot.highWaterMark * (1 + depot.benchmarkRate / 100);

  // Überperformance
  const outperformance = Math.max(0, adjustedValue - hurdle);
  const performanceFeeApplied = outperformance > 0;
  const performanceFee = outperformance * (depot.performanceFeeRate / 100);

  const totalFee = managementFee + performanceFee;
  const newCurrentValue = currentValue - totalFee;

  // HWM wird nur aktualisiert, wenn Überperformance erzielt wurde
  const newHighWaterMark = performanceFeeApplied ? adjustedValue : depot.highWaterMark;

  // Rendite gegenüber letztem HWM
  const returnAbsolute = adjustedValue - depot.highWaterMark;
  const returnPercent = depot.highWaterMark > 0
    ? ((adjustedValue / depot.highWaterMark) - 1) * 100
    : 0;

  return {
    currentValue,
    adjustedValue,
    netWithdrawals,
    managementFee,
    hurdle,
    outperformance,
    performanceFee,
    totalFee,
    newCurrentValue,
    newHighWaterMark,
    performanceFeeApplied,
    returnAbsolute,
    returnPercent,
  };
}

export function calculateSimpleReturn(depot: Depot): { absolute: number; percent: number } {
  const absolute = depot.currentValue - depot.startValue;
  const percent = depot.startValue > 0 ? (absolute / depot.startValue) * 100 : 0;
  return { absolute, percent };
}

export function estimatedFees(depot: Depot): { management: number; total: number } {
  const management = depot.currentValue * (depot.managementFeeRate / 100);
  return { management, total: management };
}
