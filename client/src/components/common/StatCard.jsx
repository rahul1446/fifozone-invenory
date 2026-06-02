import { Skeleton } from 'antd';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon, trend, color = 'border-emerald-500', loading = false }) => {
  // Derive the accent color token from the border class for the icon background
  const iconBgMap = {
    'border-emerald-500': 'bg-emerald-50 text-emerald-600',
    'border-blue-500': 'bg-blue-50 text-blue-600',
    'border-violet-500': 'bg-violet-50 text-violet-600',
    'border-amber-500': 'bg-amber-50 text-amber-600',
    'border-orange-500': 'bg-orange-50 text-orange-600',
    'border-rose-500': 'bg-rose-50 text-rose-600',
    'border-purple-500': 'bg-purple-50 text-purple-600',
    'border-cyan-500': 'bg-cyan-50 text-cyan-600',
    'border-indigo-500': 'bg-indigo-50 text-indigo-600',
  };

  const iconStyle = iconBgMap[color] || 'bg-slate-50 text-slate-600';

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border-l-4 ${color} shadow-sm p-5`}>
        <Skeleton active paragraph={{ rows: 2, width: ['60%', '40%'] }} title={{ width: '45%' }} />
      </div>
    );
  }

  return (
    <div
      className={`
        group relative bg-white rounded-xl border-l-4 ${color}
        shadow-sm hover:shadow-xl hover:shadow-slate-200/60
        hover:-translate-y-1.5
        transition-all duration-300 ease-out
        p-5 cursor-default overflow-hidden
      `}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />

      <div className="relative z-10 flex items-start justify-between">
        {/* Left content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 truncate">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight mb-1">
            {value}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            {trend !== undefined && trend !== null && (
              <span
                className={`
                  inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full
                  ${trend >= 0
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-rose-700 bg-rose-50'
                  }
                `}
              >
                {trend >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(trend)}%
              </span>
            )}
            {subtitle && (
              <span className="text-[11px] text-slate-400 truncate">{subtitle}</span>
            )}
          </div>
        </div>

        {/* Icon circle */}
        <div
          className={`
            flex-shrink-0 w-11 h-11 rounded-xl ${iconStyle}
            flex items-center justify-center
            group-hover:scale-110 transition-transform duration-300
          `}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
