import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, className, ...props },
  ref
) {
  const errorMessage = typeof error === 'string' ? error : undefined;

  return (
    <div className="w-full">
      <textarea
        ref={ref}
        aria-invalid={Boolean(error)}
        className={[
          'w-full rounded-sm border bg-surface px-3.5 py-2.5 text-sm text-text-primary outline-none transition-all duration-normal',
          'placeholder:text-text-muted hover:border-border-strong disabled:cursor-not-allowed disabled:bg-surface-secondary/60 disabled:opacity-60 disabled:hover:border-border',
          'focus:ring-4 focus:ring-focus-ring-subtle',
          error
            ? 'border-error/60 focus:border-error focus:ring-error/15'
            : 'border-border focus:border-primary',
          className ?? '',
        ].join(' ')}
        {...props}
      />
      {errorMessage && (
        <p className="mt-1.5 text-xs text-error">{errorMessage}</p>
      )}
    </div>
  );
});
