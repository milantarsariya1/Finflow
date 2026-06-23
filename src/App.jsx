import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Advisor from './pages/Advisor';
import Settings from './pages/Settings';
import { Loader2 } from 'lucide-react';

/**
 * Route protection wrapper. Ensures users are logged in.
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center text-dark-muted">
        <Loader2 className="animate-spin text-brand-primary mb-3" size={32} />
        <span className="text-sm font-semibold tracking-wide">Securing connection...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function AppContent() {
  const { user } = useAuth();

  return (

    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-dark-bg dark:text-dark-text flex flex-col transition-colors duration-200">
      {user && <Navigation />}
      <main className="flex-1 w-full max-w-7xl mx-auto">
        <Routes>
          {/* Public authentication route */}
          <Route path="/auth" element={
            user ? <Navigate to="/" replace /> : <Auth />
          } />

          {/* Onboarding route (protected) */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />

          {/* Core Dashboard route (protected) */}
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Advisory Panel route (protected) */}
          <Route path="/advisor" element={
            <ProtectedRoute>
              <Advisor />
            </ProtectedRoute>
          } />

          {/* Settings Route (protected) */}
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />

          {/* Fallback routing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
