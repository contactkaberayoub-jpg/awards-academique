import type { HTMLAttributes, PropsWithChildren } from 'react';

type CardVariant = 'default' | 'bordered' | 'elevated' | 'ghost' | 'interactive';

interface CardProps extends PropsWithChildren<HTMLAttributes<HTMLDivElement>> {
  variant?: CardVariant;
  padded?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-surface border border-border shadow-sm',
  bordered: 'bg-surface border border-border',
  elevated: 'bg-surface border border-border shadow-lg',
  ghost: 'bg-transparent',
  interactive:
    'bg-surface border border-border shadow-sm transition-all duration-normal hover:-translate-y-0.5 hover:shadow-md hover:border-border-strong cursor-pointer',
};

export function Card({
  children,
  className,
  variant = 'default',
  padded = true,
  ...props
}: CardProps) {
  const combinedClassName = [
    'rounded-lg',
    variantClasses[variant],
    padded ? 'p-6' : '',
    className ?? '',
  ].join(' ');

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
}
