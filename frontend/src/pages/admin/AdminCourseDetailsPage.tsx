import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminApi, type CourseResponse, type SectionResponse } from '@/api/admin';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { EmptyState } from '@/components/admin/EmptyState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getApiErrorMessage } from '@/lib/apiError';
import { ArrowLeft, Star, CheckCircle2, XCircle, Archive, RotateCcw } from 'lucide-react';

export default function AdminCourseDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseResponse | null>(null);
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [courseRes, sectionsRes] = await Promise.all([
        adminApi.getCourseById(id),
        adminApi.getSectionsByCourse(id),
      ]);
      setCourse(courseRes.data);
      setSections(sectionsRes.data.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger les détails du cours.'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAction = async (actionFn: (courseId: string) => Promise<any>, successText: string) => {
    if (!id) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await actionFn(id);
      setSuccessMessage(successText);
      setTimeout(() => setSuccessMessage(null), 4000);
      void loadData();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Une erreur est survenue lors de l'action."));
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return <Loading label="Chargement du cours..." />;
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <Link to="/admin/courses" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour aux cours
        </Link>
        <EmptyState title="Cours introuvable" description="Le cours demandé n'existe pas ou a été supprimé." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin/courses" className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour à la liste des cours
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={course.status === 'published' ? 'success' : course.status === 'pending' ? 'warning' : 'error'} size="md">
            Statut: {course.status}
          </Badge>
          {course.status === 'pending' && (
            <>
              <button
                disabled={actionLoading}
                onClick={() => handleAction(adminApi.publishCourse, 'Cours publié avec succès.')}
                className="inline-flex items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white hover:bg-success/90 transition"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approuver & Publier
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleAction(adminApi.rejectCourse, 'Cours rejeté.')}
                className="inline-flex items-center gap-1 rounded-lg bg-error px-3 py-1.5 text-xs font-medium text-white hover:bg-error/90 transition"
              >
                <XCircle className="h-3.5 w-3.5" /> Rejeter
              </button>
            </>
          )}
          {course.status === 'published' && (
            <button
              disabled={actionLoading}
              onClick={() => handleAction(adminApi.archiveCourse, 'Cours archivé.')}
              className="inline-flex items-center gap-1 rounded-lg bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-hover transition"
            >
              <Archive className="h-3.5 w-3.5" /> Archiver
            </button>
          )}
          {course.status === 'archived' && (
            <button
              disabled={actionLoading}
              onClick={() => handleAction(adminApi.restoreCourse, 'Cours restauré.')}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restaurer
            </button>
          )}
        </div>
      </div>

      <Notice type="error" message={errorMessage} />
      <Notice type="success" message={successMessage} />

      <Card>
        <div className="grid gap-6 lg:grid-cols-3">
          {course.thumbnailUrl && (
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-surface-secondary lg:aspect-square">
              <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">{course.categoryName ?? 'Général'}</span>
              <h1 className="text-2xl font-bold text-text-primary mt-1">{course.title}</h1>
              {course.subtitle && <p className="text-sm font-medium text-text-secondary mt-1">{course.subtitle}</p>}
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{course.description || 'Aucune description fournie.'}</p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border sm:grid-cols-4">
              <div>
                <p className="text-xs text-text-muted">Prix</p>
                <p className="text-sm font-bold text-text-primary">{course.isFree ? 'Gratuit' : `${course.price} ${course.currency}`}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Niveau</p>
                <p className="text-sm font-semibold text-text-primary capitalize">{course.level}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Inscriptions</p>
                <p className="text-sm font-semibold text-text-primary">{course.enrollmentsCount}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Note moyenne</p>
                <p className="text-sm font-semibold text-text-primary flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {course.averageRating ?? '—'} ({course.reviewsCount} avis)
                </p>
              </div>
            </div>

            {course.instructorId && (
              <div className="pt-2 flex items-center gap-3 text-xs text-text-secondary">
                <span>Formateur :</span>
                <Link to={`/admin/instructors/${course.instructorId}`} className="font-semibold text-primary hover:underline">
                  {course.instructorName ?? 'Formateur'}
                </Link>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-text-primary">Curriculum du cours ({sections.length} sections)</h2>
        {sections.length === 0 ? (
          <EmptyState title="Aucune section" description="Ce cours ne contient pas encore de sections ni de leçons." />
        ) : (
          <div className="space-y-3">
            {sections.map((section, sIndex) => (
              <Card key={section.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-text-primary flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs text-primary font-bold">
                      {sIndex + 1}
                    </span>
                    {section.title}
                  </h3>
                  <span className="text-xs text-text-muted">Section ID: {section.id.slice(0, 8)}...</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
