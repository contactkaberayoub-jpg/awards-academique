import { Check, Minus } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  indeterminate?: boolean;
}

export function Checkbox({
  id,
  label,
  checked,
  indeterminate = false,
  disabled,
  className,
  ...props
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={[
        'inline-flex cursor-pointer select-none items-center gap-2.5 text-sm text-text-primary',
        disabled ? 'cursor-not-allowed opacity-60' : '',
        className ?? '',
      ].join(' ')}
    >
      <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <span
          className={[
            'flex h-5 w-5 items-center justify-center rounded-md border transition-all duration-fast',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring',
            checked || indeterminate
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-surface hover:border-border-strong',
            disabled ? '' : 'peer-hover:border-primary/60',
          ].join(' ')}
        >
          {indeterminate ? (
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            checked && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
          )}
        </span>
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}
