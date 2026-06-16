import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
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
  const { db, user } = useAuth();
  const { addDepot, updateDepot, deleteDepot } = useData();

  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || !id || !user) return;
    getDoc(doc(db, `users/${user.uid}/depots/${id}`)).then(snap => {
      if (snap.exists()) {
        const d = snap.data() as Depot;
        setForm({
          clientName: d.clientName,
          clientEmail: d.clientEmail || '',
          startValue: d.startValue.toString(),
          currentValue: d.currentValue.toString(),
          startDate: d.startDate,
          billingDate: d.billingDate,
          targetReturn: d.targetReturn.toString(),
          managementFeeRate: d.managementFeeRate.toString(),
          performanceFeeRate: d.performanceFeeRate.toString(),
          benchmarkRate: d.benchmarkRate.toString(),
          notes: d.notes || '',
          currency: d.currency || 'EUR',
        });
      }
      setLoading(false);
    });
  }, [isEdit, id, db, user]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const startVal = parseFloat(form.startValue);
    const currVal = parseFloat(form.currentValue);
    if (!form.clientName.trim()) { setError('Kundenname ist erforderlich.'); return; }
    if (isNaN(startVal) || startVal < 0) { setError('Ungültiger Startwert.'); return; }
    if (isNaN(currVal) || currVal < 0) { setError('Ungültiger aktueller Wert.'); return; }

    // Validate billingDate MM-DD format
    if (!/^\d{2}-\d{2}$/.test(form.billingDate)) { setError('Abrechnungsdatum im Format MM-TT (z.B. 12-31).'); return; }

    setSaving(true);
    try {
      const data: Omit<Depot, 'id' | 'createdAt' | 'updatedAt'> = {
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
        highWaterMark: isEdit ? undefined as any : startVal, // keep existing HWM on edit
        benchmarkRate: parseFloat(form.benchmarkRate) || 0,
        notes: form.notes,
        currency: form.currency,
      };

      if (isEdit && id) {
        // Don't overwrite highWaterMark and lastBillingDate on edit
        const { highWaterMark, lastBillingDate, ...editData } = data;
        await updateDepot(id, editData);
        navigate(`/depot/${id}`);
      } else {
        const newId = await addDepot(data);
        navigate(`/depot/${newId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern.');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    await deleteDepot(id);
    navigate('/');
  };

  if (loading) return <div className="spinner" />;

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
          {/* Kundendaten */}
          <div className="form-section-title">Kundendaten</div>

          <div className="form-group">
            <label className="form-label">Name des Kunden *</label>
            <input className="form-input" placeholder="Max Mustermann" value={form.clientName} onChange={set('clientName')} required />
          </div>

          <div className="form-group">
            <label className="form-label">E-Mail (für Excel-Versand)</label>
            <input className="form-input" type="email" placeholder="kunde@example.com" value={form.clientEmail} onChange={set('clientEmail')} />
          </div>

          {/* Depotwerte */}
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

          {/* Abrechnungsdaten */}
          <div className="form-section-title">Abrechnung</div>

          <div className="form-group">
            <label className="form-label">Abrechnungsdatum (MM-TT)</label>
            <input
              className="form-input"
              placeholder="12-31"
              value={form.billingDate}
              onChange={set('billingDate')}
              pattern="\d{2}-\d{2}"
              required
            />
            <div className="form-hint">Format: MM-TT — z.B. 12-31 für 31. Dezember, 06-30 für 30. Juni</div>
          </div>

          <div className="form-group">
            <label className="form-label">Zielrendite (% p.a.)</label>
            <input className="form-input" type="number" step="0.01" placeholder="6" value={form.targetReturn} onChange={set('targetReturn')} />
          </div>

          {/* Vergütung */}
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
              <div className="form-hint">% auf Outperformance (HWM)</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">ING Benchmark (% p.a.)</label>
            <input className="form-input" type="number" step="0.01" placeholder="2.5" value={form.benchmarkRate} onChange={set('benchmarkRate')} />
            <div className="form-hint">Aktueller ING-Zinssatz (Hurdle Rate für High-Water-Mark)</div>
          </div>

          {/* Notizen */}
          <div className="form-section-title">Sonstiges</div>
          <div className="form-group">
            <label className="form-label">Notizen</label>
            <textarea className="form-textarea" placeholder="Individuelle Vereinbarungen, Besonderheiten..." value={form.notes} onChange={set('notes')} />
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={saving}>
            {saving ? 'Speichern...' : isEdit ? 'Änderungen speichern' : 'Depot anlegen'}
          </button>

          {/* Delete */}
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
                    <button type="button" className="btn btn-danger btn-full" onClick={handleDelete} disabled={deleting}>
                      {deleting ? 'Lösche...' : 'Ja, löschen'}
                    </button>
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
