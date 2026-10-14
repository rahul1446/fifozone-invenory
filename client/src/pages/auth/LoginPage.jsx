import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Mail, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { Input, Button, Form } from 'antd';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    const result = await login(values.email, values.password);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30rem] h-[30rem] bg-emerald-50 rounded-full blur-3xl opacity-80"></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 relative z-10 border border-slate-100">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/20">
            <ShieldCheck size={32} strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-800 font-sans tracking-tight">Fifozone Portal</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to manage inventory & orders</p>
          </div>
        </div>

        {/* Login Form */}
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email address' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input
              size="large"
              placeholder="Email address"
              prefix={<Mail size={18} className="text-slate-400 mr-2" />}
              className="rounded-lg hover:border-emerald-500 focus:border-emerald-500"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please enter your password' }
            ]}
          >
            <Input.Password
              size="large"
              placeholder="Password"
              prefix={<Lock size={18} className="text-slate-400 mr-2" />}
              className="rounded-lg hover:border-emerald-500 focus:border-emerald-500"
            />
          </Form.Item>

          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 hover:text-slate-800">
              <input type="checkbox" className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" />
              <span>Remember me</span>
            </label>
            <button type="button" className="text-sm text-emerald-700 font-medium hover:text-emerald-800">
              Forgot password?
            </button>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            className="w-full bg-emerald-700 hover:bg-emerald-600 h-12 rounded-lg font-medium text-base shadow-lg shadow-emerald-900/20 border-none"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In securely'}
          </Button>
        </Form>
      </div>
    </div>
  );
};

export default LoginPage;
