import apiClient from './client';
import { adminApi } from './admin';

export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';
export type OrderCurrency = 'MAD' | 'EUR' | 'USD';

export interface InstructorOrder {
  id: string;
  courseId: string;
  courseTitle: string;
  courseThumbnailUrl: string | null;
  studentName: string;
  studentEmail: string;
  status: OrderStatus;
  totalAmount: number;
  currency: OrderCurrency;
  createdAt: string;
}

export interface InstructorOrdersData {
  orders: InstructorOrder[];
  totalRevenue: number;
  paidOrders: number;
  pendingOrders: number;
}

export interface OrderResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  courseThumbnailUrl: string | null;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export const ordersApi = {
  createOrder: (courseId: string) =>
    apiClient.post<OrderResponse>('/orders', { courseId }),
  payOrder: (orderId: string, paymentData: { cardHolderName: string; cardNumber: string; expiryDate: string; cvv: string }) =>
    apiClient.post<OrderResponse>(`/orders/${orderId}/pay`, paymentData),
  getMyOrders: () => apiClient.get<OrderResponse[]>('/orders/mine'),
};

export async function fetchInstructorOrders(): Promise<InstructorOrdersData> {
  const courses = await adminApi.getMyCourses();
  const courseIds = courses.data.map((c) => c.id);

  const responses = await Promise.all(
    courseIds.map((id) => apiClient.get<OrderResponse[]>(`/orders/course/${id}`)),
  );

  const orders: InstructorOrder[] = responses.flatMap((res) =>
    res.data.map((o) => ({
      id: o.id,
      courseId: o.courseId,
      courseTitle: o.courseTitle,
      courseThumbnailUrl: o.courseThumbnailUrl,
      studentName: o.userName,
      studentEmail: o.userEmail,
      status: o.status as OrderStatus,
      totalAmount: o.totalAmount,
      currency: o.currency as OrderCurrency,
      createdAt: o.createdAt,
    })),
  );

  const paid = orders.filter((o) => o.status === 'paid');
  const pending = orders.filter((o) => o.status === 'pending');

  return {
    orders,
    totalRevenue: paid.reduce((sum, o) => sum + o.totalAmount, 0),
    paidOrders: paid.length,
    pendingOrders: pending.length,
  };
}
