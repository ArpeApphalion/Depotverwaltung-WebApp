import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import DashboardPage from './pages/DashboardPage';
import DepotDetailPage from './pages/DepotDetailPage';
import AddEditDepotPage from './pages/AddEditDepotPage';

export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/depot/new" element={<AddEditDepotPage />} />
          <Route path="/depot/:id" element={<DepotDetailPage />} />
          <Route path="/depot/:id/edit" element={<AddEditDepotPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </DataProvider>
  );
}
