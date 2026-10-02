import apiClient from './client';

export type LessonType = 'video' | 'text' | 'pdf' | 'quiz' | 'assignment';
export type LessonStatus = 'draft' | 'published' | 'archived';

export interface LessonResponse {
  id: string;
  sectionId: string;
  sectionTitle: string;
  courseId: string;
  courseTitle: string;
  title: string;
  content: string | null;
  lessonType: LessonType;
  videoUrl: string | null;
  isFreePreview: boolean;
  status: LessonStatus;
  displayOrder: number;
  durationMinutes: number;
  createdAt: string;
  updatedAt: string;
  unlocked?: boolean | null;
  mandatoryQuizId?: string | null;
  completed?: boolean | null;
}

export interface LessonPage {
  content: LessonResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface LessonPageParams {
  courseId?: string;
  sectionId?: string;
  status?: LessonStatus;
  search?: string;
  page?: number;
  size?: number;
  sortBy?: 'title' | 'displayOrder' | 'durationMinutes' | 'status' | 'createdAt' | 'updatedAt';
  direction?: 'ASC' | 'DESC';
}

export interface CreateLessonRequest {
  title: string;
  content?: string;
  lessonType: LessonType;
  videoUrl?: string;
  isFreePreview: boolean;
  status: LessonStatus;
  displayOrder: number;
  durationMinutes: number;
}

export interface UpdateLessonRequest extends Partial<CreateLessonRequest> {
  sectionId?: string;
}

export const lessonService = {
  getPage: (params: LessonPageParams) => apiClient.get<LessonPage>('/lessons/page', { params }),
  getById: (id: string) => apiClient.get<LessonResponse>(`/lessons/${id}`),
  getBySection: (sectionId: string) => apiClient.get<LessonResponse[]>(`/sections/${sectionId}/lessons`),
  create: (sectionId: string, payload: CreateLessonRequest) =>
    apiClient.post<LessonResponse>(`/sections/${sectionId}/lessons`, payload),
  update: (id: string, payload: UpdateLessonRequest) =>
    apiClient.put<LessonResponse>(`/lessons/${id}`, payload),
  remove: (id: string) => apiClient.delete(`/lessons/${id}`),
  uploadVideo: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<LessonResponse>(`/lessons/${id}/video`, formData);
  },
  replaceVideo: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.put<LessonResponse>(`/lessons/${id}/video`, formData);
  },
  deleteVideo: (id: string) => apiClient.delete<LessonResponse>(`/lessons/${id}/video`),
};
