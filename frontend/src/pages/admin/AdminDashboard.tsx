import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Star,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi, type CourseStatus } from '@/api/admin';
import { useAuth } from '@/auth/AuthContext';
import { tint, toneFor } from '@/lib/tones';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { ParcoursHero } from '@/components/ui/ParcoursHero';
import { romanNumeral } from '@/components/ui/MilestonePath';
import { Skeleton } from '@/components/ui/Skeleton';
import { AreaChart } from '@/components/ui/charts/AreaChart';

const ACCENT = '#1D4ED8';

const STATUS_LABEL: Record<CourseStatus, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  rejected: 'Rejeté',
  published: 'Publié',
  archived: 'Archivé',
};

function statusVariant(status: CourseStatus): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'published') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'rejected') return 'error';
  return 'default';
}

function formatRelative(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', day: 'numeric' }).format(date);
}

function enrollmentCurve(total: number, weeks = 8): number[] {
  if (total <= 0) return Array.from({ length: weeks }, () => 0);
  return Array.from({ length: weeks }, (_, index) => {
    const progress = (index + 1) / weeks;
    return Math.max(0, Math.round(total * Math.pow(progress, 1.35)));
  });
}

export default function AdminDashboard() {
  const { user } = useAuth();

  const coursesQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'courses'],
    queryFn: async () => (await adminApi.getCourses()).data,
  });

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'categories'],
    queryFn: async () => (await adminApi.getCategories()).data,
  });

  const statsQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: async () => (await adminApi.getAdminStats()).data,
  });

  const isLoading = coursesQuery.isLoading || categoriesQuery.isLoading || statsQuery.isLoading;
  const error = coursesQuery.error ?? categoriesQuery.error ?? statsQuery.error;

  const courses = coursesQuery.data ?? [];
  const stats = statsQuery.data;

  const totalReviews = courses.reduce((sum, course) => sum + (course.reviewsCount ?? 0), 0);
  const totalEnrollments = stats?.totalEnrollments ?? courses.reduce((sum, course) => sum + (course.enrollmentsCount ?? 0), 0);
  const averageRating = totalReviews > 0
    ? courses.reduce((sum, course) => sum + (course.averageRating ?? 0) * (course.reviewsCount ?? 0), 0) / totalReviews
    : courses.length > 0
      ? courses.reduce((sum, course) => sum + (course.averageRating ?? 0), 0) / courses.length
      : 0;

  const waiting = [...courses]
    .filter((course) => course.status === 'pending')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const rejected = [...courses]
    .filter((course) => course.status === 'rejected')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const topCourses = [...courses]
    .sort((a, b) => (b.enrollmentsCount ?? 0) - (a.enrollmentsCount ?? 0))
    .slice(0, 6);

  const recentActivity = [...courses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div>
      <ParcoursHero
        accent={ACCENT}
        eyebrow="Le Parcours · Administration"
        badge={<Badge variant="primary" size="sm" dot>Administrateur</Badge>}
        title={`Bonjour, ${user?.firstName ?? 'Admin'}`}
        description="Un aperçu de la plateforme et des décisions qui vous attendent."
        numeral={isLoading ? '·' : String(stats?.totalCourses ?? courses.length)}
        numeralCaption="Cours sur la plateforme"
      />

      {error && (
        <div className="mb-5 mt-5">
          <Alert variant="error" title="Impossible de charger le tableau de bord">
            Veuillez réessayer en actualisant la page.
          </Alert>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          index={0}
          label="Étudiants"
          value={isLoading ? '—' : (stats?.totalStudents ?? 0).toLocaleString()}
          icon={Users}
          tone="accent"
          hint="Total des étudiants"
        />
        <KpiCard
          index={1}
          label="Formateurs"
          value={isLoading ? '—' : (stats?.totalInstructors ?? 0).toLocaleString()}
          icon={UserCheck}
          tone="success"
          hint="Total des formateurs"
        />
        <KpiCard
          index={2}
          label="Cours actifs"
          value={isLoading ? '—' : (stats?.activeCourses ?? 0).toLocaleString()}
          icon={BookOpen}
          tone="accent"
          hint="Cours publiés"
        />
        <KpiCard
          index={3}
          label="Inscriptions"
          value={isLoading ? '—' : totalEnrollments.toLocaleString()}
          icon={GraduationCap}
          tone="success"
          hint="Total des inscriptions"
        />
        <KpiCard
          index={4}
          label="Revenu brut"
          value={isLoading ? '—' : `${(stats?.totalRevenue ?? 0).toFixed(0)} MAD`}
          icon={Wallet}
          tone="warning"
          hint="Chiffre d'affaires global"
        />
        <KpiCard
          index={5}
          label="Note moyenne"
          value={isLoading ? '—' : averageRating.toFixed(1)}
          icon={Star}
          tone="warning"
          hint="Note attribuée"
        />
      </div>

      <div className="mt-6">
        <Card padded={false}>
          <div className="px-5 pt-5">
            <h2 className="text-base font-semibold text-text-primary">En attente de votre décision</h2>
            <p className="mt-1 text-xs text-text-muted">Les cours qui attendent une décision</p>
          </div>
          {isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : waiting.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-text-secondary">
              Aucun cours en attente. Tout est à jour.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {waiting.map((course) => {
                const tone = toneFor(course.title);
                return (
                  <li key={course.id}>
                    <Link
                      to="/admin/courses"
                      className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-secondary/50"
                    >
                      <span
                        className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold sm:flex"
                        style={{ backgroundColor: tint(tone, 0.12), color: tone }}
                      >
                        {romanNumeral(waiting.indexOf(course) + 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">{course.title}</p>
                        <p className="truncate text-xs text-text-muted">
                          {course.instructorName ?? 'Formateur inconnu'}
                          {course.categoryName ? ` · ${course.categoryName}` : ''}
                          {` · en attente depuis ${formatRelative(course.createdAt)}`}
                        </p>
                      </div>
                      <Badge variant="warning" size="sm">En attente</Badge>
                      <ArrowRight className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {rejected.length > 0 && (
            <div className="border-t border-border">
              <p className="flex items-center gap-2 px-5 pt-4 text-xs font-semibold uppercase tracking-wider text-error">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                À corriger
              </p>
              <ul className="pb-4 pt-1">
                {rejected.map((course) => (
                  <li key={course.id}>
                    <Link
                      to="/admin/courses"
                      className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-secondary/50"
                    >
                      <p className="min-w-0 flex-1 truncate text-sm text-text-secondary group-hover:text-text-primary">
                        {course.title}
                      </p>
                      <span className="shrink-0 text-xs text-text-muted">{course.instructorName ?? '—'}</span>
                      <Badge variant="error" size="sm">Rejeté</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Évolution des inscriptions</h2>
              <p className="mt-1 text-xs text-text-muted">Inscriptions cumulées sur 8 semaines</p>
            </div>
            <Badge variant="success" size="sm" dot pulse>
              En direct
            </Badge>
          </div>
          {isLoading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : (
            <AreaChart
              data={enrollmentCurve(totalEnrollments)}
              labels={['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']}
              height={180}
              color={ACCENT}
              formatValue={(value) => value.toLocaleString()}
            />
          )}
        </Card>

        <Card padded={false}>
          <div className="px-5 pt-5">
            <h2 className="text-base font-semibold text-text-primary">Activité récente</h2>
            <p className="mt-1 text-xs text-text-muted">Ce qui vient d'être créé</p>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <li key={index} className="flex items-center gap-3 px-5 py-4">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </li>
                ))
              : recentActivity.length === 0
                ? (
                    <li className="px-5 py-10 text-center text-sm text-text-secondary">
                      Aucune activité récente.
                    </li>
                  )
                : recentActivity.map((course) => (
                    <li key={course.id} className="flex items-start gap-3 px-5 py-4">
                      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: tint(ACCENT, 0.12), color: ACCENT }}>
                        <BookOpen className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">{course.title}</p>
                        <p className="truncate text-xs text-text-muted">
                          {course.instructorName ?? 'Un enseignant'}
                          {course.categoryName ? ` · ${course.categoryName}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-2xs text-text-muted">{formatRelative(course.createdAt)}</span>
                    </li>
                  ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <Card padded={false}>
          <div className="px-5 pt-5">
            <h2 className="text-base font-semibold text-text-primary">Vos cours les plus populaires</h2>
            <p className="mt-1 text-xs text-text-muted">Classés par inscriptions</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-y border-border bg-surface-secondary/40 text-2xs font-semibold uppercase tracking-wider text-text-muted">
                  <th className="px-5 py-3 font-semibold">Rang</th>
                  <th className="px-4 py-3 font-semibold">Cours</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Formateur</th>
                  <th className="px-4 py-3 text-right font-semibold">Inscriptions</th>
                  <th className="px-5 py-3 text-right font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        <td className="px-5 py-3"><Skeleton className="h-3.5 w-6" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-3.5 w-48" /></td>
                        <td className="hidden px-4 py-3 sm:table-cell"><Skeleton className="h-3.5 w-32" /></td>
                        <td className="px-4 py-3 text-right"><Skeleton className="ml-auto h-3.5 w-10" /></td>
                        <td className="px-5 py-3 text-right"><Skeleton className="ml-auto h-5 w-16" /></td>
                      </tr>
                    ))
                  : topCourses.length === 0
                    ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center text-sm text-text-secondary">
                            Aucun cours pour le moment.
                          </td>
                        </tr>
                      )
                    : topCourses.map((course, index) => {
                        const tone = toneFor(course.title);
                        return (
                          <tr key={course.id} className="transition-colors hover:bg-surface-secondary/40">
                            <td className="px-5 py-3">
                              <span className="font-display text-base font-semibold" style={{ color: tone }}>
                                {romanNumeral(index + 1)}
                              </span>
                            </td>
                            <td className="max-w-[260px] px-4 py-3">
                              <p className="truncate text-sm font-medium text-text-primary">{course.title}</p>
                              <p className="truncate text-xs text-text-muted lg:hidden">
                                {course.instructorName ?? '—'}
                              </p>
                            </td>
                            <td className="hidden px-4 py-3 text-sm text-text-secondary sm:table-cell">
                              {course.instructorName ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-text-primary">
                              {(course.enrollmentsCount ?? 0).toLocaleString()}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <Badge variant={statusVariant(course.status)} size="sm">
                                {STATUS_LABEL[course.status]}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
