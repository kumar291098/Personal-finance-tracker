import { apiClient } from './client';

export interface Category {
  id: number;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string;
}

export const getCategories = async (): Promise<Category[]> => {
  return await apiClient('/categories');
};

export const createCategory = async (data: { name: string; type: string; icon: string }): Promise<Category> => {
  return await apiClient('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const deleteCategory = async (id: number): Promise<void> => {
  return await apiClient(`/categories/${id}`, { method: 'DELETE' });
};
