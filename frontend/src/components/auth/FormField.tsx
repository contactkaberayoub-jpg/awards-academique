import { forwardRef, type InputHTMLAttributes } from 'react';
import { ValidationMessage } from './ValidationMessage';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, rightElement, className, id, ...props }, ref) => {
    const errorId = id ? `${id}-error` : undefined;

    return (
      <div className={className}>
        <label
          htmlFor={id}
          className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={[
              'w-full border-0 border-b bg-transparent pb-3 pr-9 text-[15px] text-text-primary',
              'placeholder:text-text-muted focus:outline-none focus:ring-0',
              'transition-colors duration-normal',
              error
                ? 'border-error'
                : 'border-border focus:border-text-primary',
            ].join(' ')}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-0 top-0 flex h-full items-center">
              {rightElement}
            </div>
          )}
        </div>
        <ValidationMessage id={errorId} message={error} />
      </div>
    );
  }
);

FormField.displayName = 'FormField';
