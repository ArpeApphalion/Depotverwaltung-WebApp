import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Depot } from '../types';
import { formatCurrency, formatBillingDate, daysUntilBilling } from '../utils/format';
import { calculateSimpleReturn } from '../utils/calculations';

function BillingBadge({ billingDate }: { billingDate: string }) {
  const days = daysUntilBilling(billingDate);
  if (days <= 7) return <span className="badge badge-danger">{days}d</span>;
  if (days <= 30) return <span className="badge badge-warning">{days}d</span>;
  return <span className="badge badge-neutral">{days}d</span>;
}

function DepotCard({ depot, onClick }: { depot: Depot; onClick: () => void }) {
  const ret = calculateSimpleReturn(depot);
  const days = daysUntilBilling(depot.billingDate);

  return (
    <div className="depot-card" onClick={onClick}>
      <div className="dc-header">
        <div>
          <div className="dc-name">{depot.clientName}</div>
          <div className="dc-billing">Abrechnung: {formatBillingDate(depot.billingDate)}</div>
        </div>
        <BillingBadge billingDate={depot.billingDate} />
      </div>
      <div className="dc-value">{formatCurrency(depot.currentValue, depot.currency)}</div>
      <div className="dc-grid">
        <div>
          <div className="dc-metric-label">Gesamtrendite</div>
          <div className={`dc-metric-value ${ret.absolute >= 0 ? 'positive' : 'negative'}`}>
            {ret.absolute >= 0 ? '+' : ''}{formatCurrency(ret.absolute, depot.currency)}
          </div>
        </div>
        <div>
          <div className="dc-metric-label">Rendite %</div>
          <div className={`dc-metric-value ${ret.percent >= 0 ? 'positive' : 'negative'}`}>
            {ret.percent >= 0 ? '+' : ''}{ret.percent.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="dc-metric-label">Tage bis Abr.</div>
          <div className={`dc-metric-value ${days <= 30 ? 'negative' : 'neutral'}`}>{days}</div>
        </div>
        <div>
          <div className="dc-metric-label">Lfd. Verg. p.a.</div>
          <div className="dc-metric-value neutral">{depot.managementFeeRate.toFixed(2)}%</div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { getDepots, exportBackup, importBackup, version } = useData();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [tab, setTab] = useState<'all' | 'urgent'>('all');

  const depots = getDepots();
  const totalAUM = depots.reduce((s, d) => s + d.currentValue, 0);
  const totalReturn = depots.reduce((s, d) => s + calculateSimpleReturn(d).absolute, 0);
  const urgentDepots = depots.filter(d => daysUntilBilling(d.billingDate) <= 30);
  const displayed = tab === 'urgent' ? urgentDepots : depots;

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError('');
    try {
      await importBackup(file);
    } catch {
      setImportError('Ungültige Datei. Bitte ein gültiges Backup auswählen.');
    }
    setImporting(false);
    e.target.value = '';
  };

  return (
    <>
      {/* Top Bar */}
      <div className="topbar-global" style={{ justifyContent: 'space-between', maxWidth: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm3 3h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: '.9375rem' }}>Depotverwaltung</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-sm" onClick={exportBackup} title="Backup exportieren">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5z"/></svg>
            Backup
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} title="Backup importieren" disabled={importing}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5z"/></svg>
            {importing ? '...' : 'Wiederherstellen'}
          </button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </div>

      <div className="page">
        {importError && (
          <div className="alert alert-danger" style={{ marginTop: 12 }}>{importError}</div>
        )}

        {/* Summary */}
        <div style={{ marginTop: 16 }}>
          <div className="summary">
            <h3>Gesamt AUM</h3>
            <div className="summary-total">{formatCurrency(totalAUM)}</div>
            <div className="summary-row">
              <div className="summary-item">
                <strong>{depots.length}</strong>
                Depots
              </div>
              <div className="summary-item">
                <strong style={{ color: totalReturn >= 0 ? '#86efac' : '#fca5a5' }}>
                  {totalReturn >= 0 ? '+' : ''}{formatCurrency(totalReturn)}
                </strong>
                Gesamtrendite
              </div>
              <div className="summary-item">
                <strong style={{ color: urgentDepots.length > 0 ? '#fde047' : 'white' }}>
                  {urgentDepots.length}
                </strong>
                Fällig (≤30d)
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        {urgentDepots.length > 0 && (
          <div className="tabs" style={{ marginBottom: 12, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>Alle ({depots.length})</button>
            <button className={`tab ${tab === 'urgent' ? 'active' : ''}`} onClick={() => setTab('urgent')}>
              ⚠️ Fällig ({urgentDepots.length})
            </button>
          </div>
        )}

        {/* Depot list */}
        {displayed.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📊</div>
            <h3>Keine Depots</h3>
            <p>Füge dein erstes Depot hinzu, um loszulegen.</p>
            <button className="btn btn-primary" onClick={() => navigate('/depot/new')}>
              Depot hinzufügen
            </button>
          </div>
        ) : (
          displayed.map(d => (
            <DepotCard key={d.id} depot={d} onClick={() => navigate(`/depot/${d.id}`)} />
          ))
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => navigate('/depot/new')} title="Depot hinzufügen">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      </button>

      {/* Bottom Nav */}
      <nav className="nav">
        <button className="nav-item active">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
          Übersicht
        </button>
        <button className="nav-item" onClick={() => navigate('/depot/new')}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          Neu
        </button>
      </nav>
    </>
  );
}
