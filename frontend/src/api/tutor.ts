import apiClient from './client';

export type TutorMessageRole = 'user' | 'assistant';

export interface TutorHistoryMessage {
  role: TutorMessageRole;
  content: string;
}

export interface TutorChatRequest {
  courseId: string;
  lessonId: string;
  message: string;
  history?: TutorHistoryMessage[];
}

export interface TutorChatResponse {
  message: string;
}

export const tutorApi = {
  chat: (payload: TutorChatRequest) =>
    apiClient.post<TutorChatResponse>('/ai/tutor/chat', payload),
};