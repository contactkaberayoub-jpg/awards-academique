import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(function FormSelect({
  label,
  error,
  id,
  className,
  options,
  placeholder,
  ...props
}, ref) {
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text-primary">
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={[
            'h-10 w-full appearance-none rounded-sm border bg-surface pl-3.5 pr-10 text-sm text-text-primary outline-none transition-all duration-normal',
            'hover:border-border-strong focus:ring-4',
            error
              ? 'border-error focus:border-error focus:ring-error/15'
              : 'border-border focus:border-primary focus:ring-focus-ring-subtle',
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
      </div>
      {error && <p id={errorId} className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  );
});
