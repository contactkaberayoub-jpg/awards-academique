import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  BookCheck,
  BookOpen,
  Clock,
  Flag,
  Layers,
  ListChecks,
  NotebookTabs,
  Plus,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { instructorApi } from '@/api/instructor';
import { fetchInstructorOrders } from '@/api/orders';
import { fetchInstructorReviews, type InstructorReview } from '@/api/reviews';
import { fetchInstructorEarnings } from '@/api/finance';
import { useAuth } from '@/auth/AuthContext';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { QuickActionCard } from '@/components/instructor/QuickActionCard';
import { StatusBadge } from '@/components/instructor/StatusBadge';

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

function TodayLabel() {
  const value = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  return <p className="text-sm text-text-secondary first-letter:uppercase">{value}</p>;
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} étoiles sur 5`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          className={index <= Math.round(value) ? 'h-3.5 w-3.5 fill-warning text-warning' : 'h-3.5 w-3.5 text-border-strong'}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export default function InstructorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const dashboard = useQuery({
    queryKey: ['instructor', 'dashboard'],
    queryFn: () => instructorApi.getDashboardData(),
  });
  const myCourses = useQuery({
    queryKey: ['instructor', 'my-courses'],
    queryFn: () => instructorApi.getMyCourses(),
  });
  const reviews = useQuery({
    queryKey: ['instructor', 'reviews'],
    queryFn: () => fetchInstructorReviews(),
  });
  const orders = useQuery({
    queryKey: ['instructor', 'orders'],
    queryFn: () => fetchInstructorOrders(),
  });
  const earnings = useQuery({
    queryKey: ['instructor', 'earnings'],
    queryFn: () => fetchInstructorEarnings(),
  });

  const data = dashboard.data;
  const isLoading = dashboard.isLoading || myCourses.isLoading;
  const error = dashboard.error;

  const statusCounts = (myCourses.data ?? []).reduce<Record<string, number>>((acc, course) => {
    acc[course.status] = (acc[course.status] ?? 0) + 1;
    return acc;
  }, {});

  const rejectedTitles = (myCourses.data ?? [])
    .filter((course) => course.status === 'rejected')
    .slice(0, 2)
    .map((course) => course.title);

  const unpublishedLessons =
    (data?.courseStats ?? []).reduce((sum, stats) => sum + Math.max(stats.lessonCount - stats.publishedLessonCount, 0), 0) ?? 0;

  const attention: Array<{ key: string; icon: typeof Clock; label: string; to: string }> = [];
  const pendingCount = statusCounts.pending ?? 0;
  if (pendingCount > 0) {
    attention.push({
      key: 'pending',
      icon: Clock,
      label: `${pendingCount} cours en attente d'approbation`,
      to: '/instructor/courses',
    });
  }
  const rejectedCount = statusCounts.rejected ?? 0;
  if (rejectedCount > 0) {
    attention.push({
      key: 'rejected',
      icon: AlertTriangle,
      label: `${rejectedCount} cours rejetés à corriger${rejectedTitles.length ? ` (${rejectedTitles.join(', ')})` : ''}`,
      to: '/instructor/courses',
    });
  }
  if (unpublishedLessons > 0) {
    attention.push({
      key: 'lessons',
      icon: NotebookTabs,
      label: `${unpublishedLessons} leçons encore non publiées`,
      to: '/instructor/lessons',
    });
  }
  if ((reviews.data?.flaggedReviews ?? 0) > 0) {
    attention.push({
      key: 'flagged',
      icon: Flag,
      label: `${reviews.data?.flaggedReviews} avis signalés à examiner`,
      to: '/instructor/reviews',
    });
  }

  const recentCourses = [...(myCourses.data ?? [])]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  const feedItems = (orders.data?.orders ?? [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const visibleReviews = (reviews.data?.reviews ?? [])
    .filter((review) => review.status === 'visible')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  return (
    <div>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            Formateur · Tableau de bord
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">
            Bonjour, {user?.firstName ?? 'Formateur'}
          </h1>
          <p className="mt-1.5 text-base text-text-secondary">
            Voici un aperçu de votre activité pédagogique.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <TodayLabel />
          <Link to="/instructor/courses">
            <Button size="lg">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nouveau cours
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-6">
          <Alert variant="error" title="Impossible de charger votre tableau de bord">
            Veuillez réessayer en actualisant la page.
          </Alert>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          index={0}
          label="Total des cours"
          value={isLoading ? '—' : data?.totalCourses ?? 0}
          icon={BookOpen}
          tone="primary"
          hint="dans votre catalogue"
        />
        <KpiCard
          index={1}
          label="Cours publiés"
          value={isLoading ? '—' : data?.publishedCourses ?? 0}
          icon={BookCheck}
          tone="success"
          hint={`${statusCounts.pending ?? 0} en attente`}
        />
        <KpiCard
          index={2}
          label="Étudiants"
          value={isLoading ? '—' : data?.totalStudents ?? 0}
          icon={Users}
          tone="info"
          hint="inscrits à vos cours"
        />
        <KpiCard
          index={3}
          label="Note moyenne"
          value={isLoading ? '—' : Number((data?.averageRating ?? 0).toFixed(2))}
          icon={Star}
          tone="warning"
          hint={reviews.data?.totalReviews ? `${reviews.data.totalReviews} avis` : 'aucun avis'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card padded={false}>
            <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-text-primary">Vos cours</h2>
                <p className="mt-0.5 text-xs text-text-secondary">Les plus récemment mis à jour</p>
              </div>
              <Link
                to="/instructor/courses"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
              >
                Tout voir
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            {isLoading ? (
              <div className="space-y-4 px-5 py-5 sm:px-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : recentCourses.length === 0 ? (
              <div className="px-5 py-10 text-center sm:px-6">
                <BookOpen className="mx-auto h-8 w-8 text-text-muted/40" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-text-primary">Aucun cours pour le moment</p>
                <p className="mt-1 text-sm text-text-secondary">Créez votre premier cours pour commencer à enseigner.</p>
                <Link to="/instructor/courses" className="mt-4 inline-flex">
                  <Button size="sm">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Créer un cours
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {recentCourses.map((course) => (
                  <li key={course.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/instructor/courses/${course.id}/manage`)}
                      className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-secondary/60 sm:px-6"
                    >
                      <span className="block h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-secondary">
                        {course.thumbnailUrl ? (
                          <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full items-center justify-center">
                            <BookOpen className="h-4 w-4 text-text-muted" aria-hidden="true" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary">{course.title}</span>
                        <span className="mt-1 flex items-center gap-3 text-xs text-text-secondary">
                          <span>{course.enrollmentsCount} étudiant{course.enrollmentsCount > 1 ? 's' : ''}</span>
                          <span>Màj. {formatRelative(course.updatedAt)}</span>
                        </span>
                      </span>
                      <StatusBadge status={course.status} size="sm" />
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padded={false}>
            <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-text-primary">Dernières inscriptions</h2>
                <p className="mt-0.5 text-xs text-text-secondary">Les derniers étudiants inscrits à vos cours</p>
              </div>
              <Link
                to="/instructor/orders"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
              >
                Commandes
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            {orders.isLoading ? (
              <div className="space-y-4 px-5 py-5 sm:px-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : feedItems.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-text-secondary sm:px-6">
                Aucune inscription récente pour l'instant.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {feedItems.map((order) => (
                  <li key={order.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                    <Avatar name={order.studentName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{order.studentName}</p>
                      <p className="truncate text-xs text-text-secondary">
                        {order.status === 'paid' ? "s'est inscrit·e à" : 'paiement en attente pour'}{' '}
                        <span className="font-medium text-text-primary">{order.courseTitle}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-xs font-bold tabular-nums text-text-primary">
                        {new Intl.NumberFormat('fr-FR').format(order.totalAmount)} {order.currency}
                      </span>
                      <p className="mt-0.5 text-2xs text-text-muted">{formatRelative(order.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padded={false}>
            <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-text-primary">Derniers avis</h2>
                <p className="mt-0.5 text-xs text-text-secondary">Ce que vos étudiants disent de vos cours</p>
              </div>
              <Link
                to="/instructor/reviews"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
              >
                Tout voir
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            {reviews.isLoading ? (
              <div className="space-y-4 px-5 py-5 sm:px-6">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : visibleReviews.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-text-secondary sm:px-6">
                Aucun avis pour le moment. Ils apparaîtront ici.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {visibleReviews.map((review: InstructorReview) => (
                  <li key={review.id} className="px-5 py-4 sm:px-6">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar name={review.studentName} size="sm" />
                        <p className="truncate text-sm font-medium text-text-primary">{review.studentName}</p>
                      </div>
                      <span className="shrink-0 text-2xs text-text-muted">{formatRelative(review.createdAt)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Stars value={review.rating} />
                      <span className="truncate text-xs text-text-muted">{review.courseTitle}</span>
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm leading-relaxed text-text-secondary">« {review.comment} »</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <h2 className="text-lg font-bold tracking-tight text-text-primary">Actions rapides</h2>
            <p className="mt-0.5 text-xs text-text-secondary">Développez votre enseignement</p>
            <div className="mt-4 space-y-2.5">
              <QuickActionCard title="Nouveau cours" description="Créer un nouveau cours" icon={Plus} to="/instructor/courses" />
              <QuickActionCard title="Nouvelle section" description="Organiser le curriculum" icon={Layers} to="/instructor/sections" />
              <QuickActionCard title="Nouvelle leçon" description="Ajouter du contenu" icon={NotebookTabs} to="/instructor/lessons" />
              <QuickActionCard title="Nouveau quiz" description="Créer une évaluation" icon={ListChecks} to="/instructor/quizzes" />
            </div>
          </Card>

          <Card padded={false}>
            <div className="flex items-center justify-between px-5 pt-5">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-text-primary">Revenus disponibles</h2>
                <p className="mt-0.5 text-xs text-text-secondary">Solde net par devise (commission incluse)</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-tint text-success">
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            {earnings.isLoading ? (
              <div className="space-y-3 px-5 py-5">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (earnings.data ?? []).length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-text-secondary">
                Aucun revenu pour le moment.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {(earnings.data ?? []).map((entry) => (
                  <li key={entry.currency} className="flex items-center gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                        {entry.currency === 'MAD' ? 'Dirhams' : entry.currency}
                      </p>
                      <p className="text-lg font-bold tabular-nums tracking-tight text-text-primary">
                        {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(entry.availableAmount)}{' '}
                        <span className="text-sm font-semibold text-text-muted">{entry.currency}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-2xs text-text-muted">
                      <p>{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(entry.earningsAmount)} gagnés</p>
                      <p>{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(entry.pendingAmount)} en attente</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-border p-2">
              <Link
                to="/instructor/earnings"
                className="block rounded-lg px-3 py-2 text-center text-xs font-medium text-primary transition-colors hover:bg-primary-tint"
              >
                Gérer mes revenus et retraits
              </Link>
            </div>
          </Card>

          <Card padded={false}>
            <div className="px-5 pt-5">
              <h2 className="text-lg font-bold tracking-tight text-text-primary">À faire</h2>
              <p className="mt-0.5 text-xs text-text-secondary">Ce qui demande votre attention</p>
            </div>
            {isLoading || reviews.isLoading ? (
              <div className="space-y-3 px-5 py-5">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : attention.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-medium text-text-primary">Rien ne presse</p>
                <p className="mt-1 text-xs text-text-secondary">Aucune action ne vous attend aujourd'hui.</p>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {attention.map((item) => (
                  <li key={item.key}>
                    <Link
                      to={item.to}
                      className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-secondary/50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary">
                        <item.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <p className="min-w-0 flex-1 text-sm font-medium text-text-primary">{item.label}</p>
                      <ArrowRight className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}