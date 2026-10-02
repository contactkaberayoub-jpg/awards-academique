import { Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { reviewApi, type ReviewResponse, type ReviewStatus } from '@/api/reviews';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DeleteModal } from '@/components/admin/DeleteModal';
import { EmptyState } from '@/components/admin/EmptyState';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatDate } from '@/lib/formatDate';

function reviewBadgeVariant(status: ReviewStatus) {
  switch (status) {
    case 'visible':
      return 'success';
    case 'flagged':
      return 'error';
    default:
      return 'default';
  }
}

function reviewStatusLabel(status: ReviewStatus) {
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

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewResponse[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReviewResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await reviewApi.getAll();
      setReviews(response.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger les avis.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function changeStatus(review: ReviewResponse, status: ReviewStatus) {
    setUpdatingId(review.id);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await reviewApi.update(review.id, { status });
      setSuccessMessage(`Avis de ${review.userName || 'l\'étudiant'} ${status === 'visible' ? 'affiché' : status === 'flagged' ? 'signalé' : 'masqué'}.`);
      await loadData();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de modifier le statut de cet avis.'));
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteReview() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await reviewApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessMessage('Avis supprimé avec succès.');
      await loadData();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de supprimer cet avis.'));
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<ReviewResponse>[] = [
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
          <p className="text-text-primary">{review.userName}</p>
          <p className="text-xs text-text-secondary">{review.userEmail}</p>
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
      render: (review) => (
        <span className="block max-w-xs truncate text-text-secondary" title={review.comment ?? ''}>
          {review.comment ?? '—'}
        </span>
      ),
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
      header: 'Publié le',
      render: (review) => <span className="text-text-secondary">{formatDate(review.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Modération',
      className: 'w-48',
      render: (review) => (
        <div className="flex items-center gap-1">
          {review.status !== 'visible' && (
            <button
              type="button"
              disabled={updatingId === review.id}
              onClick={() => void changeStatus(review, 'visible')}
              className="rounded-sm px-2 py-1 text-xs font-medium text-success hover:bg-success-tint disabled:opacity-50"
            >
              Afficher
            </button>
          )}
          {review.status !== 'flagged' && (
            <button
              type="button"
              disabled={updatingId === review.id}
              onClick={() => void changeStatus(review, 'flagged')}
              className="rounded-sm px-2 py-1 text-xs font-medium text-warning hover:bg-warning-tint disabled:opacity-50"
            >
              Signaler
            </button>
          )}
          {review.status !== 'hidden' && (
            <button
              type="button"
              disabled={updatingId === review.id}
              onClick={() => void changeStatus(review, 'hidden')}
              className="rounded-sm px-2 py-1 text-xs font-medium text-text-secondary hover:bg-surface-tertiary disabled:opacity-50"
            >
              Masquer
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeleteTarget(review)}
            className="rounded-sm px-2 py-1 text-xs font-medium text-error hover:bg-error-tint"
          >
            Supprimer
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <Loading label="Chargement des avis..." />;
  }

  return (
    <div>
      <PageHeader
        title="Avis"
        description="Modérez les avis publiés sur les cours : afficher, signaler, masquer ou supprimer."
      />
      <Notice type="success" message={successMessage} />
      <Notice type="error" message={errorMessage} />

      {!reviews || reviews.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Aucun avis pour le moment" description="Les avis laissés par les étudiants apparaîtront ici." />
        </div>
      ) : (
        <div className="mt-6">
          <DataTable columns={columns} data={reviews} getRowKey={(review) => review.id} />
        </div>
      )}

      {deleteTarget && (
        <DeleteModal
          itemName={`l'avis de ${deleteTarget.userName || 'l\'étudiant'} sur ${deleteTarget.courseTitle}`}
          isDeleting={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void deleteReview()}
        />
      )}
    </div>
  );
}