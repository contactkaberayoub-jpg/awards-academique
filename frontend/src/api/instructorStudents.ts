import apiClient from './client';

export type EnrollmentStatus = 'active' | 'completed' | 'suspended' | 'cancelled';
export type QuizStatus = 'draft' | 'published' | 'archived';

export interface FinalQuizResult {
  attempted: boolean;
  passed: boolean;
  score: number | null;
  attemptsUsed: number;
}

export interface StudentCertificate {
  certificateCode: string;
  issuedAt: string;
}

export interface CourseFinalQuizInfo {
  id: string;
  title: string;
  passingScore: number;
  maxAttempts: number;
  status: QuizStatus;
}

export interface InstructorStudentSummary {
  enrollmentId: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  enrollmentStatus: EnrollmentStatus;
  completionPercentage: number;
  enrolledAt: string | null;
  completedAt: string | null;
  finalQuiz: FinalQuizResult | null;
  certificate: StudentCertificate | null;
}

export interface InstructorCourseStudentsResponse {
  courseId: string;
  courseTitle: string;
  totalStudents: number;
  finalQuiz: CourseFinalQuizInfo | null;
  students: InstructorStudentSummary[];
}

export interface StudentLessonProgress {
  lessonId: string;
  title: string;
  displayOrder: number;
  completed: boolean;
  locked: boolean;
}

export interface InstructorStudentCourse {
  courseId: string;
  courseTitle: string;
  enrollmentStatus: string;
  completionPercentage: number;
  completedAt: string | null;
  certificate: StudentCertificate | null;
}

export interface StudentFinalQuizDetail {
  id: string;
  title: string;
  passingScore: number;
  maxAttempts: number;
  status: QuizStatus;
  attempted: boolean;
  passed: boolean;
  score: number | null;
  attemptsUsed: number;
}

export interface InstructorCourseStudentDetailResponse {
  userId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  enrollmentId: string;
  enrollmentStatus: EnrollmentStatus;
  completionPercentage: number;
  enrolledAt: string | null;
  completedAt: string | null;
  finalQuiz: StudentFinalQuizDetail | null;
  certificate: StudentCertificate | null;
  lessons: StudentLessonProgress[];
  otherCourses: InstructorStudentCourse[];
}

export const instructorStudentsApi = {
  getCourseStudents: (courseId: string) =>
    apiClient.get<InstructorCourseStudentsResponse>(`/instructor/courses/${courseId}/students`),
  getCourseStudentDetail: (courseId: string, studentId: string) =>
    apiClient.get<InstructorCourseStudentDetailResponse>(`/instructor/courses/${courseId}/students/${studentId}`),
};