import { Search } from 'lucide-react';
import type { CategoryNode } from '@/api/categories';
import { Checkbox } from '@/components/ui/Checkbox';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export const LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
  { value: 'all_levels', label: 'Tous niveaux' },
] as const;

export interface Filters {
  title: string;
  categoryId: string;
  level: string;
  isFree: boolean | null;
}

interface SearchFilterBarProps {
  filters: Filters;
  categories: CategoryNode[];
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
}

export function SearchFilterBar({
  filters,
  categories,
  onChange,
  onReset,
}: SearchFilterBarProps) {
  const hasActive =
    filters.title !== '' || filters.categoryId !== '' || filters.level !== '' || filters.isFree !== null;

  return (
    <Card
      variant="default"
      className="mb-6 flex flex-col gap-3 rounded-xl md:flex-row md:flex-wrap md:items-center lg:flex-nowrap lg:gap-3"
    >
      {/* Search */}
      <div className="w-full lg:w-auto lg:flex-1">
        <Input
          type="text"
          placeholder="Rechercher un cours…"
          value={filters.title}
          onChange={(e) => onChange({ title: e.target.value })}
          leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
          className="h-11 !rounded-lg"
        />
      </div>

      {/* Category */}
      <div className="w-full md:w-auto">
        <Select
          value={filters.categoryId}
          onChange={(e) => onChange({ categoryId: e.target.value })}
          placeholder="Toutes les catégories"
          options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
          className="h-11 min-w-[200px] !rounded-lg"
        />
      </div>

      {/* Level */}
      <div className="w-full md:w-auto">
        <Select
          value={filters.level}
          onChange={(e) => onChange({ level: e.target.value })}
          placeholder="Tous les niveaux"
          options={LEVELS.map((l) => ({ value: l.value, label: l.label }))}
          className="h-11 min-w-[170px] !rounded-lg"
        />
      </div>

      {/* Free only */}
      <div className="w-full md:w-auto">
        <Checkbox
          id="free-only"
          label="Cours gratuits uniquement"
          checked={filters.isFree === true}
          onChange={(e) => onChange({ isFree: e.target.checked ? true : null })}
          className="whitespace-nowrap text-text-secondary"
        />
      </div>

      {hasActive && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-medium text-primary hover:underline md:ml-auto"
        >
          Tout effacer
        </button>
      )}
    </Card>
  );
}
