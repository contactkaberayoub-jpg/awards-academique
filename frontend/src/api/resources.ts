import apiClient from './client';
import { adminApi } from './admin';

export type LessonResourceType = 'pdf' | 'video' | 'link' | 'file';

export interface InstructorResource {
  id: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  title: string;
  resourceType: LessonResourceType;
  fileUrl: string | null;
  fileSizeBytes: number | null;
  createdAt: string;
}

export interface InstructorResourcesData {
  resources: InstructorResource[];
  totalResources: number;
  videoResources: number;
  pdfResources: number;
}

export interface LessonResourceResponse {
  id: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  title: string;
  resourceType: string;
  fileUrl: string | null;
  fileSizeBytes: number | null;
  createdAt: string;
}

export interface CreateLessonResourcePayload {
  lessonId: string;
  title: string;
  resourceType: LessonResourceType;
  url: string;
}

export interface UpdateLessonResourcePayload {
  title?: string;
  url?: string;
}

export const lessonResourcesApi = {
  getByLesson: (lessonId: string) =>
    apiClient.get<LessonResourceResponse[]>(`/lesson-resources/lesson/${lessonId}`),
  getByCourse: (courseId: string) =>
    apiClient.get<LessonResourceResponse[]>(`/lesson-resources/course/${courseId}`),
  create: (payload: CreateLessonResourcePayload) =>
    apiClient.post<LessonResourceResponse>('/lesson-resources', payload),
  upload: (lessonId: string, title: string, file: File) => {
    const formData = new FormData();
    formData.append('lessonId', lessonId);
    formData.append('title', title);
    formData.append('file', file);
    return apiClient.post<LessonResourceResponse>('/lesson-resources/upload', formData);
  },
  update: (id: string, payload: UpdateLessonResourcePayload) =>
    apiClient.put<LessonResourceResponse>(`/lesson-resources/${id}`, payload),
  remove: (id: string) => apiClient.delete(`/lesson-resources/${id}`),
};

export async function fetchInstructorResources(): Promise<InstructorResourcesData> {
  const courses = await adminApi.getMyCourses();
  const courseIds = courses.data.map((c) => c.id);

  const responses = await Promise.all(
    courseIds.map((id) =>
      apiClient.get<LessonResourceResponse[]>(`/lesson-resources/course/${id}`),
    ),
  );

  const resources: InstructorResource[] = responses.flatMap((res) =>
    res.data.map((r) => ({
      id: r.id,
      lessonId: r.lessonId,
      lessonTitle: r.lessonTitle,
      courseId: r.courseId,
      courseTitle: r.courseTitle,
      title: r.title,
      resourceType: r.resourceType as LessonResourceType,
      fileUrl: r.fileUrl,
      fileSizeBytes: r.fileSizeBytes,
      createdAt: r.createdAt,
    })),
  );

  return {
    resources,
    totalResources: resources.length,
    videoResources: resources.filter((r) => r.resourceType === 'video').length,
    pdfResources: resources.filter((r) => r.resourceType === 'pdf').length,
  };
}
