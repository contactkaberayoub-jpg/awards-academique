import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean | string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  className,
  error,
  leftIcon,
  rightIcon,
  ...props
}: InputProps) {
  const hasError = !!error;
  const errorMessage = typeof error === 'string' ? error : undefined;

  const containerClasses = [
    'relative w-full',
    className ?? '',
  ].join(' ');

  const inputClasses = [
    'w-full h-10 rounded-sm border bg-surface px-3.5 text-sm text-text-primary',
    'placeholder:text-text-muted transition-all duration-normal',
    'hover:border-border-strong disabled:cursor-not-allowed disabled:bg-surface-secondary/60 disabled:opacity-60 disabled:hover:border-border',
    'focus:outline-none focus:ring-4 focus:ring-focus-ring-subtle focus:border-primary',
    hasError
      ? 'border-error/60 focus:border-error focus:ring-error/15'
      : 'border-border focus:border-primary',
    leftIcon ? 'pl-10' : '',
    rightIcon ? 'pr-10' : '',
  ].join(' ');

  return (
    <div className={containerClasses}>
      {leftIcon && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
          {leftIcon}
        </div>
      )}
      <input className={inputClasses} {...props} />
      {rightIcon && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted">
          {rightIcon}
        </div>
      )}
      {errorMessage && (
        <p className="mt-1.5 text-xs text-error">{errorMessage}</p>
      )}
    </div>
  );
}
