import apiClient from './client';
import { adminApi } from './admin';

export type ReviewStatus = 'visible' | 'hidden' | 'flagged';

export interface InstructorReview {
  id: string;
  courseId: string;
  courseTitle: string;
  studentName: string;
  studentEmail: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
}

export interface InstructorReviewsData {
  reviews: InstructorReview[];
  totalReviews: number;
  averageRating: number;
  flaggedReviews: number;
}

export interface ReviewResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
}

export interface ReviewPayload {
  rating?: number;
  comment?: string;
  status?: ReviewStatus;
}

export const reviewApi = {
  getAll: () => apiClient.get<ReviewResponse[]>('/reviews'),
  getByCourse: (courseId: string) =>
    apiClient.get<ReviewResponse[]>(`/reviews/course/${courseId}`),
  getMine: () => apiClient.get<ReviewResponse[]>('/reviews/mine'),
  create: (courseId: string, rating: number, comment?: string) =>
    apiClient.post<ReviewResponse>('/reviews', {
      courseId,
      rating,
      comment: comment?.trim() ? comment : undefined,
    }),
  update: (id: string, payload: ReviewPayload) =>
    apiClient.put<ReviewResponse>(`/reviews/${id}`, payload),
  remove: (id: string) => apiClient.delete(`/reviews/${id}`),
};

export async function fetchInstructorReviews(): Promise<InstructorReviewsData> {
  const courses = await adminApi.getMyCourses();
  const courseIds = courses.data.map((c) => c.id);

  const responses = await Promise.all(
    courseIds.map((id) => apiClient.get<ReviewResponse[]>(`/reviews/course/${id}`)),
  );

  const reviews: InstructorReview[] = responses.flatMap((res) =>
    res.data.map((r) => ({
      id: r.id,
      courseId: r.courseId,
      courseTitle: r.courseTitle,
      studentName: r.userName,
      studentEmail: r.userEmail,
      rating: r.rating,
      comment: r.comment,
      status: r.status as ReviewStatus,
      createdAt: r.createdAt,
    })),
  );

  const visible = reviews.filter((r) => r.status === 'visible');
  const averageRating =
    visible.length === 0
      ? 0
      : Math.round((visible.reduce((sum, r) => sum + r.rating, 0) / visible.length) * 10) / 10;

  return {
    reviews,
    totalReviews: reviews.length,
    averageRating,
    flaggedReviews: reviews.filter((r) => r.status === 'flagged').length,
  };
}
