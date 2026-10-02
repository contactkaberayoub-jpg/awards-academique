import { Badge } from '../ui/Badge';

type StatusBadgeVariant =
  | 'default'
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

const STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  draft: 'default',
  DRAFT: 'default',
  pending: 'warning',
  PENDING: 'warning',
  processing: 'info',
  PROCESSING: 'info',
  published: 'success',
  PUBLISHED: 'success',
  paid: 'success',
  PAID: 'success',
  approved: 'success',
  APPROVED: 'success',
  rejected: 'error',
  REJECTED: 'error',
  failed: 'error',
  FAILED: 'error',
  cancelled: 'error',
  CANCELLED: 'error',
  refunded: 'warning',
  REFUNDED: 'warning',
  archived: 'default',
  ARCHIVED: 'default',
  paused: 'warning',
  PAUSED: 'warning',
  upcoming: 'info',
  UPCOMING: 'info',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  DRAFT: 'Brouillon',
  pending: 'En attente',
  PENDING: 'En attente',
  processing: 'Traitement',
  PROCESSING: 'Traitement',
  published: 'Publié',
  PUBLISHED: 'Publié',
  paid: 'Payé',
  PAID: 'Payé',
  approved: 'Approuvé',
  APPROVED: 'Approuvé',
  rejected: 'Rejeté',
  REJECTED: 'Rejeté',
  failed: 'Échec',
  FAILED: 'Échec',
  cancelled: 'Annulé',
  CANCELLED: 'Annulé',
  refunded: 'Remboursé',
  REFUNDED: 'Remboursé',
  archived: 'Archivé',
  ARCHIVED: 'Archivé',
  paused: 'En pause',
  PAUSED: 'En pause',
  upcoming: 'À venir',
  UPCOMING: 'À venir',
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

export function StatusBadge({ status, label, size = 'md', dot = true, className }: StatusBadgeProps) {
  const variant = STATUS_VARIANT[status] ?? 'default';
  const resolvedLabel = label ?? STATUS_LABEL[status] ?? status;
  return (
    <Badge variant={variant} size={size} dot={dot} className={className}>
      {resolvedLabel}
    </Badge>
  );
}