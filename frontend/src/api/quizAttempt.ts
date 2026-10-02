import apiClient from './client';

export interface StudentOption {
  id: string;
  optionText: string;
  displayOrder: number;
}

export interface StudentQuestion {
  id: string;
  statement: string;
  displayOrder: number;
  options: StudentOption[];
}

export interface StudentQuizContent {
  quizId: string;
  quizTitle: string;
  courseId: string | null;
  lessonId: string | null;
  passingScore: number | null;
  maxAttempts: number | null;
  questions: StudentQuestion[];
}

export interface QuizAttemptSummary {
  id: string;
  userId: string;
  quizId: string;
  quizTitle: string;
  courseId: string | null;
  lessonId: string | null;
  score: number | null;
  passingScore: number | null;
  attemptsUsed: number;
  maxAttempts: number | null;
  passed: boolean;
  status: string;
  answers?: Record<string, unknown>;
}

export interface StartQuizAttempt {
  quizId: string;
  answers?: Record<string, string[]>;
}

export interface SubmitQuizAttempt {
  answers: Record<string, string[]>;
}

/**
 * Student quiz-taking API. All endpoints are available to the authenticated (enrolled) student.
 */
export const quizAttemptApi = {
  /**
   * Full quiz content for the student (questions + options, WITHOUT the answer key).
   */
  getStudentQuizContent: (quizId: string) =>
    apiClient.get<StudentQuizContent>(`/quiz-attempts/quizzes/${quizId}/content`),

  start: (payload: StartQuizAttempt) =>
    apiClient.post<QuizAttemptSummary>('/quiz-attempts', payload),

  submit: (attemptId: string, payload: SubmitQuizAttempt) =>
    apiClient.post<QuizAttemptSummary>(`/quiz-attempts/${attemptId}/submit`, payload),

  getBestForQuiz: (quizId: string) =>
    apiClient.get<QuizAttemptSummary>(`/quiz-attempts/me/quizzes/${quizId}/best`),
};
