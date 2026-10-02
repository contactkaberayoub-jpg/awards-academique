import apiClient from './client';

export type EnrollmentStatus = 'active' | 'completed' | 'cancelled' | 'paused';

export interface EnrollmentResponse {
  id: string;
  userId: string;
  studentName: string | null;
  studentEmail: string | null;
  courseId: string;
  courseTitle: string | null;
  courseThumbnailUrl: string | null;
  status: EnrollmentStatus;
  completionPercentage: number | null;
  enrolledAt: string | null;
  lastActivityAt: string | null;
  completedAt: string | null;
}

export const enrollmentsApi = {
  getMyEnrollments: () => apiClient.get<EnrollmentResponse[]>('/enrollments/mine'),
  enroll: (courseId: string) =>
    apiClient.post<EnrollmentResponse>('/enrollments', { courseId }),
};
