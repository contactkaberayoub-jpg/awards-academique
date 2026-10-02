import { Loader2 } from 'lucide-react';

interface LoadingProps {
  label?: string;
}

export function Loading({ label = 'Chargement...' }: LoadingProps) {
  return (
    <div
      role="status"
      className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-lg border border-border bg-surface shadow-sm"
    >
      <div className="relative flex h-12 w-12 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-primary-tint" />
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted">Cela ne prend généralement qu'un instant</p>
      </div>
    </div>
  );
}
