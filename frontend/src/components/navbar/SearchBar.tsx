import { Search, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSearch } from '../../api/hooks';
import { Skeleton } from '../ui/Skeleton';

export function SearchBar() {
  const [isFocused, setIsFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: searchResults, isLoading, error } = useSearch(debouncedQuery);

  // Close the dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative flex-1 max-w-[680px] mx-10 hidden md:block">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className={`h-5 w-5 transition-colors ${isFocused ? 'text-text-primary' : 'text-text-muted'}`} />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher des cours, catégories, formateurs..."
        onFocus={() => setIsFocused(true)}
        className={`
          block w-full h-12 pl-12 pr-10 rounded-full text-[15px] text-text-primary
          placeholder:text-text-muted
          transition-all duration-200
          ${isFocused 
            ? 'bg-surface border border-border shadow-sm' 
            : 'bg-surface-secondary border-transparent'
          }
          focus:outline-none
        `}
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="absolute inset-y-0 right-4 flex items-center text-text-muted hover:text-text-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Search Results Dropdown */}
      {isFocused && debouncedQuery && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-lg max-h-[400px] overflow-y-auto z-50">
          {error && (
            <div className="p-4 text-error text-sm">
              Impossible de charger les résultats de recherche
            </div>
          )}
          {isLoading && (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && !error && searchResults?.length === 0 && (
            <div className="p-4 text-text-secondary text-sm">
              Aucun résultat trouvé
            </div>
          )}
          {searchResults?.map((result) => (
            <Link
              key={result.id}
              to={
                result.type === 'course'
                  ? `/courses/${result.id}`
                  : result.type === 'category'
                  ? `/courses?category=${result.slug}`
                  : result.type === 'instructor'
                  ? `/instructors/${result.id}`
                  : '#'
              }
              className="flex items-center gap-3 p-3 hover:bg-surface-secondary transition-colors"
              onClick={() => {
                setIsFocused(false);
                setQuery('');
              }}
            >
              {result.thumbnailUrl ? (
                <img
                  src={result.thumbnailUrl}
                  alt=""
                  className="h-10 w-10 object-cover rounded-lg"
                />
              ) : (
                <div className="h-10 w-10 bg-surface-tertiary rounded-lg flex items-center justify-center">
                  <Search className="h-5 w-5 text-text-muted" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{result.title}</p>
                {result.description && (
                  <p className="text-xs text-text-secondary truncate">{result.description}</p>
                )}
              </div>
              <span className="text-xs text-text-muted uppercase">
                {result.type === 'course'
                  ? 'Cours'
                  : result.type === 'category'
                  ? 'Catégorie'
                  : result.type === 'instructor'
                  ? 'Formateur'
                  : result.type}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
