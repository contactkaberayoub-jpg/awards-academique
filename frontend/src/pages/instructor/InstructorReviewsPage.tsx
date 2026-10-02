import { Star, MessageSquareText, Flag } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { fetchInstructorReviews, type InstructorReview, type InstructorReviewsData } from '@/api/reviews';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { EmptyState } from '@/components/admin/EmptyState';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/instructor/StatCard';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/formatDate';

function reviewBadgeVariant(status: InstructorReview['status']) {
  switch (status) {
    case 'visible':
      return 'success';
    case 'flagged':
      return 'error';
    default:
      return 'default';
  }
}

function reviewStatusLabel(status: InstructorReview['status']) {
  switch (status) {
    case 'visible':
      return 'Visible';
    case 'flagged':
      return 'Signalé';
    default:
      return 'Masqué';
  }
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-warning" aria-label={`${rating} sur 5 étoiles`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className={`h-3.5 w-3.5 ${index < rating ? 'fill-current' : 'opacity-30'}`} />
      ))}
    </span>
  );
}

const columns: DataTableColumn<InstructorReview>[] = [
  {
    key: 'course',
    header: 'Cours',
    render: (review) => <span className="font-medium text-text-primary">{review.courseTitle}</span>,
  },
  {
    key: 'student',
    header: 'Étudiant',
    render: (review) => (
      <div>
        <p className="text-text-primary">{review.studentName}</p>
        <p className="text-xs text-text-secondary">{review.studentEmail}</p>
      </div>
    ),
  },
  {
    key: 'rating',
    header: 'Note',
    render: (review) => <Stars rating={review.rating} />,
  },
  {
    key: 'comment',
    header: 'Commentaire',
    render: (review) => <span className="text-text-secondary">{review.comment ?? '—'}</span>,
  },
  {
    key: 'status',
    header: 'Statut',
    render: (review) => (
      <Badge variant={reviewBadgeVariant(review.status)} size="sm">
        {reviewStatusLabel(review.status)}
      </Badge>
    ),
  },
  {
    key: 'createdAt',
    header: 'Date',
    render: (review) => <span className="text-text-secondary">{formatDate(review.createdAt)}</span>,
  },
];

export default function InstructorReviewsPage() {
  const [data, setData] = useState<InstructorReviewsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      setData(await fetchInstructorReviews());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger vos avis.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (isLoading) {
    return <Loading label="Chargement de vos avis..." />;
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader title="Avis" description="Découvrez ce que pensent vos étudiants de vos cours." />
        <Notice type="error" message={errorMessage} />
      </div>
    );
  }

  const reviews = data?.reviews ?? [];
  const hasReviews = reviews.length > 0;

  return (
    <div>
      <PageHeader title="Avis" description="Retours des étudiants sur l'ensemble de vos cours." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Avis au total" value={data?.totalReviews ?? 0} icon={MessageSquareText} color="blue" hint="Toutes les soumissions" />
        <StatCard label="Note moyenne" value={data?.averageRating ?? 0} icon={Star} color="amber" hint="Avis visibles uniquement" />
        <StatCard label="Signalés" value={data?.flaggedReviews ?? 0} icon={Flag} color="red" hint="À examiner" />
      </div>

      {!hasReviews ? (
        <div className="mt-6">
          <EmptyState title="Aucun avis pour le moment" description="Les avis apparaîtront ici dès que vos étudiants auront laissé un retour." />
        </div>
      ) : (
        <div className="mt-6">
          <DataTable columns={columns} data={reviews} getRowKey={(review) => review.id} />
        </div>
      )}
    </div>
  );
}
