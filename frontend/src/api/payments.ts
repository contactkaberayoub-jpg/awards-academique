import apiClient from './client';

export interface PayPalOrderResponse {
  paypalOrderId: string;
  status: string;
  internalOrderId: string;
  amount: number;
  currency: string;
}

export interface PayPalCaptureResponse {
  paypalOrderId: string;
  status: string;
  internalOrderId: string;
  captureId: string;
  capturedAmount: number;
  currency: string;
}

export const paymentsApi = {
  createPayPalOrder: (orderId: string) =>
    apiClient.post<PayPalOrderResponse>('/payments/paypal/create-order', { orderId }),

  capturePayPalOrder: (paypalOrderId: string, internalOrderId: string) =>
    apiClient.post<PayPalCaptureResponse>(`/payments/paypal/capture/${paypalOrderId}`, {
      internalOrderId,
    }),
};
