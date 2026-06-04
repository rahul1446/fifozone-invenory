import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input, Button } from 'antd';
import { Mail, Lock } from 'lucide-react';

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect immediately
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', position: 'relative', overflow: 'hidden' }}>
      {/* Subtle radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(22, 101, 52, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(30, 41, 59, 0.5) 0%, transparent 50%)',
        }}
      />

      {/* Floating ambient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-700/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-700/20 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Glassmorphic card */}
        <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl shadow-black/20">
          {/* Logo + Branding */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-14 h-14 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-emerald-900/40 mb-4"
              style={{
                animation: 'floatLogo 3s ease-in-out infinite',
              }}
            >
              F
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">
              Fifozone
            </h1>
            <p className="text-slate-400 text-sm mt-1.5 text-center">
              Internal Dashboard — Authorized Access Only
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email Address
              </label>
              <Input
                size="large"
                placeholder="admin@fifozone.com"
                prefix={<Mail size={16} className="text-slate-500 mr-1" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                className="!bg-slate-900/60 !border-slate-600/50 !text-white placeholder:!text-slate-500 hover:!border-emerald-600 focus:!border-emerald-500"
                styles={{
                  input: {
                    backgroundColor: 'transparent',
                    color: '#f8fafc',
                  },
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <Input.Password
                size="large"
                placeholder="Enter your password"
                prefix={<Lock size={16} className="text-slate-500 mr-1" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="!bg-slate-900/60 !border-slate-600/50 !text-white placeholder:!text-slate-500 hover:!border-emerald-600 focus:!border-emerald-500"
                styles={{
                  input: {
                    backgroundColor: 'transparent',
                    color: '#f8fafc',
                  },
                }}
              />
            </div>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
              className="!h-12 !rounded-xl !font-semibold !text-base !shadow-lg !shadow-emerald-900/30 !mt-2"
            >
              {loading ? 'Signing In...' : 'Sign In to Dashboard'}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-8">
          © 2024 Fifozone — All Rights Reserved
        </p>
      </div>

      {/* Floating logo animation keyframes */}
      <style>{`
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
