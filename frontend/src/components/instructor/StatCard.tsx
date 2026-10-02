import { type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

type StatColor = 'blue' | 'green' | 'violet' | 'amber' | 'red' | 'gray';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: StatColor;
  hint?: string;
  trend?: { value: string; positive?: boolean };
  index?: number;
}

const colorClasses: Record<StatColor, { icon: string; bar: string }> = {
  blue: { icon: 'bg-primary-tint text-primary', bar: 'bg-primary' },
  green: { icon: 'bg-success-tint text-success', bar: 'bg-success' },
  violet: { icon: 'bg-accent-tint text-accent', bar: 'bg-accent' },
  amber: { icon: 'bg-warning-tint text-warning', bar: 'bg-warning' },
  red: { icon: 'bg-error-tint text-error', bar: 'bg-error' },
  gray: { icon: 'bg-gray-tint text-text-secondary', bar: 'bg-text-muted' },
};

export function StatCard({ label, value, icon: Icon, color = 'blue', hint, trend, index = 0 }: StatCardProps) {
  const style = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm transition-all duration-normal hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
    >
      <span className={`absolute inset-x-0 top-0 h-0.5 opacity-60 ${style.bar}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums leading-none tracking-tight text-text-primary">{value}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {trend && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold ${trend.positive !== false ? 'bg-success-tint text-success' : 'bg-error-tint text-error'}`}>
                {trend.value}
              </span>
            )}
            {hint && <span className="text-xs text-text-muted">{hint}</span>}
          </div>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-normal group-hover:scale-110 ${style.icon}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </motion.div>
  );
}