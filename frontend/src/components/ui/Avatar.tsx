import type { HTMLAttributes } from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  name?: string;
  initials?: string;
  status?: 'online' | 'offline' | 'busy';
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-2xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const statusClasses = {
  online: 'bg-success',
  offline: 'bg-text-muted',
  busy: 'bg-error',
};

const statusSizes: Record<AvatarSize, string> = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-3.5 w-3.5',
};

function initialsFor(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

// Deterministic solid hue per name so each user is visually distinct.
const hues = [
  '#1A73E8',
  '#188038',
  '#B06000',
  '#6D28D9',
  '#D93025',
  '#129EAF',
];

export function Avatar({
  src,
  alt,
  size = 'md',
  name,
  initials,
  status,
  className,
  ...props
}: AvatarProps) {
  const resolvedInitials = initials ?? (name ? initialsFor(name) : undefined);
  let hash = 0;
  if (name) {
    for (let i = 0; i < name.length; i += 1) {
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
  } else {
    hash = 7;
  }
  const hue = hues[hash % hues.length];

  const combinedClassName = [
    'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium text-white shadow-sm ring-2 ring-surface',
    sizeClasses[size],
    className ?? '',
  ].join(' ');

  return (
    <div className={combinedClassName} style={{ backgroundColor: hue }} {...props}>
      {src ? (
        <img
          src={src}
          alt={alt ?? name ?? 'avatar'}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{resolvedInitials ?? '?'}</span>
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ring-surface ${statusClasses[status]} ${statusSizes[size]}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
