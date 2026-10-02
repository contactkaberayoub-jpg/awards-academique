import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface SubmitButtonProps
  extends PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> {
  isLoading?: boolean;
  loadingLabel?: string;
}

export function SubmitButton({
  children,
  isLoading,
  loadingLabel,
  disabled,
  className,
  ...props
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || isLoading}
      className={[
        'flex w-full items-center justify-center gap-2 rounded-sm bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground',
        'transition-all duration-normal hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-md active:translate-y-0 active:shadow-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className ?? '',
      ].join(' ')}
      {...props}
    >
      {isLoading && <LoadingSpinner />}
      {isLoading ? loadingLabel ?? children : children}
    </button>
  );
}
