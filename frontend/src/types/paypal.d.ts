export {};

declare global {
  interface Window {
    paypal?: PayPalJs;
  }

  interface PayPalJs {
    Buttons: (options: PayPalButtonsOptions) => {
      render: (container: string | HTMLElement) => Promise<void>;
    };
  }

  interface PayPalButtonsActions {
    order: {
      create: () => Promise<string>;
      capture: (orderId?: string) => Promise<Record<string, unknown>>;
    };
  }

  interface PayPalButtonsOptions {
    style?: {
      layout?: string;
      color?: string;
      shape?: string;
      label?: string;
      height?: number;
    };
    createOrder: (
      data: Record<string, unknown>,
      actions: Pick<PayPalButtonsActions, 'order'>,
    ) => Promise<string>;
    onApprove: (
      data: { orderID: string },
      actions: Pick<PayPalButtonsActions, 'order'>,
    ) => Promise<void> | void;
    onCancel?: (data: Record<string, unknown>) => void;
    onError?: (err: unknown) => void;
  }
}
