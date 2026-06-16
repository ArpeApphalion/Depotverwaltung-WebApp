import * as XLSX from 'xlsx';
import { Depot, ValueEntry, FeePayment, Withdrawal } from '../types';
import { formatCurrency, formatDate } from './format';

export function generateExcel(
  depot: Depot,
  valueHistory: ValueEntry[],
  feePayments: FeePayment[],
  withdrawals: Withdrawal[]
) {
  const wb = XLSX.utils.book_new();
  const currency = depot.currency;

  // ---- Sheet 1: Übersicht ----
  const overview = [
    ['DEPOT JAHRESÜBERSICHT', '', ''],
    ['Erstellt am', new Date().toLocaleDateString('de-DE'), ''],
    ['', '', ''],
    ['KUNDENDATEN', '', ''],
    ['Kundenname', depot.clientName, ''],
    ['E-Mail', depot.clientEmail, ''],
    ['Währung', currency, ''],
    ['', '', ''],
    ['DEPOTWERTE', '', ''],
    ['Startwert', depot.startValue, ''],
    ['Aktueller Wert', depot.currentValue, ''],
    ['Gesamtrendite (absolut)', depot.currentValue - depot.startValue, ''],
    ['Gesamtrendite (%)', depot.startValue > 0 ? ((depot.currentValue / depot.startValue) - 1) * 100 : 0, '%'],
    ['High-Water-Mark', depot.highWaterMark, ''],
    ['', '', ''],
    ['ABRECHNUNGSPARAMETER', '', ''],
    ['Startdatum', formatDate(depot.startDate), ''],
    ['Abrechnungsdatum', depot.billingDate, ''],
    ['Zielrendite p.a.', depot.targetReturn, '%'],
    ['Laufende Vergütung p.a.', depot.managementFeeRate, '%'],
    ['Übergewinn-Vergütung', depot.performanceFeeRate, '%'],
    ['Benchmark (ING)', depot.benchmarkRate, '%'],
    depot.lastBillingDate ? ['Letzte Abrechnung', formatDate(depot.lastBillingDate), ''] : ['Letzte Abrechnung', 'Noch keine', ''],
    ['', '', ''],
    ['NOTIZEN', '', ''],
    [depot.notes || '—', '', ''],
  ];

  const wsOverview = XLSX.utils.aoa_to_sheet(overview);
  wsOverview['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Übersicht');

  // ---- Sheet 2: Wertverlauf ----
  const histHeader = [['Datum', 'Depotwert', 'Notiz']];
  const histRows = valueHistory
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(v => [formatDate(v.date), v.value, v.note || '']);
  // Add current value at end
  histRows.push([new Date().toLocaleDateString('de-DE') + ' (aktuell)', depot.currentValue, '']);

  const wsHistory = XLSX.utils.aoa_to_sheet([...histHeader, ...histRows]);
  wsHistory['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsHistory, 'Wertverlauf');

  // ---- Sheet 3: Entnahmen & Einzahlungen ----
  const wHeader = [['Datum', 'Betrag', 'Typ', 'Notiz']];
  const wRows = withdrawals
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(w => [
      formatDate(w.date),
      Math.abs(w.amount),
      w.amount < 0 ? 'Entnahme' : 'Einzahlung',
      w.note || '',
    ]);
  const wTotal = withdrawals.reduce((s, w) => s + w.amount, 0);
  wRows.push(['', '', '', '']);
  wRows.push(['Summe (netto)', wTotal, wTotal < 0 ? 'Netto-Entnahme' : 'Netto-Einzahlung', '']);

  const wsW = XLSX.utils.aoa_to_sheet([...wHeader, ...wRows]);
  wsW['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsW, 'Entnahmen & Einzahlungen');

  // ---- Sheet 4: Abrechnungen ----
  const fHeader = [[
    'Datum', 'Periode', 'Depotwert', 'Bereinigter Wert',
    'HWM vorher', 'Hurdle', 'HWM nachher',
    'Benchmark %', 'Lfd. Vergütung', 'Übergewinn-Verg.', 'Gesamt'
  ]];
  const fRows = feePayments
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(f => [
      formatDate(f.date),
      f.period,
      f.depotValueAtBilling,
      f.adjustedValue,
      f.highWaterMarkBefore,
      f.hurdle,
      f.highWaterMarkAfter,
      f.benchmarkRate,
      f.managementFee,
      f.performanceFee,
      f.totalFee,
    ]);

  const wsF = XLSX.utils.aoa_to_sheet([...fHeader, ...fRows]);
  wsF['!cols'] = Array(11).fill({ wch: 18 });
  XLSX.utils.book_append_sheet(wb, wsF, 'Abrechnungshistorie');

  // ---- Download ----
  const fileName = `Depot_${depot.clientName.replace(/\s+/g, '_')}_${new Date().getFullYear()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
