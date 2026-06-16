import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getStoredConfig } from './firebase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { FirebaseConfig } from './types';
import SetupPage from './pages/SetupPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DepotDetailPage from './pages/DepotDetailPage';
import AddEditDepotPage from './pages/AddEditDepotPage';

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <LoginPage />;
  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/depot/:id" element={<DepotDetailPage />} />
          <Route path="/depot/new" element={<AddEditDepotPage />} />
          <Route path="/depot/:id/edit" element={<AddEditDepotPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </DataProvider>
  );
}

export default function App() {
  const [config, setConfig] = useState<FirebaseConfig | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = getStoredConfig();
    setConfig(stored);
    setChecking(false);
  }, []);

  if (checking) return <div className="spinner" />;
  if (!config) return <SetupPage onComplete={setConfig} />;

  return (
    <AuthProvider config={config}>
      <AuthGate />
    </AuthProvider>
  );
}
