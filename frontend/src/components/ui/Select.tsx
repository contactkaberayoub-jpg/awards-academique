import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean | string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { error, id, className, options, placeholder, ...props },
  ref
) {
  const errorMessage = typeof error === 'string' ? error : undefined;

  return (
    <div className="relative w-full">
      <select
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        className={[
          'h-10 w-full appearance-none rounded-sm border bg-surface pl-3.5 pr-10 text-sm text-text-primary outline-none transition-all duration-normal',
          'hover:border-border-strong disabled:cursor-not-allowed disabled:bg-surface-secondary/60 disabled:opacity-60 disabled:hover:border-border',
          'focus:ring-4 focus:ring-focus-ring-subtle',
          error
            ? 'border-error/60 focus:border-error focus:ring-error/15'
            : 'border-border focus:border-primary',
          className ?? '',
        ].join(' ')}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
      {errorMessage && (
        <p className="mt-1.5 text-xs text-error">{errorMessage}</p>
      )}
    </div>
  );
});
