import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      fontFamily: "'Inter', 'Outfit', sans-serif",
      padding: '24px'
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '20%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(22,101,52,0.12) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'fixed', bottom: '20%', right: '20%',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(30,41,59,0.4) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />

      {/* Card */}
      <div style={{
        background: 'rgba(30,41,59,0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(100,116,139,0.2)',
        borderRadius: '20px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, #166534, #15803d)',
            borderRadius: '16px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '28px',
            boxShadow: '0 8px 24px rgba(22,101,52,0.4)',
            marginBottom: '16px',
            animation: 'floatUp 3s ease-in-out infinite'
          }}>F</div>
          <h1 style={{ color: '#f8fafc', fontSize: '26px', fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            Fifozone
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            Internal Dashboard — Authorized Access Only
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
            color: '#fca5a5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px' }}>✉</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@fifozone.com"
                autoComplete="email"
                required
                style={{
                  width: '100%', padding: '12px 14px 12px 40px',
                  background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(100,116,139,0.3)',
                  borderRadius: '10px', color: '#f8fafc', fontSize: '14px',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = 'rgba(100,116,139,0.3)'}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px' }}>🔒</span>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                style={{
                  width: '100%', padding: '12px 44px 12px 40px',
                  background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(100,116,139,0.3)',
                  borderRadius: '10px', color: '#f8fafc', fontSize: '14px',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#16a34a'}
                onBlur={e => e.target.style.borderColor = 'rgba(100,116,139,0.3)'}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '14px', padding: '4px'
                }}
              >{showPass ? '🙈' : '👁'}</button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#166534aa' : 'linear-gradient(135deg, #166534, #15803d)',
              color: '#fff', border: 'none', borderRadius: '12px',
              fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(22,101,52,0.4)',
              transition: 'all 0.2s', marginTop: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Signing In...
              </>
            ) : (
              '🔐  Sign In to Dashboard'
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: '#475569', fontSize: '12px', marginTop: '32px', marginBottom: 0 }}>
          © 2024 Fifozone — All Rights Reserved
        </p>
      </div>

      <style>{`
        @keyframes floatUp {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: #475569; }
      `}</style>
    </div>
  );
};

export default LoginPage;
