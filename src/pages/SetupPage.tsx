import React, { useState } from 'react';
import { FirebaseConfig } from '../types';
import { saveConfig } from '../firebase';

const empty: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

export default function SetupPage({ onComplete }: { onComplete: (c: FirebaseConfig) => void }) {
  const [cfg, setCfg] = useState<FirebaseConfig>(empty);
  const [error, setError] = useState('');

  const update = (k: keyof FirebaseConfig) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCfg(prev => ({ ...prev, [k]: e.target.value.trim() }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(cfg).some(v => !v)) {
      setError('Bitte alle Felder ausfüllen.');
      return;
    }
    saveConfig(cfg);
    onComplete(cfg);
  };

  return (
    <div className="setup-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, background: 'var(--primary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: '1.25rem' }}>Depotverwaltung</h1>
          <p style={{ fontSize: '.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>Einmalige Einrichtung</p>
        </div>
      </div>

      <div className="setup-step">
        <div className="setup-num">1</div>
        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)' }}>
          Gehe zu <strong>console.firebase.google.com</strong>, erstelle ein Projekt und füge
          eine Web-App hinzu. Aktiviere <strong>Authentication</strong> (Google-Anmeldung) und
          <strong> Firestore Database</strong>.
        </p>
      </div>

      <div className="setup-step">
        <div className="setup-num">2</div>
        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)' }}>
          Kopiere die <strong>Firebase-Konfiguration</strong> aus Projekteinstellungen &rarr; Deine Apps
          und füge sie unten ein.
        </p>
      </div>

      <div className="setup-step" style={{ background: 'var(--primary-bg)', marginBottom: 20 }}>
        <div className="setup-num">3</div>
        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
          Lege in Firestore unter <strong>Rules</strong> folgende Sicherheitsregel fest:
        </p>
        <pre style={{ fontSize: '.75rem', background: 'white', padding: 10, borderRadius: 6, overflowX: 'auto', border: '1px solid var(--border)' }}>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}`}</pre>
      </div>

      <form onSubmit={submit}>
        <h3 style={{ marginBottom: 14 }}>Firebase Konfiguration</h3>

        {([
          ['apiKey', 'API Key'],
          ['authDomain', 'Auth Domain'],
          ['projectId', 'Project ID'],
          ['storageBucket', 'Storage Bucket'],
          ['messagingSenderId', 'Messaging Sender ID'],
          ['appId', 'App ID'],
        ] as [keyof FirebaseConfig, string][]).map(([key, label]) => (
          <div className="form-group" key={key}>
            <label className="form-label">{label}</label>
            <input
              className="form-input"
              placeholder={`${label} eingeben...`}
              value={cfg[key]}
              onChange={update(key)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        ))}

        {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>}

        <button type="submit" className="btn btn-primary btn-full btn-lg">
          App starten
        </button>
      </form>
    </div>
  );
}
