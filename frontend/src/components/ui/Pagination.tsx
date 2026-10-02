import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i += 1) result.push(i);
  return result;
}

export function Pagination({ page, pageCount, onPageChange, siblingCount = 1 }: PaginationProps) {
  if (pageCount <= 1) return null;

  const siblings = siblingCount;
  const totalNumbers = siblings * 2 + 3; // first + last + siblings + current + 2 potential ellipsis
  const leftBound = Math.max(1, page - siblings);
  const rightBound = Math.min(pageCount, page + siblings);

  let pages: (number | 'ellipsis-left' | 'ellipsis-right')[];

  if (pageCount <= totalNumbers) {
    pages = range(1, pageCount);
  } else {
    const pagesBefore = range(leftBound, rightBound);
    const leftEllipsis = leftBound > 2;
    const rightEllipsis = rightBound < pageCount - 1;

    if (!leftEllipsis && rightEllipsis) {
      pages = [...range(1, leftBound + siblings + 1), 'ellipsis-right', pageCount];
    } else if (leftEllipsis && !rightEllipsis) {
      pages = [1, 'ellipsis-left', ...range(leftBound - siblings, pageCount)];
    } else {
      pages = [1, 'ellipsis-left', ...pagesBefore, 'ellipsis-right', pageCount];
    }
  }

  const itemClass = (isActive: boolean) =>
    [
      'inline-flex h-9 min-w-9 items-center justify-center rounded-sm px-2 text-sm font-medium transition-colors duration-fast',
      isActive
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary',
    ].join(' ');

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex h-9 items-center gap-1.5 rounded-sm px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Précédent</span>
      </button>

      <div className="flex items-center gap-1">
        {pages.map((item, index) => {
          if (item === 'ellipsis-left' || item === 'ellipsis-right') {
            return (
              <span key={`${item}-${index}`} className="px-1 text-text-muted" aria-hidden="true">
                …
              </span>
            );
          }
          return (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={itemClass(item === page)}
            >
              {item}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        className="inline-flex h-9 items-center gap-1.5 rounded-sm px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="hidden sm:inline">Suivant</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
