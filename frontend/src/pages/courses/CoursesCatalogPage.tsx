import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { categoriesApi } from '@/api/categories';
import { CourseCard } from '@/components/courses/CourseCard';
import { CourseCardSkeleton } from '@/components/courses/CourseCardSkeleton';
import { SearchFilterBar, type Filters } from '@/components/courses/SearchFilterBar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/admin/EmptyState';

const PAGE_SIZE = 12;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  for (let i = 0; i < totalPages; i++) {
    if (i === 0 || i === totalPages - 1 || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <Button
        variant="ghost"
        size="sm"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {pages.map((p, idx) =>
        p === '...' ? (
          <span key={`dots-${idx}`} className="hidden px-2 text-sm text-text-muted sm:inline-flex">
            …
          </span>
        ) : p >= page - 1 && p <= page + 1 ? (
          <Button
            key={p}
            variant={p === page ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onChange(p)}
          >
            {p + 1}
          </Button>
        ) : (
          <span key={p} className="hidden sm:inline-flex">
            <Button variant="ghost" size="sm" onClick={() => onChange(p)}>
              {p + 1}
            </Button>
          </span>
        )
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const initialFilters: Filters = { title: '', categoryId: '', level: '', isFree: null };

export default function CoursesCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>({
    title: searchParams.get('q') ?? '',
    categoryId: searchParams.get('category') ?? '',
    level: searchParams.get('level') ?? '',
    isFree: searchParams.get('free') === 'true' ? true : null,
  });
  const [page, setPage] = useState(0);

  // Sync URL → filters
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    const cat = searchParams.get('category') ?? '';
    const lvl = searchParams.get('level') ?? '';
    const free = searchParams.get('free') === 'true' ? true : null;
    setFilters((prev) => {
      if (prev.title === q && prev.categoryId === cat && prev.level === lvl && prev.isFree === free) return prev;
      return { title: q, categoryId: cat, level: lvl, isFree: free };
    });
  }, [searchParams]);

  // Fetch categories (flat list for dropdown)
  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => categoriesApi.getAll(),
    staleTime: 60000,
  });

  // Fetch courses
  const { data: coursesPage, isLoading } = useQuery({
    queryKey: ['courses', 'search', filters, page],
    queryFn: async () => {
      const params: Record<string, string | number | boolean> = { page, size: PAGE_SIZE, sortBy: 'createdAt', direction: 'DESC' };
      if (filters.title) params.title = filters.title;
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.level) params.level = filters.level;
      if (filters.isFree === true) params.isFree = true;
      const response = await adminApi.searchCourses(params as any);
      return response.data;
    },
    staleTime: 30000,
  });

  const handleFilterChange = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(0);
  }, []);

  const handleReset = useCallback(() => {
    setFilters(initialFilters);
    setSearchParams({});
    setPage(0);
  }, [setSearchParams]);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const courses = coursesPage?.content ?? [];
  const totalElements = coursesPage?.totalElements ?? 0;
  const totalPages = coursesPage?.totalPages ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Tous les cours</h1>
          <p className="mt-1 text-sm text-text-muted">
            Explorez notre catalogue et trouvez le cours parfait
          </p>
        </div>
      </section>

      <div className="mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Horizontal filter bar */}
        <SearchFilterBar
          filters={filters}
          categories={allCategories}
          onChange={handleFilterChange}
          onReset={handleReset}
        />

        {/* Results count */}
        {!isLoading && (
          <p className="mb-4 text-sm text-text-muted">
            {totalElements} cours trouvé{totalElements !== 1 ? 's' : ''}
          </p>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <CourseCardSkeleton key={i} />)
            : courses.map((course, i) => (
                <CourseCard key={course.id} course={course} index={i} />
              ))}
        </div>

        {/* Empty */}
        {!isLoading && courses.length === 0 && (
          <EmptyState
            title="Aucun cours trouvé"
            description="Essayez de modifier vos filtres ou revenez plus tard."
            action={
              <Button variant="secondary" onClick={handleReset}>
                <X className="h-4 w-4" />
                Réinitialiser les filtres
              </Button>
            }
          />
        )}

        {/* Pagination */}
        {!isLoading && courses.length > 0 && (
          <div className="mt-8">
            <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
          </div>
        )}
      </div>
    </div>
  );
}
