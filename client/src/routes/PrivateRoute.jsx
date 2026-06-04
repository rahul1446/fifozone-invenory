import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', width: '100vw',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        fontFamily: "'Inter', sans-serif"
      }}>
        {/* Spinner */}
        <div style={{
          width: '48px', height: '48px',
          border: '4px solid rgba(22,101,52,0.2)',
          borderTopColor: '#16a34a',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500, margin: '0 0 4px' }}>
            Authenticating Session...
          </p>
          <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>
            Connecting to Fifozone servers
          </p>
        </div>
        {/* Fifozone branding */}
        <div style={{ position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: '#166534', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '16px' }}>F</div>
          <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '16px' }}>Fifozone</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
