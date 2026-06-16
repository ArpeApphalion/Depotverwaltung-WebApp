import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Depot, Withdrawal, FeePayment, ValueEntry } from '../types';
import { formatCurrency, formatDate, formatBillingDate, daysUntilBilling, today, currentYear } from '../utils/format';
import { calculateBilling, BillingResult } from '../utils/calculations';
import { generateExcel } from '../utils/excelExport';

// ---- Modals ----

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h3 className="modal-title">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function WithdrawalModal({ depot, onClose, onSave }: { depot: Depot; onClose: () => void; onSave: (amount: number, date: string, note: string) => Promise<void> }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'out' | 'in'>('out');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    setSaving(true);
    const signed = type === 'out' ? -val : val;
    await onSave(signed, date, note);
    onClose();
  };

  return (
    <Modal title="Entnahme / Einzahlung" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Typ</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={`btn ${type === 'out' ? 'btn-danger' : 'btn-ghost'} btn-full`} onClick={() => setType('out')}>
              − Entnahme
            </button>
            <button type="button" className={`btn ${type === 'in' ? 'btn-success' : 'btn-ghost'} btn-full`} onClick={() => setType('in')}>
              + Einzahlung
            </button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Betrag ({depot.currency})</label>
          <input className="form-input" type="number" min="0.01" step="0.01" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Datum</label>
          <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Notiz (optional)</label>
          <input className="form-input" placeholder="z.B. Urlaubskosten" value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>Speichern</button>
        </div>
      </form>
    </Modal>
  );
}

function ValueUpdateModal({ depot, onClose, onSave }: { depot: Depot; onClose: () => void; onSave: (value: number, date: string, note: string) => Promise<void> }) {
  const [value, setValue] = useState(depot.currentValue.toString());
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(value);
    if (isNaN(val) || val < 0) return;
    setSaving(true);
    await onSave(val, date, note);
    onClose();
  };

  return (
    <Modal title="Depotwert aktualisieren" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Aktueller Depotwert ({depot.currency})</label>
          <input className="form-input" type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} required />
          <div className="form-hint">Bisheriger Wert: {formatCurrency(depot.currentValue, depot.currency)}</div>
        </div>
        <div className="form-group">
          <label className="form-label">Datum der Bewertung</label>
          <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Notiz (optional)</label>
          <input className="form-input" placeholder="z.B. Quartalsende" value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>Aktualisieren</button>
        </div>
      </form>
    </Modal>
  );
}

function BenchmarkModal({ depot, onClose, onSave }: { depot: Depot; onClose: () => void; onSave: (rate: number) => Promise<void> }) {
  const [rate, setRate] = useState(depot.benchmarkRate.toString());
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(rate);
    if (isNaN(val)) return;
    setSaving(true);
    await onSave(val);
    onClose();
  };

  return (
    <Modal title="Benchmark aktualisieren" onClose={onClose}>
      <p style={{ marginBottom: 16, fontSize: '.875rem' }}>Aktueller ING-Zinssatz auf das Kontokorrentkonto (z.B. 2.5 für 2,5% p.a.).</p>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">ING Benchmark (%)</label>
          <input className="form-input" type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} required />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>Speichern</button>
        </div>
      </form>
    </Modal>
  );
}

function BillingModal({ depot, withdrawals, onClose, onConfirm }: {
  depot: Depot;
  withdrawals: Withdrawal[];
  onClose: () => void;
  onConfirm: (result: BillingResult) => Promise<void>;
}) {
  const lastBilling = depot.lastBillingDate;
  const wSince = withdrawals.filter(w => !lastBilling || w.date > lastBilling);
  const result = calculateBilling(depot, wSince);
  const [confirming, setConfirming] = useState(false);

  const confirm = async () => {
    setConfirming(true);
    await onConfirm(result);
    onClose();
  };

  const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '.9375rem' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <strong style={{ color: highlight ? 'var(--danger)' : undefined }}>{value}</strong>
    </div>
  );

  return (
    <Modal title="Jahresabrechnung" onClose={onClose}>
      <div className="alert alert-info" style={{ marginBottom: 12 }}>
        Abrechnungszeitraum seit: {lastBilling ? formatDate(lastBilling) : formatDate(depot.startDate)}
      </div>

      <Row label="Depotwert aktuell" value={formatCurrency(result.currentValue, depot.currency)} />
      <Row label="Nettoentnahmen" value={formatCurrency(Math.abs(result.netWithdrawals), depot.currency)} />
      <Row label="Bereinigter Wert" value={formatCurrency(result.adjustedValue, depot.currency)} />
      <Row label={`High-Water-Mark (Vorjahr)`} value={formatCurrency(depot.highWaterMark, depot.currency)} />
      <Row label={`Hurdle (HWM + ${depot.benchmarkRate}%)`} value={formatCurrency(result.hurdle, depot.currency)} />
      <div style={{ height: 8 }} />
      <Row label={`Lfd. Verg. (${depot.managementFeeRate}%)`} value={formatCurrency(result.managementFee, depot.currency)} highlight />
      <Row
        label={`Übergewinn-Verg. (${depot.performanceFeeRate}%)`}
        value={result.performanceFeeApplied ? formatCurrency(result.performanceFee, depot.currency) : `— (kein Übergewinn)`}
        highlight={result.performanceFeeApplied}
      />

      <div style={{ background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', padding: 12, margin: '12px 0', border: '1px solid #fecaca' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: '1rem' }}>Gesamtvergütung</strong>
          <strong style={{ fontSize: '1.25rem', color: 'var(--danger)' }}>{formatCurrency(result.totalFee, depot.currency)}</strong>
        </div>
        <div style={{ fontSize: '.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>Wird vom Depotwert abgezogen</div>
      </div>

      <Row label="Neuer Depotwert" value={formatCurrency(result.newCurrentValue, depot.currency)} />
      <Row label="Neuer High-Water-Mark" value={formatCurrency(result.newHighWaterMark, depot.currency)} />

      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
        <button className="btn btn-primary" onClick={confirm} disabled={confirming}>
          Abrechnung bestätigen
        </button>
      </div>
    </Modal>
  );
}

// ---- Tabs ----

function OverviewTab({ depot, onUpdateValue, onWithdrawal, onBenchmark, onBilling }: {
  depot: Depot;
  onUpdateValue: () => void;
  onWithdrawal: () => void;
  onBenchmark: () => void;
  onBilling: () => void;
}) {
  const days = daysUntilBilling(depot.billingDate);
  const ret = depot.currentValue - depot.startValue;
  const retPct = depot.startValue > 0 ? (ret / depot.startValue) * 100 : 0;

  return (
    <div style={{ padding: '16px 16px 0' }}>
      {days <= 30 && (
        <div className="alert alert-warning">
          ⚠️ Abrechnung in {days} Tagen fällig ({formatBillingDate(depot.billingDate)})
        </div>
      )}

      <div className="info-grid">
        <div className="info-cell">
          <div className="info-cell-label">Startwert</div>
          <div className="info-cell-value">{formatCurrency(depot.startValue, depot.currency)}</div>
        </div>
        <div className="info-cell">
          <div className="info-cell-label">Rendite ges.</div>
          <div className={`info-cell-value ${ret >= 0 ? 'positive' : 'negative'}`}>
            {ret >= 0 ? '+' : ''}{ret.toFixed(2) === '0.00' ? '—' : formatCurrency(ret, depot.currency)}
          </div>
        </div>
        <div className="info-cell">
          <div className="info-cell-label">Rendite %</div>
          <div className={`info-cell-value ${retPct >= 0 ? 'positive' : 'negative'}`}>
            {retPct >= 0 ? '+' : ''}{retPct.toFixed(2)}%
          </div>
        </div>
        <div className="info-cell">
          <div className="info-cell-label">Zielrendite</div>
          <div className="info-cell-value">{depot.targetReturn.toFixed(2)}%</div>
        </div>
        <div className="info-cell">
          <div className="info-cell-label">High-Water-Mark</div>
          <div className="info-cell-value">{formatCurrency(depot.highWaterMark, depot.currency)}</div>
        </div>
        <div className="info-cell">
          <div className="info-cell-label">Benchmark (ING)</div>
          <div className="info-cell-value">{depot.benchmarkRate.toFixed(2)}%</div>
        </div>
        <div className="info-cell">
          <div className="info-cell-label">Lfd. Verg. p.a.</div>
          <div className="info-cell-value">{depot.managementFeeRate.toFixed(2)}%</div>
        </div>
        <div className="info-cell">
          <div className="info-cell-label">Übergewinn-Verg.</div>
          <div className="info-cell-value">{depot.performanceFeeRate.toFixed(2)}%</div>
        </div>
        {depot.clientEmail && (
          <div className="info-cell span2">
            <div className="info-cell-label">E-Mail Kunde</div>
            <div className="info-cell-value" style={{ fontSize: '.875rem' }}>{depot.clientEmail}</div>
          </div>
        )}
        {depot.notes && (
          <div className="info-cell span2">
            <div className="info-cell-label">Notizen</div>
            <div className="info-cell-value" style={{ fontSize: '.875rem', fontWeight: 400 }}>{depot.notes}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        <button className="btn btn-secondary btn-full" onClick={onUpdateValue}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          Wert aktualisieren
        </button>
        <button className="btn btn-secondary btn-full" onClick={onWithdrawal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11 9h2V7h-2m1 13c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-18A10 10 0 002 12a10 10 0 0010 10 10 10 0 0010-10A10 10 0 0012 2m-1 15h2v-6h-2v6z"/></svg>
          Entnahme / Einzahlung
        </button>
        <button className="btn btn-secondary btn-full" onClick={onBenchmark}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
          Benchmark setzen
        </button>
        <button className="btn btn-primary btn-full" onClick={onBilling}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
          Jahresabrechnung
        </button>
      </div>

      {depot.lastBillingDate && (
        <p style={{ fontSize: '.8125rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
          Letzte Abrechnung: {formatDate(depot.lastBillingDate)}
        </p>
      )}
    </div>
  );
}

function WithdrawalsTab({ depotId, currency }: { depotId: string; currency: string }) {
  const { getWithdrawals, deleteWithdrawal } = useData();
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await getWithdrawals(depotId));
    setLoading(false);
  }, [getWithdrawals, depotId]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm('Eintrag löschen?')) return;
    await deleteWithdrawal(depotId, id);
    load();
  };

  const net = items.reduce((s, i) => s + i.amount, 0);

  if (loading) return <div className="spinner" />;

  return (
    <div style={{ padding: '12px 0' }}>
      {items.length > 0 && (
        <div style={{ padding: '8px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Nettobewegung</span>
          <strong className={net >= 0 ? 'positive' : 'negative'}>
            {net >= 0 ? '+' : ''}{formatCurrency(net, currency)}
          </strong>
        </div>
      )}
      {items.length === 0 ? (
        <div className="empty"><div className="empty-icon">💸</div><h3>Keine Einträge</h3><p>Entnahmen und Einzahlungen erscheinen hier.</p></div>
      ) : (
        <div className="card" style={{ margin: '12px 16px', borderRadius: 'var(--radius)' }}>
          {items.map(w => (
            <div key={w.id} className="list-item">
              <div className="li-left">
                <div className="li-title">{w.note || (w.amount < 0 ? 'Entnahme' : 'Einzahlung')}</div>
                <div className="li-sub">{formatDate(w.date)}</div>
              </div>
              <div className="li-right">
                <div className={`li-value ${w.amount < 0 ? 'negative' : 'positive'}`}>
                  {w.amount >= 0 ? '+' : ''}{formatCurrency(w.amount, currency)}
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '.75rem', marginTop: 2 }} onClick={() => remove(w.id)}>
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryTab({ depotId, currency, depot }: { depotId: string; currency: string; depot: Depot }) {
  const { getValueHistory, getFeePayments, deleteValueEntry } = useData();
  const [values, setValues] = useState<ValueEntry[]>([]);
  const [fees, setFees] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'values' | 'fees'>('values');

  const load = useCallback(async () => {
    setLoading(true);
    const [v, f] = await Promise.all([getValueHistory(depotId), getFeePayments(depotId)]);
    setValues(v); setFees(f);
    setLoading(false);
  }, [getValueHistory, getFeePayments, depotId]);

  useEffect(() => { load(); }, [load]);

  const removeValue = async (id: string) => {
    if (!confirm('Eintrag löschen?')) return;
    await deleteValueEntry(depotId, id);
    load();
  };

  const exportExcel = () => generateExcel(depot, values, fees, []);

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div style={{ padding: '8px 16px', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <button className={`tab ${tab === 'values' ? 'active' : ''}`} style={{ padding: '8px 12px' }} onClick={() => setTab('values')}>Wertverläufe</button>
        <button className={`tab ${tab === 'fees' ? 'active' : ''}`} style={{ padding: '8px 12px' }} onClick={() => setTab('fees')}>Abrechnungen</button>
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={exportExcel}>
          📊 Excel
        </button>
      </div>

      {tab === 'values' && (
        values.length === 0 ? (
          <div className="empty"><div className="empty-icon">📈</div><h3>Kein Verlauf</h3><p>Wertaktualisierungen erscheinen hier.</p></div>
        ) : (
          <div className="card" style={{ margin: '12px 16px' }}>
            {values.map(v => (
              <div key={v.id} className="list-item">
                <div className="li-left">
                  <div className="li-title">{formatCurrency(v.value, currency)}</div>
                  <div className="li-sub">{formatDate(v.date)}{v.note ? ` • ${v.note}` : ''}</div>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '.75rem' }} onClick={() => removeValue(v.id)}>Löschen</button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'fees' && (
        fees.length === 0 ? (
          <div className="empty"><div className="empty-icon">💰</div><h3>Keine Abrechnungen</h3><p>Jahresabrechnungen erscheinen hier.</p></div>
        ) : (
          <div className="card" style={{ margin: '12px 16px' }}>
            {fees.map(f => (
              <div key={f.id} className="list-item">
                <div className="li-left">
                  <div className="li-title">Abrechnung {f.period}</div>
                  <div className="li-sub">{formatDate(f.date)} • Depotwert: {formatCurrency(f.depotValueAtBilling, currency)}</div>
                </div>
                <div className="li-right">
                  <div className="li-value negative">−{formatCurrency(f.totalFee, currency)}</div>
                  <div className="li-meta">Lfd: {formatCurrency(f.managementFee, currency)} | Übg: {formatCurrency(f.performanceFee, currency)}</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ---- Main Page ----

export default function DepotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { db, user } = useAuth();
  const { updateDepot, addWithdrawal, addFeePayment, addValueEntry, getWithdrawals } = useData();

  const [depot, setDepot] = useState<Depot | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'withdrawals' | 'history'>('overview');
  const [modal, setModal] = useState<'value' | 'withdrawal' | 'benchmark' | 'billing' | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  const load = useCallback(async () => {
    if (!id || !user) return;
    const snap = await getDoc(doc(db, `users/${user.uid}/depots/${id}`));
    if (snap.exists()) {
      setDepot({ id: snap.id, ...snap.data() } as Depot);
    }
    setLoading(false);
  }, [id, db, user]);

  const loadWithdrawals = useCallback(async () => {
    if (!id) return;
    setWithdrawals(await getWithdrawals(id));
  }, [id, getWithdrawals]);

  useEffect(() => { load(); loadWithdrawals(); }, [load, loadWithdrawals]);

  const handleValueUpdate = async (value: number, date: string, note: string) => {
    if (!depot || !id) return;
    await addValueEntry({ depotId: id, value: depot.currentValue, date, note: `Vorheriger Wert (vor Update auf ${formatCurrency(value, depot.currency)})` });
    await updateDepot(id, { currentValue: value });
    load();
  };

  const handleWithdrawal = async (amount: number, date: string, note: string) => {
    if (!id) return;
    await addWithdrawal({ depotId: id, amount, date, note });
    loadWithdrawals();
  };

  const handleBenchmark = async (rate: number) => {
    if (!id) return;
    await updateDepot(id, { benchmarkRate: rate });
    load();
  };

  const handleBilling = async (result: BillingResult) => {
    if (!depot || !id) return;
    const todayStr = today();
    const year = currentYear();

    await addFeePayment({
      depotId: id,
      managementFee: result.managementFee,
      performanceFee: result.performanceFee,
      totalFee: result.totalFee,
      period: year,
      date: todayStr,
      depotValueAtBilling: result.currentValue,
      adjustedValue: result.adjustedValue,
      netWithdrawals: result.netWithdrawals,
      highWaterMarkBefore: depot.highWaterMark,
      highWaterMarkAfter: result.newHighWaterMark,
      benchmarkRate: depot.benchmarkRate,
      hurdle: result.hurdle,
    });

    await updateDepot(id, {
      currentValue: result.newCurrentValue,
      highWaterMark: result.newHighWaterMark,
      lastBillingDate: todayStr,
    });

    load();
    loadWithdrawals();
  };

  if (loading) return <div className="spinner" />;
  if (!depot) return <div className="page"><p>Depot nicht gefunden.</p></div>;

  const ret = depot.currentValue - depot.startValue;
  const retPct = depot.startValue > 0 ? (ret / depot.startValue) * 100 : 0;

  return (
    <>
      {/* Back bar */}
      <div className="topbar-global" style={{ maxWidth: '100%' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ padding: '6px 8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <span className="topbar-title">{depot.clientName}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/depot/${id}/edit`)} style={{ padding: '6px 8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        </button>
      </div>

      {/* Hero */}
      <div className="detail-hero">
        <h2>{depot.clientName}</h2>
        <div className="detail-hero-sub">{depot.clientEmail}</div>
        <div className="detail-hero-value">{formatCurrency(depot.currentValue, depot.currency)}</div>
        <div className="detail-hero-meta">
          <span className={ret >= 0 ? '' : ''} style={{ color: ret >= 0 ? '#86efac' : '#fca5a5' }}>
            {ret >= 0 ? '+' : ''}{formatCurrency(ret, depot.currency)} ({ret >= 0 ? '+' : ''}{retPct.toFixed(2)}%)
          </span>
          <span>Abr.: {formatBillingDate(depot.billingDate)} ({daysUntilBilling(depot.billingDate)}d)</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Übersicht</button>
        <button className={`tab ${tab === 'withdrawals' ? 'active' : ''}`} onClick={() => setTab('withdrawals')}>Entnahmen</button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Verlauf & Abr.</button>
      </div>

      <div style={{ paddingBottom: 80 }}>
        {tab === 'overview' && (
          <OverviewTab
            depot={depot}
            onUpdateValue={() => setModal('value')}
            onWithdrawal={() => setModal('withdrawal')}
            onBenchmark={() => setModal('benchmark')}
            onBilling={() => setModal('billing')}
          />
        )}
        {tab === 'withdrawals' && <WithdrawalsTab depotId={depot.id} currency={depot.currency} />}
        {tab === 'history' && <HistoryTab depotId={depot.id} currency={depot.currency} depot={depot} />}
      </div>

      {/* Modals */}
      {modal === 'value' && <ValueUpdateModal depot={depot} onClose={() => setModal(null)} onSave={handleValueUpdate} />}
      {modal === 'withdrawal' && <WithdrawalModal depot={depot} onClose={() => setModal(null)} onSave={handleWithdrawal} />}
      {modal === 'benchmark' && <BenchmarkModal depot={depot} onClose={() => setModal(null)} onSave={handleBenchmark} />}
      {modal === 'billing' && (
        <BillingModal depot={depot} withdrawals={withdrawals} onClose={() => setModal(null)} onConfirm={handleBilling} />
      )}
    </>
  );
}
