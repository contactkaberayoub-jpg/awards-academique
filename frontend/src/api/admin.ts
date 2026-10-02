import apiClient from './client';

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
export type CourseStatus = 'draft' | 'pending' | 'rejected' | 'published' | 'archived';
export type Currency = 'MAD' | 'EUR' | 'USD';
export type EnrollmentStatus = 'active' | 'completed' | 'cancelled' | 'paused';
export type InstructorStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface AdminInstructorResponse {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  status: InstructorStatus;
  professionalTitle: string | null;
  institution: string | null;
  courseCount: number;
  totalStudents: number;
  totalRevenue: number;
  createdAt: string | null;
  submittedAt: string | null;
}

export interface AdminInstructorDetailResponse extends AdminInstructorResponse {
  bio: string | null;
  rejectionReason: string | null;
  expertise: string | null;
  linkedinUrl: string | null;
  reviewedAt: string | null;
}

export interface AdminStatsResponse {
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  activeCourses: number;
  pendingCourses: number;
  pendingInstructorApplications: number;
  totalEnrollments: number;
  totalRevenue: number;
}

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

export interface RevenueSummary {
  currency: string;
  totalCount: number;
  totalAmount: number;
  paidCount: number;
  paidAmount: number;
  pendingCount: number;
  failedCount: number;
}

export interface AdminInstructorEarnings {
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  currency: string;
  grossRevenue: number;
  orderCount: number;
  earningsAmount: number;
  paidOutAmount: number;
  pendingAmount: number;
  availableAmount: number;
}

export interface CategoryResponse {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  iconUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface CreateCategoryRequest {
  parentId?: string;
  name: string;
  slug?: string;
  iconUrl?: string;
  displayOrder?: number;
}

export interface UpdateCategoryRequest {
  parentId?: string;
  clearParent?: boolean;
  name?: string;
  slug?: string;
  iconUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CourseResponse {
  id: string;
  instructorId: string;
  instructorName: string | null;
  categoryId: string;
  categoryName: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  learningObjectives: string[];
  level: CourseLevel;
  status: CourseStatus;
  isFree: boolean;
  price: number;
  discountPrice?: number | null;
  currency: Currency;
  thumbnailUrl: string | null;
  logoUrl: string | null;
  promoVideoUrl: string | null;
  durationMinutes: number;
  averageRating: number | null;
  reviewsCount: number;
  enrollmentsCount: number;
  publishedAt: string | null;
  published: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseRequest {
  categoryId: string;
  title: string;
  subtitle?: string;
  description?: string;
  learningObjectives?: string[];
  level: CourseLevel;
  isFree: boolean;
  price?: number;
  currency: Currency;
  thumbnailUrl?: string;
  logoUrl?: string;
  promoVideoUrl?: string;
  durationMinutes: number;
}

export interface UpdateCourseRequest {
  categoryId?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  learningObjectives?: string[];
  level?: CourseLevel;
  isFree?: boolean;
  price?: number;
  currency?: Currency;
  thumbnailUrl?: string;
  logoUrl?: string;
  promoVideoUrl?: string;
  durationMinutes?: number;
  isActive?: boolean;
}

export interface SectionResponse {
  id: string;
  courseId: string;
  title: string;
  displayOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSectionRequest {
  courseId: string;
  title: string;
  displayOrder?: number;
}

export interface UpdateSectionRequest {
  title?: string;
  displayOrder?: number;
}

export const adminApi = {
  getCategories: () => apiClient.get<CategoryResponse[]>('/categories'),
  getCategoryById: (id: string) => apiClient.get<CategoryResponse>(`/categories/${id}`),
  getRootCategories: () => apiClient.get<CategoryResponse[]>('/categories/roots'),
  getSubcategories: (parentId: string) =>
    apiClient.get<CategoryResponse[]>(`/categories/${parentId}/subcategories`),
  createCategory: (payload: CreateCategoryRequest) =>
    apiClient.post<CategoryResponse>('/categories', payload),
  updateCategory: (id: string, payload: UpdateCategoryRequest) =>
    apiClient.put<CategoryResponse>(`/categories/${id}`, payload),
  activateCategory: (id: string) =>
    apiClient.put<CategoryResponse>(`/categories/${id}`, { isActive: true }),
  deactivateCategory: (id: string) =>
    apiClient.put<CategoryResponse>(`/categories/${id}`, { isActive: false }),
  deleteCategory: (id: string) => apiClient.delete(`/categories/${id}`),

  getCourses: () => apiClient.get<CourseResponse[]>('/courses'),
  getMyCourses: () => apiClient.get<CourseResponse[]>('/courses/mine'),
  getPublishedCourses: () => apiClient.get<CourseResponse[]>('/courses/published'),
  getCourseById: (id: string) => apiClient.get<CourseResponse>(`/courses/${id}`),
  searchCourses: (params: {
    title?: string;
    categoryId?: string;
    level?: string;
    minPrice?: number;
    maxPrice?: number;
    isFree?: boolean;
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: string;
  }) => apiClient.get<{ content: CourseResponse[]; totalElements: number; totalPages: number; number: number; size: number }>('/courses/search', { params }),
  createCourse: (payload: CreateCourseRequest) =>
    apiClient.post<CourseResponse>('/courses', payload),
  updateCourse: (id: string, payload: UpdateCourseRequest) =>
    apiClient.put<CourseResponse>(`/courses/${id}`, payload),
  publishCourse: (id: string) => apiClient.post<CourseResponse>(`/courses/${id}/publish`),
  rejectCourse: (id: string) => apiClient.post<CourseResponse>(`/courses/${id}/reject`),
  archiveCourse: (id: string) => apiClient.post<CourseResponse>(`/courses/${id}/archive`),
  restoreCourse: (id: string) => apiClient.post<CourseResponse>(`/courses/${id}/restore`),
  deleteCourse: (id: string) => apiClient.delete(`/courses/${id}`),

  getSectionsByCourse: (courseId: string) =>
    apiClient.get<SectionResponse[]>(`/sections/course/${courseId}`),
  createSection: (payload: CreateSectionRequest) =>
    apiClient.post<SectionResponse>('/sections', payload),
  updateSection: (id: string, payload: UpdateSectionRequest) =>
    apiClient.put<SectionResponse>(`/sections/${id}`, payload),
  deleteSection: (id: string) => apiClient.delete(`/sections/${id}`),

  getAllEnrollments: () => apiClient.get<EnrollmentResponse[]>('/enrollments'),
  getAdminRevenue: () => apiClient.get<RevenueSummary[]>('/admin/revenue'),
  getAdminInstructorEarnings: () => apiClient.get<AdminInstructorEarnings[]>('/admin/instructor-earnings'),
  getInstructors: (status?: string, q?: string) =>
    apiClient.get<AdminInstructorResponse[]>('/admin/instructors', { params: { status, q } }),
  getInstructorById: (id: string) =>
    apiClient.get<AdminInstructorDetailResponse>(`/admin/instructors/${id}`),
  getInstructorCourses: (id: string) =>
    apiClient.get<CourseResponse[]>(`/admin/instructors/${id}/courses`),
  getAdminStats: () =>
    apiClient.get<AdminStatsResponse>('/admin/stats'),
};
