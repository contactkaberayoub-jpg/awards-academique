import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { FormField } from './FormField';

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, error, id, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <FormField
        ref={ref}
        id={id}
        label={label}
        error={error}
        type={visible ? 'text' : 'password'}
        rightElement={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="pb-3 text-text-muted transition-colors hover:text-text-secondary"
            aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        }
        {...props}
      />
    );
  }
);

PasswordField.displayName = 'PasswordField';
