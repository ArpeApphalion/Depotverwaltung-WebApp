import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Depot } from '../types';
import { today } from '../utils/format';

const defaultForm = {
  clientName: '',
  clientEmail: '',
  startValue: '',
  currentValue: '',
  startDate: today(),
  billingDate: '12-31',
  targetReturn: '6',
  managementFeeRate: '1',
  performanceFeeRate: '20',
  benchmarkRate: '2',
  notes: '',
  currency: 'EUR',
};

type FormState = typeof defaultForm;

export default function AddEditDepotPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id && id !== 'new');
  const navigate = useNavigate();
  const { getDepots, addDepot, updateDepot, deleteDepot } = useData();

  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;
    const depot = getDepots().find(d => d.id === id);
    if (depot) {
      setForm({
        clientName: depot.clientName,
        clientEmail: depot.clientEmail || '',
        startValue: depot.startValue.toString(),
        currentValue: depot.currentValue.toString(),
        startDate: depot.startDate,
        billingDate: depot.billingDate,
        targetReturn: depot.targetReturn.toString(),
        managementFeeRate: depot.managementFeeRate.toString(),
        performanceFeeRate: depot.performanceFeeRate.toString(),
        benchmarkRate: depot.benchmarkRate.toString(),
        notes: depot.notes || '',
        currency: depot.currency || 'EUR',
      });
    }
  }, [isEdit, id]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const startVal = parseFloat(form.startValue);
    const currVal = parseFloat(form.currentValue);
    if (!form.clientName.trim()) { setError('Kundenname ist erforderlich.'); return; }
    if (isNaN(startVal) || startVal < 0) { setError('Ungültiger Startwert.'); return; }
    if (isNaN(currVal) || currVal < 0) { setError('Ungültiger aktueller Wert.'); return; }
    if (!/^\d{2}-\d{2}$/.test(form.billingDate)) { setError('Abrechnungsdatum im Format MM-TT (z.B. 12-31).'); return; }

    setSaving(true);
    try {
      if (isEdit && id) {
        updateDepot(id, {
          clientName: form.clientName.trim(),
          clientEmail: form.clientEmail.trim(),
          startValue: startVal,
          currentValue: currVal,
          startDate: form.startDate,
          billingDate: form.billingDate,
          targetReturn: parseFloat(form.targetReturn) || 0,
          managementFeeRate: parseFloat(form.managementFeeRate) || 0,
          performanceFeeRate: parseFloat(form.performanceFeeRate) || 0,
          benchmarkRate: parseFloat(form.benchmarkRate) || 0,
          notes: form.notes,
          currency: form.currency,
        });
        navigate(`/depot/${id}`);
      } else {
        const newId = addDepot({
          clientName: form.clientName.trim(),
          clientEmail: form.clientEmail.trim(),
          startValue: startVal,
          currentValue: currVal,
          startDate: form.startDate,
          billingDate: form.billingDate,
          lastBillingDate: null,
          targetReturn: parseFloat(form.targetReturn) || 0,
          managementFeeRate: parseFloat(form.managementFeeRate) || 0,
          performanceFeeRate: parseFloat(form.performanceFeeRate) || 0,
          highWaterMark: startVal,
          benchmarkRate: parseFloat(form.benchmarkRate) || 0,
          notes: form.notes,
          currency: form.currency,
        });
        navigate(`/depot/${newId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern.');
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    deleteDepot(id);
    navigate('/');
  };

  return (
    <>
      <div className="topbar-global" style={{ maxWidth: '100%' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(isEdit && id ? `/depot/${id}` : '/')} style={{ padding: '6px 8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <span className="topbar-title">{isEdit ? 'Depot bearbeiten' : 'Neues Depot'}</span>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        <form onSubmit={submit}>
          <div className="form-section-title">Kundendaten</div>

          <div className="form-group">
            <label className="form-label">Name des Kunden *</label>
            <input className="form-input" placeholder="Max Mustermann" value={form.clientName} onChange={set('clientName')} required />
          </div>
          <div className="form-group">
            <label className="form-label">E-Mail (für Excel-Versand)</label>
            <input className="form-input" type="email" placeholder="kunde@example.com" value={form.clientEmail} onChange={set('clientEmail')} />
          </div>

          <div className="form-section-title">Depotwerte</div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Startwert *</label>
              <input className="form-input" type="number" min="0" step="0.01" placeholder="100000" value={form.startValue} onChange={set('startValue')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Aktueller Wert *</label>
              <input className="form-input" type="number" min="0" step="0.01" placeholder="100000" value={form.currentValue} onChange={set('currentValue')} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Währung</label>
              <select className="form-select" value={form.currency} onChange={set('currency')}>
                <option value="EUR">EUR €</option>
                <option value="USD">USD $</option>
                <option value="CHF">CHF</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Startdatum</label>
              <input className="form-input" type="date" value={form.startDate} onChange={set('startDate')} required />
            </div>
          </div>

          <div className="form-section-title">Abrechnung</div>

          <div className="form-group">
            <label className="form-label">Abrechnungsdatum (MM-TT)</label>
            <input className="form-input" placeholder="12-31" value={form.billingDate} onChange={set('billingDate')} pattern="\d{2}-\d{2}" required />
            <div className="form-hint">Format: MM-TT — z.B. 12-31 für 31. Dezember, 06-30 für 30. Juni</div>
          </div>

          <div className="form-group">
            <label className="form-label">Zielrendite (% p.a.)</label>
            <input className="form-input" type="number" step="0.01" placeholder="6" value={form.targetReturn} onChange={set('targetReturn')} />
          </div>

          <div className="form-section-title">Vergütung</div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Lfd. Vergütung (% p.a.)</label>
              <input className="form-input" type="number" step="0.01" min="0" placeholder="1" value={form.managementFeeRate} onChange={set('managementFeeRate')} />
              <div className="form-hint">Jährl. auf Depotwert</div>
            </div>
            <div className="form-group">
              <label className="form-label">Übergewinn-Verg. (%)</label>
              <input className="form-input" type="number" step="0.01" min="0" placeholder="20" value={form.performanceFeeRate} onChange={set('performanceFeeRate')} />
              <div className="form-hint">% auf Outperformance</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">ING Benchmark (% p.a.)</label>
            <input className="form-input" type="number" step="0.01" placeholder="2.5" value={form.benchmarkRate} onChange={set('benchmarkRate')} />
            <div className="form-hint">Aktueller ING-Zinssatz (Hurdle Rate für High-Water-Mark)</div>
          </div>

          <div className="form-section-title">Sonstiges</div>
          <div className="form-group">
            <label className="form-label">Notizen</label>
            <textarea className="form-textarea" placeholder="Individuelle Vereinbarungen, Besonderheiten..." value={form.notes} onChange={set('notes')} />
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={saving}>
            {saving ? 'Speichern...' : isEdit ? 'Änderungen speichern' : 'Depot anlegen'}
          </button>

          {isEdit && (
            <div className="delete-zone" style={{ marginTop: 24 }}>
              <h4 style={{ color: 'var(--danger)', marginBottom: 8 }}>Depot löschen</h4>
              <p style={{ fontSize: '.875rem', marginBottom: 12 }}>Alle Daten dieses Depots werden unwiderruflich gelöscht.</p>
              {!confirmDelete ? (
                <button type="button" className="btn btn-danger btn-full" onClick={() => setConfirmDelete(true)}>
                  Depot löschen
                </button>
              ) : (
                <>
                  <p style={{ fontSize: '.875rem', fontWeight: 600, marginBottom: 8, color: 'var(--danger)' }}>Bist du sicher?</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-ghost btn-full" onClick={() => setConfirmDelete(false)}>Abbrechen</button>
                    <button type="button" className="btn btn-danger btn-full" onClick={handleDelete}>Ja, löschen</button>
                  </div>
                </>
              )}
            </div>
          )}
        </form>
      </div>
    </>
  );
}
