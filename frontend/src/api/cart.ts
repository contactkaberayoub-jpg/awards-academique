import apiClient from './client';

export interface CartItemResponse {
  id: string;
  courseId: string;
  courseTitle: string;
  courseThumbnailUrl: string | null;
  price: number;
  currency: string;
  createdAt: string;
}

export interface CartResponse {
  id: string;
  userId: string;
  items: CartItemResponse[];
  totalAmount: number;
  currency: string;
  updatedAt: string;
}

export interface CheckoutItemResponse {
  courseId: string;
  courseTitle: string;
  courseThumbnailUrl: string | null;
  price: number;
  currency: string;
  free: boolean;
}

export interface CheckoutResponse {
  cartId: string;
  userId: string;
  items: CheckoutItemResponse[];
  totalAmount: number;
  currency: string;
  itemCount: number;
  preparedAt: string;
}

export interface AddCartItemRequest {
  courseId: string;
}

export const cartApi = {
  getMyCart: () => apiClient.get<CartResponse>('/cart'),
  addItem: (courseId: string) =>
    apiClient.post<CartResponse>('/cart/items', { courseId }),
  removeItem: (courseId: string) =>
    apiClient.delete<CartResponse>(`/cart/items/${courseId}`),
  clearCart: () => apiClient.delete<CartResponse>('/cart'),
  checkout: () => apiClient.post<CheckoutResponse>('/cart/checkout'),
};
