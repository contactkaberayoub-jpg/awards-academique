import { Link } from 'react-router-dom';
import { BookOpen, PlayCircle } from 'lucide-react';
import { useMyEnrollments } from '@/api/hooks';
import { EnrollmentCard, EnrollmentCardSkeleton } from '@/components/courses/EnrollmentCard';
import { Card } from '@/components/ui/Card';

const ACCENT = '#0F766E';

export default function MyCoursesPage() {
  const { data: enrollments, isLoading, error } = useMyEnrollments();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className="text-2xs font-semibold uppercase tracking-wider"
            style={{ color: ACCENT }}
          >
            Votre bibliothèque
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            Mes cours
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Tous les cours auxquels vous êtes inscrit, prêts à reprendre là où vous vous êtes arrêté.
          </p>
        </div>
        <Link
          to="/courses"
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-sm px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-fast hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
          style={{ backgroundColor: ACCENT }}
        >
          <PlayCircle className="h-4 w-4" />
          Découvrir des cours
        </Link>
      </div>

      {error ? (
        <Card className="py-12 text-center">
          <p className="text-sm text-text-secondary">
            Impossible de charger vos cours pour le moment.
          </p>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <EnrollmentCardSkeleton key={i} />
          ))}
        </div>
      ) : !enrollments || enrollments.length === 0 ? (
        <Card className="py-14 text-center">
          <BookOpen className="mx-auto h-9 w-9 text-text-muted" aria-hidden="true" />
          <p className="mt-4 text-sm font-medium text-text-primary">
            Vous n’êtes inscrit à aucun cours pour le moment.
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Parcourez le catalogue pour trouver votre prochain cours.
          </p>
          <Link
            to="/courses"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-sm px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-fast hover:-translate-y-0.5 hover:shadow-md"
            style={{ backgroundColor: ACCENT }}
          >
            <PlayCircle className="h-4 w-4" />
            Parcourir les cours
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {enrollments.map((enrollment, index) => (
            <EnrollmentCard key={enrollment.id} enrollment={enrollment} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
