export function formatCurrency(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

export function formatBillingDate(mmdd: string): string {
  const [m, d] = mmdd.split('-');
  return `${d}.${m}.`;
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function daysUntilBilling(billingDate: string): number {
  const now = new Date();
  const [m, d] = billingDate.split('-').map(Number);
  let next = new Date(now.getFullYear(), m - 1, d);
  if (next <= now) next = new Date(now.getFullYear() + 1, m - 1, d);
  return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function nextBillingDateStr(billingDate: string): string {
  const now = new Date();
  const [m, d] = billingDate.split('-').map(Number);
  let next = new Date(now.getFullYear(), m - 1, d);
  if (next <= now) next = new Date(now.getFullYear() + 1, m - 1, d);
  return next.toISOString().split('T')[0];
}

export function currentYear(): string {
  return new Date().getFullYear().toString();
}
