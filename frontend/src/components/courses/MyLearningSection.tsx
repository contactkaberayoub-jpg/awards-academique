import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { useMyEnrollments } from '@/api/hooks';
import { EnrollmentCard, EnrollmentCardSkeleton } from './EnrollmentCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BookOpen } from 'lucide-react';

export function MyLearningSection() {
  const { isAuthenticated } = useAuth();
  const { data: enrollments, isLoading, error } = useMyEnrollments();

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-12">
        <Card className="flex flex-col items-center gap-4 py-10 text-center">
          <BookOpen className="h-8 w-8 text-text-muted" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Mon apprentissage</h2>
            <p className="mt-1 text-sm text-text-muted">
              Connectez-vous pour suivre votre progression et reprendre vos cours.
            </p>
          </div>
          <Link to="/login">
            <Button variant="primary">Se connecter</Button>
          </Link>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary">Mon apprentissage</h2>
        <p className="mt-1 text-sm text-text-muted">
          Reprenez là où vous vous êtes arrêté
        </p>
      </div>

      {error ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-text-secondary">
            Impossible de charger votre progression pour le moment.
          </p>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <EnrollmentCardSkeleton key={i} />
          ))}
        </div>
      ) : !enrollments || enrollments.length === 0 ? (
        <Card className="py-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-text-muted" aria-hidden="true" />
          <p className="mt-3 text-sm text-text-secondary">
            Vous n’êtes inscrit à aucun cours pour le moment.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {enrollments.map((enrollment, index) => (
            <EnrollmentCard key={enrollment.id} enrollment={enrollment} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
