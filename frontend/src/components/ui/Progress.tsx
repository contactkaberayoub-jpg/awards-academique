import type { HTMLAttributes } from 'react';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

const colorClasses: Record<string, string> = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
};

const sizeClasses: Record<string, string> = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

export function Progress({
  value,
  max = 100,
  color = 'primary',
  size = 'md',
  showValue = false,
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={['flex items-center gap-3', className ?? ''].join(' ')}
      {...props}
    >
      <div
        className={['relative w-full overflow-hidden rounded-full bg-surface-tertiary', sizeClasses[size]].join(' ')}
      >
        <div
          className={['h-full rounded-full transition-all duration-700 ease-out', colorClasses[color]].join(' ')}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <span className="shrink-0 text-xs font-semibold tabular-nums text-text-secondary">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}
