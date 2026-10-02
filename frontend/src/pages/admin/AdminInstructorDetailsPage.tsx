import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminApi, type AdminInstructorDetailResponse, type CourseResponse } from '@/api/admin';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { EmptyState } from '@/components/admin/EmptyState';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KpiCard } from '@/components/ui/KpiCard';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatDate } from '@/lib/formatDate';
import { BookOpen, Users, Wallet, ArrowLeft, ExternalLink, Linkedin, Briefcase } from 'lucide-react';

export default function AdminInstructorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [instructor, setInstructor] = useState<AdminInstructorDetailResponse | null>(null);
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [instRes, coursesRes] = await Promise.all([
        adminApi.getInstructorById(id),
        adminApi.getInstructorCourses(id),
      ]);
      setInstructor(instRes.data);
      setCourses(coursesRes.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger les détails du formateur.'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (isLoading) {
    return <Loading label="Chargement du profil du formateur..." />;
  }

  if (!instructor) {
    return (
      <div className="space-y-6">
        <Link to="/admin/instructors" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour aux formateurs
        </Link>
        <EmptyState title="Formateur introuvable" description="Le formateur demandé n'existe pas ou a été supprimé." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin/instructors" className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </Link>
        <Badge variant={instructor.status === 'approved' ? 'success' : instructor.status === 'pending' ? 'warning' : 'error'} size="md">
          Statut: {instructor.status}
        </Badge>
      </div>

      <Notice type="error" message={errorMessage} />

      <Card>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {instructor.avatarUrl ? (
              <img src={instructor.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              (instructor.firstName?.[0] ?? '') + (instructor.lastName?.[0] ?? '')
            )}
          </div>
          <div className="space-y-1 flex-1">
            <h1 className="text-xl font-bold text-text-primary">
              {instructor.firstName} {instructor.lastName}
            </h1>
            <p className="text-sm text-text-secondary">{instructor.email}</p>
            {instructor.professionalTitle && (
              <p className="text-xs font-medium text-text-primary flex items-center gap-1.5 pt-0.5">
                <Briefcase className="h-3.5 w-3.5 text-text-muted" /> {instructor.professionalTitle}
                {instructor.institution ? ` @ ${instructor.institution}` : ''}
              </p>
            )}
            <p className="text-xs text-text-muted">Inscrit le {formatDate(instructor.createdAt)}</p>
          </div>
          {instructor.linkedinUrl && (
            <a
              href={instructor.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <Linkedin className="h-4 w-4 text-primary" />
              <span>Profil LinkedIn</span>
              <ExternalLink className="h-3 w-3 text-text-muted" />
            </a>
          )}
        </div>

        {(instructor.bio || instructor.expertise) && (
          <div className="mt-6 border-t border-border pt-4 space-y-3">
            {instructor.bio && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Biographie</h3>
                <p className="mt-1 text-sm text-text-secondary leading-relaxed">{instructor.bio}</p>
              </div>
            )}
            {instructor.expertise && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Domaines d'expertise</h3>
                <p className="mt-1 text-sm text-text-secondary">{instructor.expertise}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          index={0}
          label="Cours publiés"
          value={instructor.courseCount}
          icon={BookOpen}
          tone="accent"
        />
        <KpiCard
          index={1}
          label="Étudiants inscrits"
          value={instructor.totalStudents.toLocaleString()}
          icon={Users}
          tone="success"
        />
        <KpiCard
          index={2}
          label="Revenu brut"
          value={`${(instructor.totalRevenue ?? 0).toFixed(2)} MAD`}
          icon={Wallet}
          tone="warning"
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-text-primary">Cours de ce formateur ({courses.length})</h2>
        {courses.length === 0 ? (
          <EmptyState title="Aucun cours" description="Ce formateur n'a pas encore publié de cours." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id} className="flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  {course.thumbnailUrl && (
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-surface-secondary">
                      <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-text-primary line-clamp-2">{course.title}</h3>
                    <Badge variant={course.status === 'published' ? 'success' : 'warning'} size="sm">
                      {course.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2">{course.description || 'Aucune description'}</p>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-text-muted">
                  <span>{course.enrollmentsCount} étudiants</span>
                  <span className="font-bold text-text-primary">
                    {course.isFree ? 'Gratuit' : `${course.price} ${course.currency}`}
                  </span>
                  <Link
                    to={`/admin/courses/${course.id}`}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <span>Détails</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
