import { ArrowRight, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
}

export function QuickActionCard({ title, description, icon: Icon, to }: QuickActionCardProps) {
  return (
    <NavLink
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all duration-normal hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary transition-transform duration-normal group-hover:scale-110">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-text-primary">{title}</span>
        <span className="block truncate text-xs text-text-secondary">{description}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-normal group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
    </NavLink>
  );
}