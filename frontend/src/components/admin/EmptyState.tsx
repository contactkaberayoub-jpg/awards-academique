import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center',
        className ?? '',
      ].join(' ')}
    >
      {Icon && (
        <div className="relative mb-5">
          <div className="absolute -inset-4 rounded-xl bg-primary/5" aria-hidden="true" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-lg bg-surface-tertiary ring-1 ring-inset ring-border shadow-sm">
            <Icon className="h-6 w-6 text-text-secondary" aria-hidden="true" />
          </div>
        </div>
      )}
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
