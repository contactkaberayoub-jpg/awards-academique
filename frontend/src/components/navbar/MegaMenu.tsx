import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Star } from 'lucide-react';
import { useCategories, useTrendingCourses, useFeaturedCoursesByCategory } from '../../api/hooks';
import type { CategoryNode } from '../../api/categories';
import { Skeleton } from '../ui/Skeleton';

export function MegaMenu() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();
  const { data: courses, isLoading: coursesLoading, error: coursesError } = useTrendingCourses();
  const { data: coursesByCategory, isLoading: featuredLoading, error: featuredError } = useFeaturedCoursesByCategory();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menus = [
    { id: 'findCourses', label: 'Trouver un cours' },
    { id: 'getCertified', label: 'Obtenir un certificat' },
  ];

  // Recursive component to render nested categories
  const CategoryItem = ({ category, depth = 0 }: { category: CategoryNode; depth?: number }) => (
    <li key={category.id}>
      <Link
        to={`/courses?category=${category.slug}`}
        className={`text-sm text-text-secondary hover:text-text-primary flex items-center gap-2 ${depth > 0 ? 'text-xs' : ''}`}
        onClick={() => setActiveMenu(null)}
      >
        {category.iconUrl && (
          <img src={category.iconUrl} alt="" className="w-4 h-4" />
        )}
        {category.name}
      </Link>
      {category.children && category.children.length > 0 && (
        <ul className={`ml-${depth * 6 + 6} mt-1 space-y-1`}>
          {category.children.slice(0, 4).map((child) => (
            <CategoryItem key={child.id} category={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );

  return (
    <div ref={menuRef} className="relative">
      <nav className="flex items-center gap-2">
        {menus.map((menu) => (
          <button
            key={menu.id}
            onMouseEnter={() => setActiveMenu(menu.id)}
            onClick={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
            className={`
              flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors
              ${activeMenu === menu.id ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}
            `}
          >
            {menu.label}
            <ChevronDown className={`w-4 h-4 transition-transform ${activeMenu === menu.id ? 'rotate-180' : ''}`} />
          </button>
        ))}
      </nav>

      {/* Mega Menu Content */}
      {activeMenu && (
        <div className="absolute left-0 top-full mt-1 w-[900px] bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50">
          {/* Find Courses Dropdown */}
          {activeMenu === 'findCourses' && (
            <div className="p-6 grid grid-cols-3 gap-6">
              {/* Categories Column */}
              <div>
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Catégories</h3>
                {categoriesError ? (
                  <p className="text-error text-sm">Impossible de charger les catégories</p>
                ) : categoriesLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                ) : !categories || categories.length === 0 ? (
                  <p className="text-text-muted text-sm">Aucune catégorie disponible</p>
                ) : (
                  <ul className="space-y-2">
                    {categories.filter(cat => !cat.parentId).slice(0, 8).map((category) => (
                      <CategoryItem key={category.id} category={category} />
                    ))}
                  </ul>
                )}
              </div>

              {/* Trending Courses Column */}
              <div className="col-span-2">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Cours populaires</h3>
                {coursesError ? (
                  <p className="text-error text-sm">Impossible de charger les cours</p>
                ) : coursesLoading ? (
                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-32 w-full rounded-lg" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : !courses || courses.length === 0 ? (
                  <p className="text-text-muted text-sm">Aucun cours disponible</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {courses.map((course) => (
                      <Link
                        key={course.id}
                        to={`/courses/${course.id}`}
                        className="group"
                        onClick={() => setActiveMenu(null)}
                      >
                        <div className="relative aspect-video bg-surface-tertiary rounded-lg overflow-hidden mb-2">
                          {course.thumbnailUrl ? (
                            <img
                              src={course.thumbnailUrl}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-muted">
                              <span className="text-xs">Aucune image</span>
                            </div>
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-text-primary group-hover:text-primary line-clamp-2">
                          {course.title}
                        </h4>
                        <p className="text-xs text-text-secondary mt-1">
                          {course.instructorName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center">
                            <Star className="w-3 h-3 text-warning fill-current" />
                            <span className="text-xs text-text-secondary ml-1">
                              {(course.averageRating ?? 0).toFixed(1)}
                            </span>
                          </div>
                          <span className="text-xs text-text-muted">
                            • {(course.enrollmentsCount ?? 0).toLocaleString()} étudiants
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Get Certified Dropdown */}
          {activeMenu === 'getCertified' && (
            <div className="p-6">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Cours recommandés par catégorie</h3>
              {featuredError ? (
                <p className="text-error text-sm">Impossible de charger les cours</p>
              ) : featuredLoading ? (
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-4 w-24" />
                      {Array.from({ length: 2 }).map((_, j) => (
                        <div key={j} className="space-y-2">
                          <Skeleton className="h-24 w-full rounded-lg" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : !coursesByCategory || coursesByCategory.length === 0 ? (
                <p className="text-text-muted text-sm">Aucun cours disponible</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {coursesByCategory.filter(({ courses }) => courses.length > 0).map(({ category, courses }) => (
                    <div key={category.id} className="space-y-3">
                      <Link
                        to={`/courses?category=${category.slug}`}
                        onClick={() => setActiveMenu(null)}
                        className="text-sm font-semibold text-text-primary hover:text-primary"
                      >
                        {category.name}
                      </Link>
                      <div className="space-y-3">
                        {courses.slice(0, 2).map((course) => (
                          <Link
                            key={course.id}
                            to={`/courses/${course.id}`}
                            className="group block"
                            onClick={() => setActiveMenu(null)}
                          >
                            <div className="relative aspect-video bg-surface-tertiary rounded-lg overflow-hidden mb-2">
                              {course.thumbnailUrl ? (
                                <img
                                  src={course.thumbnailUrl}
                                  alt={course.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-text-muted">
                                  <span className="text-xs">Aucune image</span>
                                </div>
                              )}
                            </div>
                            <h4 className="text-sm font-medium text-text-primary group-hover:text-primary line-clamp-2">
                              {course.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center">
                                <Star className="w-3 h-3 text-warning fill-current" />
                                <span className="text-xs text-text-secondary ml-1">
                                  {(course.averageRating ?? 0).toFixed(1)}
                                </span>
                              </div>
                              <span className="text-xs text-text-muted">
                                • {(course.enrollmentsCount ?? 0).toLocaleString()}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
