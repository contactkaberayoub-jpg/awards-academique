import type { HTMLAttributes, PropsWithChildren } from 'react';

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends PropsWithChildren<HTMLAttributes<HTMLSpanElement>> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-tint text-text-secondary ring-1 ring-inset ring-border',
  primary: 'bg-primary-tint text-primary ring-1 ring-inset ring-primary/15',
  accent: 'bg-accent-tint text-accent ring-1 ring-inset ring-accent/15',
  success: 'bg-success-tint text-success ring-1 ring-inset ring-success/15',
  warning: 'bg-warning-tint text-warning ring-1 ring-inset ring-warning/20',
  error: 'bg-error-tint text-error ring-1 ring-inset ring-error/15',
  info: 'bg-info-tint text-info ring-1 ring-inset ring-info/15',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-2xs font-semibold rounded-full gap-1',
  md: 'px-2.5 py-1 text-xs font-semibold rounded-full gap-1.5',
  lg: 'px-3.5 py-1.5 text-sm font-semibold rounded-full gap-1.5',
};

const dotClasses: Record<BadgeVariant, string> = {
  default: 'bg-text-muted',
  primary: 'bg-primary',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
};

export function Badge({
  children,
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  ...props
}: BadgeProps) {
  const combinedClassName = [
    'inline-flex items-center transition-all',
    variantClasses[variant],
    sizeClasses[size],
    className ?? '',
  ].join(' ');

  return (
    <span className={combinedClassName} {...props}>
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dotClasses[variant]}`} />
          )}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotClasses[variant]}`} />
        </span>
      )}
      {children}
    </span>
  );
}
