import { BookOpen, TrendingUp, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { instructorApi, type DashboardData } from '@/api/instructor';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState } from '@/components/admin/EmptyState';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/instructor/StatCard';
import { getApiErrorMessage } from '@/lib/apiError';

export default function InstructorStudentsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      setData(await instructorApi.getDashboardData());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger vos étudiants.'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const coursesByStudents = useMemo(() => {
    if (!data) return [];
    return data.recentCourses
      .map((course) => ({
        ...course,
        lessonCount: data.courseStats.find((stats) => stats.courseId === course.id)?.lessonCount ?? 0,
      }))
      .sort((a, b) => (b.enrollmentsCount ?? 0) - (a.enrollmentsCount ?? 0));
  }, [data]);

  if (isLoading) {
    return <Loading label="Chargement de vos étudiants..." />;
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader title="Étudiants" description="Aperçu des étudiants inscrits à vos cours." />
        <Notice type="error" message={errorMessage} />
      </div>
    );
  }

  const hasEnrollments = (data?.totalStudents ?? 0) > 0;

  return (
    <div>
      <PageHeader title="Étudiants" description="Découvrez qui apprend dans vos cours." />

      {data && data.totalCourses === 0 ? (
        <EmptyState title="Aucun étudiant pour le moment" description="Créez un cours et commencez à enseigner pour attirer vos premiers étudiants." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Étudiants au total" value={data?.totalStudents ?? 0} icon={Users} color="blue" hint="Sur tous les cours" />
            <StatCard
              label="Moyenne par cours"
              value={data && data.totalCourses > 0 ? Math.round((data.totalStudents ?? 0) / data.totalCourses) : 0}
              icon={TrendingUp}
              color="green"
              hint="Étudiants par cours"
            />
            <StatCard label="Cours" value={data?.totalCourses ?? 0} icon={BookOpen} color="violet" hint="Cours que vous enseignez" />
            <StatCard
              label="Meilleur cours"
              value={coursesByStudents[0]?.enrollmentsCount ?? 0}
              icon={Users}
              color="amber"
              hint={coursesByStudents[0] ? `dans « ${coursesByStudents[0].title} »` : 'Aucune inscription pour le moment'}
            />
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold text-text-primary">Étudiants par cours</h2>
            </div>
            {!hasEnrollments ? (
              <div className="px-5 py-8 text-center text-sm text-text-secondary">
                Vous n'avez pas encore d'étudiant inscrit.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {coursesByStudents.map((course) => {
                  const maxStudents = Math.max(...coursesByStudents.map((item) => item.enrollmentsCount ?? 0), 1);
                  const width = Math.round(((course.enrollmentsCount ?? 0) / maxStudents) * 100);
                  return (
                    <li key={course.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="w-12 shrink-0 text-right text-sm font-semibold text-text-primary">
                        {course.enrollmentsCount ?? 0}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">{course.title}</p>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(width, 4)}%` }} />
                        </div>
                      </div>
                      <span className="hidden shrink-0 text-xs text-text-secondary sm:block">{course.lessonCount} leçons</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="mt-4 text-xs text-text-muted">
            Les données d'inscription reflètent les compteurs renvoyés par l'API des cours.
          </p>
        </>
      )}
    </div>
  );
}
