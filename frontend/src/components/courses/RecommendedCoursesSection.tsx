import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRecommendedCourses } from '@/api/hooks';
import { CourseCard } from './CourseCard';
import { CourseCardSkeleton } from './CourseCardSkeleton';
import { Card } from '@/components/ui/Card';
import { GraduationCap } from 'lucide-react';

export function RecommendedCoursesSection() {
  const { data: courses, isLoading, error } = useRecommendedCourses(12);

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Cours recommandés</h2>
          <p className="mt-1 text-sm text-text-muted">
            Sélectionnés pour vous parmi nos parcours les plus suivis
          </p>
        </div>
        <Link
          to="/courses"
          className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
        >
          Voir tous
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {error ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-text-secondary">
            Impossible de charger les cours pour le moment.
          </p>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      ) : !courses || courses.length === 0 ? (
        <Card className="py-12 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-text-muted" aria-hidden="true" />
          <p className="mt-3 text-sm text-text-secondary">Aucun cours disponible pour le moment.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((course, index) => (
            <CourseCard key={course.id} course={course} index={index} />
          ))}
        </div>
      )}

      <div className="mt-6 text-center sm:hidden">
        <Link
          to="/courses"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Voir tous les cours
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
