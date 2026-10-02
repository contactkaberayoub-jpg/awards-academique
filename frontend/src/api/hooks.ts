import { useQuery } from '@tanstack/react-query';
import { categoriesApi, type CategoryNode } from './categories';
import { adminApi, type CourseResponse } from './admin';
import { enrollmentsApi, type EnrollmentResponse } from './enrollments';
import { cartApi, type CartResponse } from './cart';
import { useAuth } from '../auth/AuthContext';
import { normalizeRole } from '../auth/roleRoutes';
import apiClient from './client';
import type { SearchResult } from '../types';

// Hook to fetch all active categories as a nested tree (Spring API)
export function useCategories() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => categoriesApi.getTree(),
    staleTime: 60000,
  });
}

// Hook to fetch trending courses (Spring API, most enrolled first)
export function useTrendingCourses() {
  return useQuery({
    queryKey: ['courses', 'trending'],
    queryFn: async (): Promise<CourseResponse[]> => {
      const response = await adminApi.getPublishedCourses();
      return [...response.data]
        .sort((a, b) => (b.enrollmentsCount ?? 0) - (a.enrollmentsCount ?? 0))
        .slice(0, 8);
    },
    staleTime: 60000,
  });
}

// Hook to fetch published courses, grouped by category (for Get Certified)
export function useFeaturedCoursesByCategory() {
  return useQuery({
    queryKey: ['courses', 'featuredByCategory'],
    queryFn: async (): Promise<{ category: CategoryNode; courses: CourseResponse[] }[]> => {
      const categories = await categoriesApi.getRoots();
      const rootCategories = categories.slice(0, 6);
      const response = await adminApi.getPublishedCourses();
      const published = [...response.data].sort(
        (a, b) => (b.enrollmentsCount ?? 0) - (a.enrollmentsCount ?? 0)
      );

      return rootCategories.map((category: CategoryNode) => ({
        category,
        courses: published
          .filter((course) => course.categoryId === category.id)
          .slice(0, 4),
      }));
    },
    staleTime: 60000,
  });
}

export function useRecommendedCourses(limit = 12) {
  return useQuery({
    queryKey: ['courses', 'recommended'],
    queryFn: async (): Promise<CourseResponse[]> => {
      const response = await adminApi.getPublishedCourses();
      return [...response.data]
        .sort((a, b) => (b.enrollmentsCount ?? 0) - (a.enrollmentsCount ?? 0))
        .slice(0, limit);
    },
    staleTime: 60000,
  });
}

export function useMyEnrollments() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['enrollments', 'mine'],
    queryFn: async (): Promise<EnrollmentResponse[]> => {
      const response = await enrollmentsApi.getMyEnrollments();
      return response.data;
    },
    enabled: isAuthenticated,
  });
}

export function useMyCart() {
  const { isAuthenticated, user } = useAuth();
  const role = user ? normalizeRole(user.role) : null;
  const isStudent = role === 'STUDENT';
  return useQuery({
    queryKey: ['cart', 'mine'],
    queryFn: async (): Promise<CartResponse> => {
      const response = await cartApi.getMyCart();
      return response.data;
    },
    enabled: isAuthenticated && isStudent,
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!query.trim()) return [];

      const normalizedQuery = query.trim();

      // Search courses via Spring API (paginated, title match)
      const searchResponse = await adminApi.searchCourses({
        title: normalizedQuery,
        page: 0,
        size: 5,
        sortBy: 'enrollmentsCount',
        direction: 'DESC',
      });
      const matchingCourses = searchResponse.data.content;

      // Search categories via Spring API
      const activeCategories = await categoriesApi.getAll();
      const matchingCategories = activeCategories
        .filter((category) => category.name.toLowerCase().includes(normalizedQuery.toLowerCase()))
        .slice(0, 3);

      // Search instructors (users with role INSTRUCTOR) — Spring API
      const instructorResponse = await apiClient.get<{ id: string; firstName: string; lastName: string }[]>(
        '/users/search',
        { params: { q: normalizedQuery, role: 'instructor' } }
      );
      const instructors = instructorResponse.data;

      // Combine results
      const results: SearchResult[] = [
        ...(matchingCourses.map(course => ({
          type: 'course' as const,
          id: course.id,
          title: course.title,
          description: course.subtitle || course.description,
          thumbnailUrl: course.thumbnailUrl,
        }))),
        ...(matchingCategories.map(cat => ({
          type: 'category' as const,
          id: cat.id,
          title: cat.name,
          slug: cat.slug,
        }))),
        ...(instructors || []).map(inst => ({
          type: 'instructor' as const,
          id: inst.id,
          title: `${inst.firstName} ${inst.lastName}`,
        })),
      ];

      return results;
    },
    enabled: query.trim().length > 0,
    staleTime: 30000, // 30 seconds
  });
}
