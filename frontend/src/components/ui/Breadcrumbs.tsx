import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
}

export function Breadcrumbs({ items, homeLabel = 'Accueil' }: BreadcrumbsProps) {
  return (
    <nav aria-label="Fil d'Ariane" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm">
        <li>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-text-secondary transition-colors hover:text-text-primary"
          >
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{homeLabel}</span>
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li aria-hidden="true" className="text-text-muted">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li className="min-w-0">
                {item.to && !isLast ? (
                  <Link
                    to={item.to}
                    className="block truncate rounded-md px-1.5 py-1 text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className="block truncate px-1.5 py-1 font-medium text-text-primary"
                  >
                    {item.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
