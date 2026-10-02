import { forwardRef, type InputHTMLAttributes } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(function FormInput(
  { label, error, hint, id, className, ...props },
  ref
) {
  const errorId = error && id ? `${id}-error` : undefined;
  const hintId = hint && id ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text-primary">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        className={[
          'h-10 w-full rounded-sm border bg-surface px-3.5 text-sm text-text-primary outline-none transition-all duration-normal',
          'placeholder:text-text-muted hover:border-border-strong',
          'focus:ring-4',
          error
            ? 'border-error focus:border-error focus:ring-error/15'
            : 'border-border focus:border-primary focus:ring-focus-ring-subtle',
          className ?? '',
        ].join(' ')}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-text-muted">{hint}</p>
      )}
      {error && <p id={errorId} className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  );
});
