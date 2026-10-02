import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { Pagination } from '../ui/Pagination';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  isLoading?: boolean;
  loadingRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  pagination?: { page: number; pageCount: number; onPageChange: (page: number) => void };
  footer?: ReactNode;
  containerClassName?: string;
  striped?: boolean;
}

type SortDirection = 'asc' | 'desc';

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  isLoading = false,
  loadingRows = 6,
  emptyTitle = 'Rien pour le moment',
  emptyDescription = 'Il n\'y a aucune donnée à afficher.',
  onRowClick,
  pagination,
  footer,
  containerClassName,
  striped = false,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    const column = columns.find((c) => c.key === sortColumn);
    if (!column?.sortValue) return data;

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const aValue = column.sortValue!(a);
      const bValue = column.sortValue!(b);
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [columns, data, sortColumn, sortDirection]);

  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !column.sortValue) return;
    if (sortColumn === column.key) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column.key);
      setSortDirection('asc');
    }
  };

  const alignClass = (column: DataTableColumn<T>) =>
    column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left';

  return (
    <div className="flex flex-col">
      <div
        className={[
          'overflow-hidden rounded-lg border border-border bg-surface shadow-sm',
          containerClassName ?? '',
        ].join(' ')}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-secondary/60">
              <tr>
                {columns.map((column) => {
                  const isSorted = sortColumn === column.key;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      onClick={() => toggleSort(column)}
                      className={[
                        'whitespace-nowrap border-b border-border px-4 py-3.5 text-2xs font-semibold uppercase tracking-wider text-text-muted',
                        alignClass(column),
                        column.sortable ? 'cursor-pointer select-none hover:text-text-primary' : '',
                        column.headerClassName ?? '',
                      ].join(' ')}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {column.header}
                        {column.sortable && column.sortValue && (
                          <span className={isSorted ? 'text-primary' : 'text-text-muted'}>
                            {isSorted ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-60" />
                            )}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border bg-surface">
              {isLoading ? (
                Array.from({ length: loadingRows }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`}>
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3.5">
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-4">
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => (
                  <tr
                    key={getRowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={[
                      'group transition-colors duration-fast',
                      onRowClick
                        ? 'cursor-pointer hover:bg-surface-secondary/70'
                        : 'hover:bg-surface-secondary/40',
                      striped ? 'odd:bg-surface-secondary/40' : '',
                    ].join(' ')}
                  >
                    {columns.map((column, columnIndex) => (
                      <td
                        key={column.key}
                        className={[
                          'relative px-4 py-3 align-middle text-text-primary',
                          alignClass(column),
                          column.className ?? '',
                        ].join(' ')}
                      >
                        {columnIndex === 0 && (
                          <span
                            className="pointer-events-none absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary opacity-0 transition-opacity duration-fast group-hover:opacity-100"
                            aria-hidden="true"
                          />
                        )}
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && !isLoading && sortedData.length > 0 && (
        <div className="mt-4">
          <Pagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}

      {footer}
    </div>
  );
}
