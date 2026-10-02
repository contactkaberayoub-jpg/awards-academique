import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'soft';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary-hover hover:shadow-md hover:-translate-y-0.5 active:bg-primary-active',
  secondary:
    'bg-surface text-text-primary border border-border shadow-sm hover:bg-surface-secondary hover:border-border-strong',
  ghost: 'bg-transparent text-text-primary hover:bg-surface-secondary',
  outline:
    'bg-transparent text-text-primary border border-border-strong hover:bg-surface-secondary hover:border-border-strong',
  danger:
    'bg-error text-error-foreground shadow-sm shadow-error/25 hover:brightness-110 active:brightness-95',
  soft: 'bg-primary-tint text-primary hover:bg-primary/15',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3.5 text-sm rounded-sm',
  md: 'h-10 gap-2 px-5 text-sm rounded-sm',
  lg: 'h-12 gap-2 px-6 text-base rounded-md',
};

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const combinedClassName = [
    'inline-flex select-none items-center justify-center font-medium whitespace-nowrap',
    'transition-all duration-fast active:scale-[0.98]',
    'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
    variantClasses[variant],
    sizeClasses[size],
    className ?? '',
  ].join(' ');

  return (
    <button
      type={type}
      className={combinedClassName}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
