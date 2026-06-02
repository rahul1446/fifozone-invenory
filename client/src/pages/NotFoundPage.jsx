import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { Home } from 'lucide-react';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4"
      style={{
        animation: 'fadeInUp 0.5s ease-out both',
      }}
    >
      {/* Large 404 */}
      <h1 className="text-9xl font-extrabold text-slate-200 select-none leading-none tracking-tight">
        404
      </h1>

      {/* Heading */}
      <h2 className="text-2xl font-bold text-slate-800 mt-4">
        Page Not Found
      </h2>

      {/* Description */}
      <p className="text-slate-500 mt-2 text-center max-w-md leading-relaxed">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>

      {/* Back to dashboard button */}
      <Button
        type="primary"
        size="large"
        icon={<Home size={18} />}
        onClick={() => navigate('/dashboard')}
        className="!mt-8 !h-12 !px-8 !rounded-xl !font-semibold !text-base !shadow-lg !shadow-emerald-900/20 !flex !items-center !gap-2"
      >
        Back to Dashboard
      </Button>

      {/* Fade-in animation keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default NotFoundPage;
