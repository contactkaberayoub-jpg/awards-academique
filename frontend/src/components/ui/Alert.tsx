import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
  onClose?: () => void;
  className?: string;
}

const styles: Record<AlertVariant, { container: string; icon: string; iconColor: string }> = {
  info: {
    container: 'border-info/25 bg-info-tint text-text-primary',
    icon: 'text-info',
    iconColor: 'text-info',
  },
  success: {
    container: 'border-success/25 bg-success-tint text-text-primary',
    icon: 'text-success',
    iconColor: 'text-success',
  },
  warning: {
    container: 'border-warning/30 bg-warning-tint text-text-primary',
    icon: 'text-warning',
    iconColor: 'text-warning',
  },
  error: {
    container: 'border-error/25 bg-error-tint text-text-primary',
    icon: 'text-error',
    iconColor: 'text-error',
  },
};

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
};

export function Alert({ variant = 'info', title, children, onClose, className }: AlertProps) {
  const Icon = icons[variant];
  const style = styles[variant];
  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';

  return (
    <div
      role={role}
      className={[
        'flex items-start gap-3 rounded-lg border px-4 py-4',
        style.container,
        className ?? '',
      ].join(' ')}
    >
      <Icon className={`mt-1 h-5 w-5 shrink-0 ${style.iconColor}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {children && <div className="mt-1 text-sm leading-relaxed text-text-secondary">{children}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-text-muted transition-colors hover:bg-surface-overlay/5 hover:text-text-primary"
          aria-label="Fermer l'alerte"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
