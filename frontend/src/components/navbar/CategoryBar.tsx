import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCategories } from '../../api/hooks';
import { Skeleton } from '../ui/Skeleton';

export function CategoryBar() {
  const { data: categories, isLoading, error } = useCategories();
  const [activeCategory, setActiveCategory] = useState<string>('');

  if (error) {
    return (
      <div className="w-full bg-surface border-b border-[#ECECEC] py-4">
        <div className="mx-auto max-w-[1700px] px-10 sm:px-12">
          <p className="text-error text-sm">Impossible de charger les catégories</p>
        </div>
      </div>
    );
  }

  // Flatten nested categories for the category bar (only show root categories)
  const flatCategories = categories?.filter(cat => !cat.parentId) || [];

  return (
    <div className="w-full bg-surface border-b border-[#ECECEC]">
      <div className="mx-auto max-w-[1700px] px-10 sm:px-12">
        <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide py-3">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, idx) => (
              <Skeleton key={idx} className="h-4 w-24" />
            ))
          ) : flatCategories.length === 0 ? (
            <p className="text-text-muted text-sm">Aucune catégorie disponible</p>
          ) : (
            flatCategories.map((category) => (
              <Link
                key={category.id}
                to={`/courses?category=${category.slug}`}
                onClick={() => setActiveCategory(category.id)}
                className={`
                  relative whitespace-nowrap text-[14px] font-medium transition-all duration-200
                  ${activeCategory === category.id ? 'text-text-primary' : 'text-text-secondary'}
                `}
              >
                <span>{category.name}</span>
                {activeCategory === category.id && (
                  <span className="absolute bottom-[-12px] left-0 w-full h-0.5 bg-text-primary animate-pulse"></span>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
