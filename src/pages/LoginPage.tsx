import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await login();
    } catch (e: any) {
      setError('Anmeldung fehlgeschlagen. Bitte erneut versuchen.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div style={{ width: 80, height: 80, background: 'rgba(255,255,255,.15)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, backdropFilter: 'blur(10px)' }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="white">
          <path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm7 14l7-7-1.41-1.42L12 14.17l-3.09-3.08L7.5 12.5 12 17z"/>
        </svg>
      </div>
      <h1 className="login-title">Depotverwaltung</h1>
      <p className="login-subtitle">Professionelle Vermögensverwaltung</p>

      <div className="login-card">
        <h3>Willkommen zurück</h3>
        <p>Melde dich mit deinem Google-Konto an, um auf deine Depots zuzugreifen.</p>

        {error && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{error}</div>}

        <button className="btn-google" onClick={handleLogin} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.9 29.3 5 24 5 13 5 4 14 4 25s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.9 29.3 5 24 5 16.3 5 9.7 9.2 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.4 35.4 26.8 36 24 36c-5.2 0-9.7-3.3-11.3-8H6.3C9.7 34.8 16.3 39 24 39v5z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C37.2 39 44 34 44 25c0-1.3-.1-2.7-.4-3.9z"/>
          </svg>
          {loading ? 'Anmeldung läuft...' : 'Mit Google anmelden'}
        </button>
      </div>
    </div>
  );
}
