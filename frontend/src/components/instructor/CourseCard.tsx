import { ArrowUpRight, Clock, DollarSign, Pencil, Trash2, Users, Utensils } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { CourseResponse } from '@/api/admin';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { formatDate } from '@/lib/formatDate';
import { StatusBadge } from './StatusBadge';

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
  all_levels: 'Tous niveaux',
};

interface CourseCardProps {
  course: CourseResponse;
  index?: number;
  onEdit?: (course: CourseResponse) => void;
  onDelete?: (course: CourseResponse) => void;
  actions?: ReactNode;
}

export function CourseCard({ course, index = 0, onEdit, onDelete, actions }: CourseCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-normal hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
    >
      <button
        type="button"
        onClick={() => navigate(`/instructor/courses/${course.id}/manage`)}
        className="relative block aspect-[16/9] w-full overflow-hidden bg-surface-secondary text-left"
        aria-label={`Gérer le cours « ${course.title} »`}
      >
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-normal group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full items-center justify-center gap-2 text-text-muted">
            <Utensils className="h-6 w-6" aria-hidden="true" />
            <span className="text-sm">Aperçu du cours</span>
          </span>
        )}
        <span className="absolute left-3 top-3">
          <StatusBadge status={course.status} size="sm" className="shadow-sm" />
        </span>
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-2xs font-medium text-white backdrop-blur-sm">
          <DollarSign className="h-3 w-3" aria-hidden="true" />
          {course.isFree ? 'Gratuit' : `${new Intl.NumberFormat('fr-FR').format(course.price)} ${course.currency}`}
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-text-muted">
            {course.categoryName ?? 'Sans catégorie'}
          </p>
          <button
            type="button"
            onClick={() => navigate(`/instructor/courses/${course.id}/manage`)}
            className="mt-0.5 block w-full truncate text-left text-base font-bold tracking-tight text-text-primary transition-colors hover:text-primary"
            title={course.title}
          >
            {course.title}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            {course.enrollmentsCount} étudiant{course.enrollmentsCount > 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
            {LEVEL_LABEL[course.level] ?? course.level}
          </span>
          {course.averageRating ? (
            <span className="inline-flex items-center gap-1 font-semibold text-warning">
              ★ {course.averageRating.toFixed(1)}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={course.instructorName ?? 'Formateur'} size="xs" initials={course.instructorName?.slice(0, 2).toUpperCase()} />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-text-primary">
                {course.instructorName ?? 'Vous'}
              </p>
              <p className="truncate text-2xs text-text-muted">Màj. {formatDate(course.updatedAt)}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/instructor/courses/${course.id}/manage`)}
              title="Gérer le cours"
              className="gap-1 px-2.5"
            >
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              Gérer
            </Button>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(course)}
                title="Modifier"
                aria-label={`Modifier le cours ${course.title}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(course)}
                title="Supprimer"
                aria-label={`Supprimer le cours ${course.title}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-error-tint hover:text-error"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {actions}
      </div>
    </motion.div>
  );
}