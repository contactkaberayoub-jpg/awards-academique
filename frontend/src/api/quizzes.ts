import apiClient from './client';
import { adminApi } from './admin';

export type QuizStatus = 'draft' | 'published' | 'archived';

export interface InstructorQuiz {
  id: string;
  courseId: string;
  courseTitle: string;
  lessonId: string | null;
  lessonTitle: string | null;
  title: string;
  status: QuizStatus;
  questionCount: number;
  passingScore: number;
  maxAttempts: number;
  createdAt: string;
}

export interface InstructorQuizzesData {
  quizzes: InstructorQuiz[];
  totalQuizzes: number;
  publishedQuizzes: number;
  draftQuizzes: number;
}

export interface QuizQuestionOption {
  id?: string;
  optionText: string;
  isCorrect: boolean;
  displayOrder: number;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  statement: string;
  explanation: string | null;
  displayOrder: number;
  options: QuizQuestionOption[];
}

export interface CreateQuizPayload {
  courseId: string;
  lessonId?: string | null;
  title: string;
  passingScore?: number;
  maxAttempts?: number;
  status?: QuizStatus;
}

export interface UpdateQuizPayload {
  title?: string;
  lessonId?: string | null;
  passingScore?: number;
  maxAttempts?: number;
  status?: QuizStatus;
}

interface QuizResponse {
  id: string;
  courseId: string;
  courseTitle: string;
  lessonId: string | null;
  lessonTitle: string | null;
  title: string;
  status: string;
  passingScore: number | null;
  maxAttempts: number | null;
  questionCount: number;
  createdAt: string;
}

interface QuestionResponse {
  id: string;
  quizId: string;
  statement: string;
  explanation: string | null;
  displayOrder: number;
  options: QuizQuestionOption[];
}

/**
 * @deprecated Narrow the list by course id when possible.
 */
export async function fetchInstructorQuizzes(courseId?: string): Promise<InstructorQuizzesData> {
  const courses = await adminApi.getMyCourses();
  const targetCourses = courseId ? courses.data.filter((c) => c.id === courseId) : courses.data;

  const responses = await Promise.all(
    targetCourses.map((course) => apiClient.get<QuizResponse[]>(`/quizzes/course/${course.id}`)),
  );

  const quizzes: InstructorQuiz[] = responses.flatMap((res) =>
    res.data.map((q) => ({
      id: q.id,
      courseId: q.courseId,
      courseTitle: q.courseTitle,
      lessonId: q.lessonId,
      lessonTitle: q.lessonTitle,
      title: q.title,
      status: q.status as QuizStatus,
      questionCount: q.questionCount,
      passingScore: q.passingScore ?? 70,
      maxAttempts: q.maxAttempts ?? 3,
      createdAt: q.createdAt,
    })),
  );

  return {
    quizzes,
    totalQuizzes: quizzes.length,
    publishedQuizzes: quizzes.filter((q) => q.status === 'published').length,
    draftQuizzes: quizzes.filter((q) => q.status === 'draft').length,
  };
}

export async function fetchQuizById(quizId: string): Promise<InstructorQuiz> {
  const response = await apiClient.get<QuizResponse>(`/quizzes/${quizId}`);
  const q = response.data;
  return {
    id: q.id,
    courseId: q.courseId,
    courseTitle: q.courseTitle,
    lessonId: q.lessonId,
    lessonTitle: q.lessonTitle,
    title: q.title,
    status: q.status as QuizStatus,
    questionCount: q.questionCount,
    passingScore: q.passingScore ?? 70,
    maxAttempts: q.maxAttempts ?? 3,
    createdAt: q.createdAt,
  };
}

export async function createQuiz(payload: CreateQuizPayload): Promise<InstructorQuiz> {
  const response = await apiClient.post<QuizResponse>('/quizzes', payload);
  const q = response.data;
  return {
    id: q.id,
    courseId: q.courseId,
    courseTitle: q.courseTitle,
    lessonId: q.lessonId,
    lessonTitle: q.lessonTitle,
    title: q.title,
    status: q.status as QuizStatus,
    questionCount: q.questionCount,
    passingScore: q.passingScore ?? 70,
    maxAttempts: q.maxAttempts ?? 3,
    createdAt: q.createdAt,
  };
}

export async function updateQuiz(quizId: string, payload: UpdateQuizPayload): Promise<InstructorQuiz> {
  const response = await apiClient.put<QuizResponse>(`/quizzes/${quizId}`, payload);
  const q = response.data;
  return {
    id: q.id,
    courseId: q.courseId,
    courseTitle: q.courseTitle,
    lessonId: q.lessonId,
    lessonTitle: q.lessonTitle,
    title: q.title,
    status: q.status as QuizStatus,
    questionCount: q.questionCount,
    passingScore: q.passingScore ?? 70,
    maxAttempts: q.maxAttempts ?? 3,
    createdAt: q.createdAt,
  };
}

export async function deleteQuiz(quizId: string): Promise<void> {
  await apiClient.delete(`/quizzes/${quizId}`);
}

export async function fetchQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
  const response = await apiClient.get<QuestionResponse[]>(`/questions/quiz/${quizId}`);
  return response.data.map((question) => ({
    id: question.id,
    quizId: question.quizId,
    statement: question.statement,
    explanation: question.explanation,
    displayOrder: question.displayOrder,
    options: question.options.map((option) => ({ ...option })),
  }));
}

export interface CreateQuestionPayload {
  statement: string;
  explanation?: string | null;
  displayOrder?: number;
  options: { optionText: string; isCorrect: boolean; displayOrder?: number }[];
}

export interface UpdateQuestionPayload {
  statement?: string;
  explanation?: string | null;
  displayOrder?: number;
  options?: { optionText: string; isCorrect: boolean; displayOrder?: number }[];
}

export async function createQuestion(quizId: string, payload: CreateQuestionPayload): Promise<QuizQuestion> {
  const response = await apiClient.post<QuestionResponse>(`/questions/quiz/${quizId}`, payload);
  return response.data;
}

export async function updateQuestion(questionId: string, payload: UpdateQuestionPayload): Promise<QuizQuestion> {
  const response = await apiClient.put<QuestionResponse>(`/questions/${questionId}`, payload);
  return response.data;
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await apiClient.delete(`/questions/${questionId}`);
}
