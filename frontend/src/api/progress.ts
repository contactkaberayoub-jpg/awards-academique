import apiClient from './client';

export interface CourseProgressResponse {
  courseId: string;
  enrollmentId: string;
  totalLessons: number;
  completedLessons: number;
  totalSteps: number;
  completedSteps: number;
  completionPercentage: number;
  finalQuizConfigured: boolean;
  finalQuizPassed: boolean;
  finalQuizId: string | null;
}

export interface LessonProgressResponse {
  id: string;
  enrollmentId: string;
  userId: string;
  courseId: string;
  lessonId: string;
  sectionId: string;
  lessonTitle: string;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const progressApi = {
  getCourseProgress: (courseId: string) =>
    apiClient.get<CourseProgressResponse>(`/progress/courses/${courseId}`),
  getLessonProgress: (lessonId: string) =>
    apiClient.get<LessonProgressResponse>(`/progress/lessons/${lessonId}`),
  markLessonCompleted: (lessonId: string) =>
    apiClient.post<LessonProgressResponse>(`/progress/lessons/${lessonId}/completed`),
  markLessonStarted: (lessonId: string) =>
    apiClient.post<LessonProgressResponse>(`/progress/lessons/${lessonId}/started`),
};
