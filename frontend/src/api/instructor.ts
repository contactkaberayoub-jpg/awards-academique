import apiClient from './client';
import { adminApi, type CourseResponse, type SectionResponse } from './admin';
import { lessonService, type LessonResponse } from './lessonService';
import type {
  AuthResponse,
  InstructorApplication,
  InstructorRegisterRequest,
  InstructorStatus,
} from '../types';

export interface CourseStat {
  courseId: string;
  courseTitle: string;
  sectionCount: number;
  lessonCount: number;
  publishedLessonCount: number;
  totalDurationMinutes: number;
}

export interface DashboardData {
  totalCourses: number;
  totalSections: number;
  totalLessons: number;
  totalStudents: number;
  publishedCourses: number;
  averageRating: number;
  recentCourses: CourseResponse[];
  recentLessons: LessonResponse[];
  courseStats: CourseStat[];
}

export interface AnalyticsData {
  totalCourses: number;
  totalLessons: number;
  totalStudents: number;
  totalEnrollments: number;
  totalDurationMinutes: number;
  averageRating: number;
  publishedCourses: number;
  coursesByStatus: Record<string, number>;
  lessonsByStatus: Record<string, number>;
  lessonsByType: Record<string, number>;
  courseStats: CourseStat[];
  popularCourses: CourseResponse[];
  coursesWithContent: { course: CourseResponse; stats: CourseStat | null }[];
}

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

export const instructorApi = {
  async getMyCourses(): Promise<CourseResponse[]> {
    return (await adminApi.getMyCourses()).data;
  },

  async getSectionsForCourses(courses: CourseResponse[]): Promise<Record<string, SectionResponse[]>> {
    const entries = await Promise.all(
      courses.map(async (course) => {
        const response = await adminApi.getSectionsByCourse(course.id);
        return [course.id, response.data] as const;
      })
    );
    return Object.fromEntries(entries);
  },

  async getAllLessons(): Promise<LessonResponse[]> {
    const lessons: LessonResponse[] = [];
    let page = 0;
    const size = 100;
    for (;;) {
      const response = await lessonService.getPage({
        page,
        size,
        sortBy: 'createdAt',
        direction: 'DESC',
      });
      lessons.push(...response.data.content);
      if (response.data.last) break;
      page += 1;
    }
    return lessons;
  },

  async getDashboardData(): Promise<DashboardData> {
    const courses = await this.getMyCourses();
    const courseIds = new Set(courses.map((course) => course.id));
    const [sectionMap, allLessons] = await Promise.all([
      this.getSectionsForCourses(courses),
      this.getAllLessons(),
    ]);
    const lessonsByCourse = new Map<string, LessonResponse[]>();
    const myLessons = allLessons.filter((lesson) => courseIds.has(lesson.courseId));
    for (const lesson of myLessons) {
      const bucket = lessonsByCourse.get(lesson.courseId) ?? [];
      bucket.push(lesson);
      lessonsByCourse.set(lesson.courseId, bucket);
    }

    const courseStats = courses.map((course) => {
      const lessons = lessonsByCourse.get(course.id) ?? [];
      return {
        courseId: course.id,
        courseTitle: course.title,
        sectionCount: (sectionMap[course.id] ?? []).length,
        lessonCount: lessons.length,
        publishedLessonCount: lessons.filter((lesson) => lesson.status === 'published').length,
        totalDurationMinutes: sum(lessons.map((lesson) => lesson.durationMinutes)),
      };
    });

    const recentCourses = [...courses]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    const recentLessons = [...myLessons]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      totalCourses: courses.length,
      totalSections: sum(courseStats.map((stats) => stats.sectionCount)),
      totalLessons: myLessons.length,
      totalStudents: sum(courses.map((course) => course.enrollmentsCount ?? 0)),
      publishedCourses: courses.filter((course) => course.status === 'published').length,
      averageRating:
        courses.length === 0
          ? 0
          : sum(courses.map((course) => course.averageRating ?? 0)) / courses.length,
      recentCourses,
      recentLessons,
      courseStats,
    };
  },

  async getAnalyticsData(): Promise<AnalyticsData> {
    const courses = await this.getMyCourses();
    const courseIds = new Set(courses.map((course) => course.id));
    const [sectionMap, allLessons] = await Promise.all([
      this.getSectionsForCourses(courses),
      this.getAllLessons(),
    ]);
    const myLessons = allLessons.filter((lesson) => courseIds.has(lesson.courseId));
    const lessonsByCourse = new Map<string, LessonResponse[]>();
    for (const lesson of myLessons) {
      const bucket = lessonsByCourse.get(lesson.courseId) ?? [];
      bucket.push(lesson);
      lessonsByCourse.set(lesson.courseId, bucket);
    }

    const courseStats = courses.map((course) => {
      const lessons = lessonsByCourse.get(course.id) ?? [];
      return {
        courseId: course.id,
        courseTitle: course.title,
        sectionCount: (sectionMap[course.id] ?? []).length,
        lessonCount: lessons.length,
        publishedLessonCount: lessons.filter((lesson) => lesson.status === 'published').length,
        totalDurationMinutes: sum(lessons.map((lesson) => lesson.durationMinutes)),
      };
    });

    const lessonsByStatus: Record<string, number> = { draft: 0, published: 0, archived: 0 };
    const lessonsByType: Record<string, number> = { video: 0, text: 0, pdf: 0, quiz: 0, assignment: 0 };
    for (const lesson of myLessons) {
      lessonsByStatus[lesson.status] += 1;
      lessonsByType[lesson.lessonType] += 1;
    }

    const coursesByStatus: Record<string, number> = {};
    for (const course of courses) {
      coursesByStatus[course.status] = (coursesByStatus[course.status] ?? 0) + 1;
    }

    const popularCourses = [...courses].sort(
      (a, b) => (b.enrollmentsCount ?? 0) - (a.enrollmentsCount ?? 0)
    );

    return {
      totalCourses: courses.length,
      totalLessons: myLessons.length,
      totalStudents: sum(courses.map((course) => course.enrollmentsCount ?? 0)),
      totalEnrollments: sum(courses.map((course) => course.enrollmentsCount ?? 0)),
      totalDurationMinutes: sum(courseStats.map((stats) => stats.totalDurationMinutes)),
      averageRating:
        courses.length === 0
          ? 0
          : sum(courses.map((course) => course.averageRating ?? 0)) / courses.length,
      publishedCourses: courses.filter((course) => course.status === 'published').length,
      coursesByStatus,
      lessonsByStatus,
      lessonsByType,
      courseStats,
      popularCourses: popularCourses.slice(0, 5),
      coursesWithContent: courses.map((course) => ({
        course,
        stats: courseStats.find((stats) => stats.courseId === course.id) ?? null,
      })),
    };
  },

  register(payload: InstructorRegisterRequest) {
    return apiClient.post<AuthResponse>('/auth/register-instructor', payload);
  },
  getApplication() {
    return apiClient.get<InstructorApplication>('/instructor/application/me');
  },
  updateApplication(payload: Partial<InstructorApplication>) {
    return apiClient.put<InstructorApplication>('/instructor/application/me', payload);
  },
  resubmit() {
    return apiClient.post<InstructorApplication>('/instructor/application/resubmit');
  },
};

export const instructorAdminApi = {
  list(status?: InstructorStatus) {
    return apiClient.get<InstructorApplication[]>('/admin/instructor-applications', {
      params: { status },
    });
  },
  approve(userId: string) {
    return apiClient.patch<InstructorApplication>(
      `/admin/instructor-applications/${userId}/approve`
    );
  },
  reject(userId: string, reason: string) {
    return apiClient.patch<InstructorApplication>(
      `/admin/instructor-applications/${userId}/reject`,
      { reason }
    );
  },
};