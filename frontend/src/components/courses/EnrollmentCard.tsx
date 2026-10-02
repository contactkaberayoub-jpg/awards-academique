import { motion } from 'framer-motion';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/formatDate';
import type { EnrollmentResponse, EnrollmentStatus } from '@/api/enrollments';

const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  active: 'En cours',
  completed: 'Terminé',
  paused: 'En pause',
  cancelled: 'Annulé',
};

const STATUS_VARIANT: Record<EnrollmentStatus, 'primary' | 'success' | 'warning' | 'error'> = {
  active: 'primary',
  completed: 'success',
  paused: 'warning',
  cancelled: 'error',
};

interface EnrollmentCardProps {
  enrollment: EnrollmentResponse;
  index?: number;
}

export function EnrollmentCard({ enrollment, index = 0 }: EnrollmentCardProps) {
  const progress = Math.max(0, Math.min(100, Math.round(enrollment.completionPercentage ?? 0)));
  const isCompleted = enrollment.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
    >
      <Link
        to={`/learning/${enrollment.courseId}`}
        className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-all duration-normal hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-surface-tertiary">
          {enrollment.courseThumbnailUrl ? (
            <img
              src={enrollment.courseThumbnailUrl}
              alt={enrollment.courseTitle ?? 'Cours'}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-text-muted">
              <BookOpen className="h-9 w-9" aria-hidden="true" />
            </div>
          )}

          <Badge
            variant={STATUS_VARIANT[enrollment.status]}
            size="sm"
            className="absolute right-2 top-2 shadow-sm"
          >
            {STATUS_LABEL[enrollment.status]}
          </Badge>
        </div>

        <div className="flex flex-1 flex-col border-t border-border p-4">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary">
            {enrollment.courseTitle ?? 'Cours'}
          </h3>

          <div className="mt-3 border-t border-border pt-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-text-secondary">
                {isCompleted ? 'Cours terminé' : 'Progression'}
              </span>
              <span className="font-semibold text-text-primary">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
              <div
                className="h-full rounded-full bg-warning transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {enrollment.lastActivityAt
                ? `Dernière activité : ${formatDate(enrollment.lastActivityAt)}`
                : 'Continuez votre apprentissage'}
            </span>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-primary"
              aria-hidden="true"
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function EnrollmentCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-1 flex-col border-t border-border p-4">
        <Skeleton className="h-4 w-3/4" />
        <div className="mt-3 border-t border-border pt-3">
          <Skeleton className="mb-2 h-3 w-1/3" />
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      </div>
    </div>
  );
}
