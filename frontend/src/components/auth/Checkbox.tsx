import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={['flex cursor-pointer items-start gap-2.5', className ?? ''].join(' ')}
      >
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border-strong text-primary focus:ring-2 focus:ring-primary/20"
          {...props}
        />
        <span className="text-sm leading-snug text-text-secondary">{label}</span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
