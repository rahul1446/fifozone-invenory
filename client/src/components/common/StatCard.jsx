import { Skeleton } from 'antd';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const StatCard = ({ title, value, icon, color = 'emerald', loading = false }) => {
  // Map base colors to specific Tailwind classes for border, background, and text
  const colorMap = {
    emerald: { border: 'border-emerald-100', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    green: { border: 'border-green-100', bg: 'bg-green-50', text: 'text-green-600' },
    purple: { border: 'border-indigo-100', bg: 'bg-indigo-50', text: 'text-indigo-600' },
    indigo: { border: 'border-indigo-100', bg: 'bg-indigo-50', text: 'text-indigo-600' },
    amber: { border: 'border-amber-100', bg: 'bg-amber-50', text: 'text-amber-600' },
    yellow: { border: 'border-amber-100', bg: 'bg-amber-50', text: 'text-amber-600' },
    rose: { border: 'border-rose-100', bg: 'bg-rose-50', text: 'text-rose-600' },
    red: { border: 'border-rose-100', bg: 'bg-rose-50', text: 'text-rose-600' },
    blue: { border: 'border-blue-100', bg: 'bg-blue-50', text: 'text-blue-600' },
  };

  const style = colorMap[color] || colorMap.emerald;

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border ${style.border} p-5`}>
        <Skeleton active paragraph={{ rows: 1, width: ['40%'] }} title={{ width: '60%' }} />
      </div>
    );
  }

  return (
    <div
      className={`
        bg-white rounded-2xl border ${style.border}
        p-4 flex items-center justify-between
      `}
    >
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {title}
        </p>
        <h3 className="text-2xl font-bold text-slate-900 leading-none">
          {value}
        </h3>
      </div>

      <div
        className={`
          flex-shrink-0 w-12 h-12 rounded-2xl ${style.bg} ${style.text}
          flex items-center justify-center
        `}
      >
        {icon}
      </div>
    </div>
  );
};

export default StatCard;
