import { useState } from 'react';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'admin'>('dashboard');

  return (
    <>
      {currentPage === 'dashboard' ? (
        <Dashboard onNavigateToAdmin={() => setCurrentPage('admin')} />
      ) : (
        <AdminDashboard onNavigateBack={() => setCurrentPage('dashboard')} />
      )}
    </>
  );
}