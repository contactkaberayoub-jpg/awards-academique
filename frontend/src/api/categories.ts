import apiClient from './client';

export interface CategoryNode {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  iconUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  children: CategoryNode[];
}

function buildTree(categories: CategoryNode[], parentId: string | null = null): CategoryNode[] {
  return categories
    .filter((category) => category.parentId === parentId)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((category) => ({
      ...category,
      children: buildTree(categories, category.id),
    }));
}

export const categoriesApi = {
  getTree: async (): Promise<CategoryNode[]> => {
    const response = await apiClient.get<CategoryNode[]>('/categories');
    return buildTree(response.data.filter((category) => category.isActive));
  },

  getRoots: async (): Promise<CategoryNode[]> => {
    const response = await apiClient.get<CategoryNode[]>('/categories/roots');
    return response.data
      .filter((category) => category.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  getAll: async (): Promise<CategoryNode[]> => {
    const response = await apiClient.get<CategoryNode[]>('/categories');
    return response.data.filter((category) => category.isActive);
  },
};
