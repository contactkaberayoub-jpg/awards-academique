import { TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

type KpiTone = 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: KpiTone;
  delta?: { value: string; positive?: boolean };
  hint?: string;
  index?: number;
}

const toneClasses: Record<KpiTone, { icon: string; ring: string }> = {
  primary: { icon: 'bg-primary-tint text-primary', ring: 'ring-primary/15' },
  accent: { icon: 'bg-accent-tint text-accent', ring: 'ring-accent/15' },
  success: { icon: 'bg-success-tint text-success', ring: 'ring-success/15' },
  warning: { icon: 'bg-warning-tint text-warning', ring: 'ring-warning/20' },
  error: { icon: 'bg-error-tint text-error', ring: 'ring-error/15' },
  info: { icon: 'bg-info-tint text-info', ring: 'ring-info/15' },
  neutral: { icon: 'bg-gray-tint text-text-secondary', ring: 'ring-border' },
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  delta,
  hint,
  index = 0,
}: KpiCardProps) {
  const style = toneClasses[tone];
  const isPositive = delta?.positive !== false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm transition-all duration-normal hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-border/60" aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</p>
          <p className="mt-2 text-4xl font-bold leading-none tracking-tight tabular-nums text-text-primary">
            {value}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {delta && (
              <span
                className={[
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold',
                  isPositive ? 'bg-success-tint text-success' : 'bg-error-tint text-error',
                ].join(' ')}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-3 w-3" aria-hidden="true" />
                )}
                {delta.value}
              </span>
            )}
            {hint && <span className="text-xs text-text-muted">{hint}</span>}
          </div>
        </div>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${style.icon} ${style.ring}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </motion.div>
  );
}