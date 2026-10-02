import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { lessonService, type LessonPage, type LessonPageParams } from '@/api/lessonService';

const emptyPage: LessonPage = {
  content: [], totalElements: 0, totalPages: 0, number: 0, size: 10, first: true, last: true,
};

export function useLessons(params: LessonPageParams) {
  const { courseId, sectionId, status, search, page = 0, size = 10, sortBy = 'displayOrder', direction = 'ASC' } = params;
  const normalizedParams = useMemo(
    () => ({ courseId, sectionId, status, search, page, size, sortBy, direction }),
    [courseId, direction, page, search, sectionId, size, sortBy, status],
  );
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['lessons', normalizedParams],
    queryFn: async () => {
      const res = await lessonService.getPage(normalizedParams);
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['lessons'] }),
    [queryClient],
  );

  return {
    data: query.data ?? emptyPage,
    isLoading: query.isLoading,
    error: query.error,
    reload: query.refetch,
    invalidate,
  };
}
