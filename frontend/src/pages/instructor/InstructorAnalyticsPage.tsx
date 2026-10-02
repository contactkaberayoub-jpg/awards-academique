import { BookOpen, Clock, Layers, NotebookTabs, Star, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { instructorApi, type AnalyticsData } from '@/api/instructor';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState } from '@/components/admin/EmptyState';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/instructor/StatCard';
import { getApiErrorMessage } from '@/lib/apiError';

interface BarProps {
  label: string;
  value: number;
  total: number;
  color?: string;
}

function labelMap(value: string): string {
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    pending: 'En attente',
    rejected: 'Rejeté',
    published: 'Publié',
    archived: 'Archivé',
    text: 'Texte',
    video: 'Vidéo',
    pdf: 'PDF',
    quiz: 'Quiz',
    assignment: 'Exercice',
  };
  return labels[value] ?? value.replace('_', ' ');
}

function Bar({ label, value, total, color = 'bg-primary' }: BarProps) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-text-secondary capitalize">{labelMap(label)}</span>
        <span className="text-text-secondary">{value}</span>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${Math.max(percentage, value > 0 ? 6 : 0)}%` }} />
      </div>
    </div>
  );
}

export default function InstructorAnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      setData(await instructorApi.getAnalyticsData());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger les statistiques.'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (isLoading) {
    return <Loading label="Chargement des statistiques..." />;
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader title="Statistiques" description="Suivez la performance de vos cours." />
        <Notice type="error" message={errorMessage} />
      </div>
    );
  }

  if (!data || data.totalCourses === 0) {
    return (
      <div>
        <PageHeader title="Statistiques" description="Suivez la performance de vos cours." />
        <EmptyState title="Aucune statistique pour le moment" description="Créez des cours et ajoutez du contenu pour commencer à voir les données de performance." />
      </div>
    );
  }

  const statusTotal = Object.values(data.coursesByStatus).reduce((sum, value) => sum + value, 0);
  const lessonsByStatusTotal = Object.values(data.lessonsByStatus).reduce((sum, value) => sum + value, 0);
  const lessonsByTypeTotal = Object.values(data.lessonsByType).reduce((sum, value) => sum + value, 0);
  const courseStats = [...data.courseStats].sort(
    (a, b) => b.totalDurationMinutes - a.totalDurationMinutes
  );

  return (
    <div>
      <PageHeader title="Statistiques" description="Suivez la performance de vos cours." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Cours" value={data.totalCourses} icon={BookOpen} color="blue" />
        <StatCard label="Leçons" value={data.totalLessons} icon={NotebookTabs} color="green" />
        <StatCard label="Étudiants" value={data.totalStudents} icon={Users} color="amber" />
        <StatCard label="Durée" value={`${Math.round(data.totalDurationMinutes / 60)}h`} icon={Clock} color="violet" hint={`${data.totalDurationMinutes} minutes`} />
        <StatCard label="Note moyenne" value={Number(data.averageRating.toFixed(2))} icon={Star} color="red" />
        <StatCard label="Publiés" value={data.publishedCourses} icon={Layers} color="gray" hint="Cours visibles par les étudiants" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-text-primary">Cours par statut</h2>
          <div className="space-y-4">
            {Object.entries(data.coursesByStatus).length === 0 ? (
              <p className="text-sm text-text-secondary">Aucune donnée de cours.</p>
            ) : (
              Object.entries(data.coursesByStatus).map(([status, count]) => (
                <Bar key={status} label={status} value={count} total={statusTotal} />
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-text-primary">Leçons par statut</h2>
          <div className="space-y-4">
            {Object.entries(data.lessonsByStatus).map(([status, count]) => (
              <Bar key={status} label={status} value={count} total={lessonsByStatusTotal} color={status === 'published' ? 'bg-success' : status === 'archived' ? 'bg-text-muted' : 'bg-warning'} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-text-primary">Leçons par type</h2>
          <div className="space-y-4">
            {Object.entries(data.lessonsByType).map(([type, count]) => (
              <Bar key={type} label={type} value={count} total={lessonsByTypeTotal} color="bg-accent" />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-text-primary">Contenu par cours</h2>
          </div>
          <ul className="divide-y divide-border">
            {courseStats.map((stats) => (
              <li key={stats.courseId} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{stats.courseTitle}</p>
                  <p className="text-xs text-text-secondary">
                    {stats.sectionCount} sections · {stats.lessonCount} leçons · {stats.publishedLessonCount} publiées
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-surface-tertiary px-2 py-1 text-xs font-medium text-text-secondary">
                  {Math.round(stats.totalDurationMinutes / 60)}h {stats.totalDurationMinutes % 60}m
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-text-primary">Cours les plus populaires</h2>
          </div>
          <ul className="divide-y divide-border">
            {data.popularCourses.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-text-secondary">Aucune donnée de cours pour le moment.</li>
            ) : (
              data.popularCourses.map((course, index) => (
                <li key={course.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-tint text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{course.title}</p>
                    <p className="text-xs text-text-secondary">{course.enrollmentsCount ?? 0} étudiants · {course.averageRating ? `${course.averageRating.toFixed(1)} de note` : 'aucune note'}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
                    course.status === 'published' ? 'bg-success-tint text-success' : 'bg-warning-tint text-warning'
                  }`}>
                    {labelMap(course.status)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
