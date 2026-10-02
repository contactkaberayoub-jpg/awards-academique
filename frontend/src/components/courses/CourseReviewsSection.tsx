import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { reviewApi, type ReviewResponse } from '@/api/reviews';
import { useAuth } from '@/auth/AuthContext';
import { getApiErrorMessage } from '@/lib/apiError';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

interface CourseReviewsSectionProps {
  courseId: string;
  isEnrolled: boolean;
  averageRating: number | null;
  reviewsCount: number;
}

function RatingStars({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'md' | 'lg' }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  const dimension = size === 'lg' ? 'h-7 w-7' : 'h-4 w-4';
  return (
    <div className="flex items-center gap-1" role={onChange ? 'radiogroup' : undefined} aria-label="Note">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          onClick={() => onChange?.(star)}
          aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            className={`${dimension} ${star <= active ? 'fill-[#F5D949] text-[#F5D949]' : 'text-[#DADCE0]'}`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({
  courseId,
  existing,
  onDone,
}: {
  courseId: string;
  existing: ReviewResponse | null;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [feedback, setFeedback] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['reviews', 'course', courseId] });
    queryClient.invalidateQueries({ queryKey: ['reviews', 'mine'] });
    queryClient.invalidateQueries({ queryKey: ['courses', 'detail', courseId] });
  };

  const createMutation = useMutation({
    mutationFn: () => reviewApi.create(courseId, rating, comment),
    onSuccess: () => {
      invalidate();
      onDone();
    },
    onError: (error) => setFeedback(getApiErrorMessage(error, "Impossible d'enregistrer votre avis.")),
  });

  const updateMutation = useMutation({
    mutationFn: () => reviewApi.update(existing!.id, { rating, comment }),
    onSuccess: () => {
      invalidate();
      onDone();
    },
    onError: (error) => setFeedback(getApiErrorMessage(error, "Impossible de modifier votre avis.")),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="rounded-xl border border-[#E5E5E3] bg-[#F7F7F6] p-5 space-y-4">
      {feedback && <p className="text-sm text-[#D93025]">{feedback}</p>}
      <div>
        <p className="mb-2 text-sm font-semibold text-[#202124]">Votre note</p>
        <RatingStars value={rating} onChange={setRating} size="lg" />
      </div>
      <div>
        <label htmlFor="review-comment" className="mb-1.5 block text-sm font-semibold text-[#202124]">
          Votre avis (facultatif)
        </label>
        <textarea
          id="review-comment"
          rows={4}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Partagez votre expérience sur ce cours..."
          className="w-full rounded-lg border border-[#DADCE0] bg-white px-3 py-2 text-sm text-[#202124] outline-none focus:border-[#F4571C] focus:ring-2 focus:ring-[#F4571C]/20"
        />
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onDone} disabled={isPending}>
          Annuler
        </Button>
        <Button
          className="bg-[#F4571C] text-white hover:bg-[#E8531B]"
          loading={isPending}
          onClick={() => (existing ? updateMutation.mutate() : createMutation.mutate())}
        >
          {existing ? 'Modifier mon avis' : 'Publier mon avis'}
        </Button>
      </div>
    </div>
  );
}

export function CourseReviewsSection({
  courseId,
  isEnrolled,
  averageRating,
  reviewsCount,
}: CourseReviewsSectionProps) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reviewsQuery = useQuery({
    queryKey: ['reviews', 'course', courseId],
    queryFn: async () => (await reviewApi.getByCourse(courseId)).data,
    enabled: isAuthenticated && Boolean(courseId),
  });

  const mineQuery = useQuery({
    queryKey: ['reviews', 'mine'],
    queryFn: async () => (await reviewApi.getMine()).data,
    enabled: isAuthenticated && isEnrolled,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['courses', 'detail', courseId] });
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error, 'Impossible de supprimer votre avis.')),
  });

  const reviews = reviewsQuery.data ?? [];
  const myReview = (mineQuery.data ?? []).find((review) => review.courseId === courseId) ?? null;
  const hasRating = averageRating != null && averageRating > 0;

  return (
    <section id="avis" className="space-y-4 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-[#202124]">Avis des étudiants</h2>
        {hasRating && (
          <div className="flex items-center gap-2 text-sm font-bold text-[#202124]">
            <Star className="h-4 w-4 fill-[#F5D949] text-[#F5D949]" />
            <span>{averageRating.toFixed(1).replace('.', ',')}/5</span>
            <span className="font-normal text-[#6B7280]">({reviewsCount} avis)</span>
          </div>
        )}
      </div>

      {errorMessage && <p className="text-sm text-[#D93025]">{errorMessage}</p>}

      {!isAuthenticated ? (
        <div className="rounded-xl border border-[#E5E5E3] bg-white p-6 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-[#9AA0A6]" />
          <p className="mt-3 text-sm text-[#5F6368]">
            Connectez-vous pour consulter et publier des avis sur ce cours.
          </p>
          <Link to={`/login?redirect=${encodeURIComponent(`/courses/${courseId}`)}`} className="mt-4 inline-block">
            <Button className="bg-[#F4571C] text-white hover:bg-[#E8531B]">Se connecter</Button>
          </Link>
        </div>
      ) : (
        <>
          {isEnrolled && (!myReview || isEditing) && (
            <ReviewForm
              courseId={courseId}
              existing={myReview}
              onDone={() => {
                setIsEditing(false);
                setErrorMessage(null);
              }}
            />
          )}

          {isEnrolled && myReview && !isEditing && (
            <div className="rounded-xl border border-[#B9E4C9] bg-[#F2FBF5] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0F5132]">Votre avis</p>
                  <div className="mt-1"><RatingStars value={myReview.rating} /></div>
                  {myReview.comment && <p className="mt-2 text-sm text-[#5F6368]">{myReview.comment}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="rounded-sm p-1.5 text-[#F4571C] hover:bg-[#F4571C]/10"
                    aria-label="Modifier mon avis"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(myReview.id)}
                    disabled={deleteMutation.isPending}
                    className="rounded-sm p-1.5 text-[#D93025] hover:bg-[#D93025]/10 disabled:opacity-50"
                    aria-label="Supprimer mon avis"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {isEnrolled && !myReview && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full rounded-xl border border-dashed border-[#DADCE0] bg-white p-4 text-sm font-semibold text-[#F4571C] hover:border-[#F4571C] hover:bg-[#F4571C]/5"
            >
              + Laisser un avis sur ce cours
            </button>
          )}

          {reviewsQuery.isLoading ? (
            <p className="text-sm text-[#6B7280]">Chargement des avis...</p>
          ) : reviews.length === 0 ? (
            <p className="rounded-xl border border-[#E5E5E3] bg-white p-6 text-center text-sm text-[#6B7280]">
              Aucun avis pour le moment. Soyez le premier à en partager un.
            </p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((review) => (
                <li key={review.id} className="rounded-xl border border-[#E5E5E3] bg-white p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={review.userName || review.userEmail} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#202124]">{review.userName || 'Étudiant'}</p>
                        <RatingStars value={review.rating} />
                      </div>
                      {review.comment && (
                        <p className="mt-2 text-sm leading-relaxed text-[#5F6368]">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
