import { useEffect, useRef, useState } from 'react';
import { paymentsApi } from '@/api/payments';
import { getApiErrorMessage } from '@/lib/apiError';

const CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;
const SDK_BASE =
  import.meta.env.VITE_PAYPAL_MODE === 'live'
    ? 'https://www.paypal.com'
    : 'https://www.sandbox.paypal.com';

interface PayPalButtonProps {
  orderId: string;
  courseId: string;
  onSuccess: (courseId: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  createOrder?: (orderId: string) => Promise<{ paypalOrderId: string }>;
  captureOrder?: (paypalOrderId: string, internalOrderId: string) => Promise<unknown>;
}

function loadPayPalSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-paypal-sdk="true"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('PayPal SDK failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.src = `${SDK_BASE}/sdk/js?client-id=${encodeURIComponent(CLIENT_ID as string)}&currency=USD&intent=capture`;
    script.setAttribute('data-paypal-sdk', 'true');
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('PayPal SDK failed to load'));
    document.body.appendChild(script);
  });
}

export function PayPalButton({
  orderId,
  courseId,
  onSuccess,
  onError,
  disabled,
  createOrder = (id) => paymentsApi.createPayPalOrder(id).then((res) => res.data),
  captureOrder = (paypalOrderId, id) => paymentsApi.capturePayPalOrder(paypalOrderId, id),
}: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const createOrderErrorRef = useRef<string | null>(null);
  const [sdkState, setSdkState] = useState<'loading' | 'ready' | 'missing' | 'error'>(
    CLIENT_ID && !CLIENT_ID.startsWith('replace-with-') ? 'loading' : 'missing',
  );

  useEffect(() => {
    if (disabled || sdkState === 'missing' || sdkState === 'error') return;
    if (sdkState === 'ready') return;

    let cancelled = false;
    loadPayPalSdk()
      .then(() => {
        if (cancelled) return;
        setSdkState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setSdkState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [disabled, sdkState]);

  useEffect(() => {
    if (sdkState !== 'ready' || !window.paypal || !containerRef.current || disabled) return;

    const buttons = window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
      createOrder: async () => {
        try {
          const res = await createOrder(orderId);
          return res.paypalOrderId;
        } catch (err) {
          createOrderErrorRef.current = getApiErrorMessage(
            err,
            'Une erreur est survenue avec PayPal. Veuillez réessayer.',
          );
          throw err;
        }
      },
      onApprove: async (data) => {
        try {
          await captureOrder(data.orderID, orderId);
          onSuccess(courseId);
        } catch (err) {
          onError(getApiErrorMessage(err, 'Le paiement PayPal a échoué. Veuillez réessayer.'));
        }
      },
      onCancel: () => {
        onError('Paiement PayPal annulé.');
      },
      onError: () => {
        onError(
          createOrderErrorRef.current ??
            'Une erreur est survenue avec PayPal. Veuillez réessayer.',
        );
      },
    });

    buttons.render(containerRef.current).catch(() => {
      onError("Impossible d'afficher le bouton PayPal.");
    });
  }, [sdkState, disabled, orderId, courseId, onSuccess, onError, createOrder, captureOrder]);

  if (sdkState === 'missing') {
    return (
      <p className="text-xs text-[#FF9B87]">
        Paiement PayPal non configuré (client ID manquant). Utilisez le paiement simulé ci-dessous.
      </p>
    );
  }

  if (sdkState === 'error') {
    return (
      <p className="text-xs text-[#FF9B87]">
        Impossible de charger PayPal. Utilisez le paiement simulé ci-dessous.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="min-h-[44px]" />
      {(sdkState === 'loading' || disabled) && (
        <p className="text-center text-[11px] text-[#63636B]">Chargement de PayPal…</p>
      )}
    </div>
  );
}
