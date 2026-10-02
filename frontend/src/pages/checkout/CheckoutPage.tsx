import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, BookOpen, ArrowUpRight, Lock } from 'lucide-react';
import { useMyCart } from '@/api/hooks';
import { ordersApi } from '@/api/orders';
import { adminApi, type CourseResponse } from '@/api/admin';
import { cartApi } from '@/api/cart';
import { useAuth } from '@/auth/AuthContext';
import { normalizeRole, ROLE_DASHBOARD } from '@/auth/roleRoutes';
import { getApiErrorMessage } from '@/lib/apiError';
import { MockPaymentForm, type PaymentFormData } from '@/components/payment/MockPaymentForm';
import { PayPalButton } from '@/components/payment/PayPalButton';
import { Skeleton } from '@/components/ui/Skeleton';

function currency(value: number, code?: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: code ?? 'MAD',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

/** Brand mark: two overlapping circles — a monogram for "Awards Académique" (AA) */
function BrandMark({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const a = tone === 'dark' ? '#0A0A0B' : '#FBF1E2';
  const b = tone === 'dark' ? '#FBF1E2' : '#0A0A0B';
  return (
    <div className="relative h-6 w-9 shrink-0">
      <div className="absolute left-0 top-0 h-6 w-6 rounded-full" style={{ background: a }} />
      <div
        className="absolute left-3 top-0 h-6 w-6 rounded-full border-2"
        style={{ background: b, borderColor: a }}
      />
    </div>
  );
}

function StepRail({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Panier' },
    { n: 2, label: 'Paiement' },
    { n: 3, label: 'Confirmé' },
  ];
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div
              className={[
                'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                s.n < step
                  ? 'bg-[#2F6FF6] text-white'
                  : s.n === step
                    ? 'bg-[#F5B720] text-[#0A0A0B]'
                    : 'bg-white/[0.06] text-[#63636B]',
              ].join(' ')}
            >
              {s.n < step ? '✓' : s.n}
            </div>
            <span
              className={[
                'text-xs font-semibold hidden sm:inline',
                s.n <= step ? 'text-white' : 'text-[#63636B]',
              ].join(' ')}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={['h-px w-6 sm:w-10', s.n < step ? 'bg-[#2F6FF6]' : 'bg-white/10'].join(' ')}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function CheckoutPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseParam = searchParams.get('course');
  const { data: cart, isLoading, error } = useMyCart();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paypalOrder, setPaypalOrder] = useState<{ orderId: string; courseId: string } | null>(null);
  const [paypalOrderLoading, setPaypalOrderLoading] = useState(false);

  const role = user ? normalizeRole(user.role) : null;
  const isStudent = role === 'STUDENT';

  // Checkout is now reachable by guests so they can review their order before logging in. Keep the
  // previous STUDENT-only guarantee for authenticated users; redirect other roles to their dashboard.
  // The non-student redirect is enforced after all hooks are declared, keeping the hook order stable.

  // Guest review: show the selected course + payment summary BEFORE login. The actual payment is
  // deferred - clicking "Payer" sends the guest to Login/Register preserving this checkout context,
  // so they return straight back to this same payment step.
  const guestCourseQuery = useQuery({
    queryKey: ['courses', 'detail', courseParam],
    queryFn: async (): Promise<CourseResponse> => {
      const response = await adminApi.getCourseById(courseParam as string);
      return response.data;
    },
    enabled: !isAuthenticated && Boolean(courseParam),
  });

  const courseIsInCart = useMemo(
    () => (cart?.items ?? []).some((item) => item.courseId === courseParam),
    [cart, courseParam]
  );

  // When a guest logs in while mid-purchase (?course=...), ensure the course lands in their cart so
  // the existing cart -> checkout -> pay -> enroll pipeline completes on return (no auto-charge).
  useEffect(() => {
    if (
      isAuthenticated &&
      isStudent &&
      courseParam &&
      !isLoading &&
      cart &&
      !courseIsInCart
    ) {
      cartApi
        .addItem(courseParam)
        .then(() => queryClient.invalidateQueries({ queryKey: ['cart', 'mine'] }))
        .catch(() => {
          /* ignore — course may already be in cart */
        });
    }
  }, [isAuthenticated, isStudent, courseParam, isLoading, cart, courseIsInCart]);

  // PayPal is used for single-course checkouts only. Resolve the internal order (create, or reuse an
  // existing pending order) once so the PayPal button can reference its orderId without re-submitting.
  useEffect(() => {
    if (!isAuthenticated || !isStudent || !cart || cart.items.length !== 1) {
      setPaypalOrder(null);
      return;
    }
    const courseId = cart.items[0].courseId;
    let cancelled = false;
    setPaypalOrderLoading(true);
    (async () => {
      let orderId: string;
      try {
        const orderRes = await ordersApi.createOrder(courseId);
        orderId = orderRes.data.id;
      } catch (err: any) {
        const mineRes = await ordersApi.getMyOrders();
        const existing = mineRes.data.find(
          (o) => o.courseId === courseId && o.status === 'pending'
        );
        if (!existing) {
          throw err;
        }
        orderId = existing.id;
      }
      if (!cancelled) {
        setPaypalOrder({ orderId, courseId });
      }
    })()
      .catch(() => {
        /* leave paypalOrder null so the mock form remains the only option */
      })
      .finally(() => {
        if (!cancelled) setPaypalOrderLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isStudent, cart]);

  const paymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentFormData) => {
      if (!cart || cart.items.length === 0) {
        throw new Error('Votre panier est vide.');
      }

      let lastCourseId = '';
      for (const item of cart.items) {
        lastCourseId = item.courseId;
        let orderId = '';
        try {
          const orderRes = await ordersApi.createOrder(item.courseId);
          orderId = orderRes.data.id;
        } catch (err: any) {
          const mineRes = await ordersApi.getMyOrders();
          const existing = mineRes.data.find(
            (o) => o.courseId === item.courseId && o.status === 'pending'
          );
          if (existing) {
            orderId = existing.id;
          } else {
            throw err;
          }
        }

        await ordersApi.payOrder(orderId, paymentData);
      }
      return { courseId: lastCourseId, courseTitle: cart.items[0]?.courseTitle || 'Cours' };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cart', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      // Payment is confirmed synchronously by the backend (enrollment is ACTIVE before this
      // resolves), so we can redirect straight into the course that was just bought.
      navigate(`/learning/${result.courseId}`, { replace: true });
    },
    onError: (err: any) => {
      setPaymentError(getApiErrorMessage(err, 'Le paiement a échoué. Veuillez réessayer.'));
    },
  });

  if (isAuthenticated && !isStudent) {
    return <Navigate to={(role && ROLE_DASHBOARD[role]) ?? '/'} replace />;
  }

  if (!isAuthenticated) {
    const goToAuth = () =>
      navigate(`/login?redirect=${encodeURIComponent(`/checkout?course=${courseParam ?? ''}`)}`);

    if (guestCourseQuery.isLoading) {
      return (
        <div className="min-h-screen bg-[#0A0A0B]">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
            <Skeleton className="h-8 w-48 mb-8 bg-white/5" />
            <div className="grid gap-8 lg:grid-cols-2">
              <Skeleton className="h-64 w-full rounded-[28px] bg-white/5" />
              <Skeleton className="h-96 w-full rounded-[28px] bg-white/5" />
            </div>
          </div>
        </div>
      );
    }

    const guestCourse = guestCourseQuery.data;

    if (!courseParam || !guestCourse) {
      return (
        <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-[28px] border border-white/10 bg-[#141416] p-8 text-center">
            <h1 className="text-xl font-bold text-white tracking-tight">Connectez-vous pour finaliser</h1>
            <p className="mt-2 text-sm text-[#9B9BA3]">
              Sélectionnez un cours, puis connectez-vous pour finaliser votre commande en toute sécurité.
            </p>
            <button
              onClick={goToAuth}
              className="mt-6 w-full rounded-full bg-[#F5B720] px-5 py-3 text-sm font-bold text-[#0A0A0B] transition hover:bg-[#FFC53D]"
            >
              Se connecter
            </button>
          </div>
        </div>
      );
    }

    const guestPrice = guestCourse.discountPrice ?? guestCourse.price;
    const guestCurrency = guestCourse.currency ?? 'MAD';
    const isFree = guestCourse.price === 0;

    return (
      <div className="min-h-screen bg-[#0A0A0B]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
          <div className="mb-8 flex flex-col gap-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Récapitulatif de votre commande
            </h1>
            <p className="mt-1.5 text-sm text-[#9B9BA3]">
              Vérifiez les détails de votre commande avant de procéder au paiement.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_400px] items-start">
            <div className="order-2 lg:order-1 rounded-[28px] border border-white/10 bg-[#141416] p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-white/[0.04]">
                  {guestCourse.thumbnailUrl ? (
                    <img src={guestCourse.thumbnailUrl} alt={guestCourse.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#63636B]">
                      <BookOpen className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{guestCourse.title}</h2>
                  <p className="mt-1 text-sm text-[#9B9BA3]">
                    {guestCourse.instructorName ?? 'Awards Académique'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-sm text-[#9B9BA3]">Total à payer</span>
                <span className="text-2xl font-extrabold text-white tabular-nums tracking-tight">
                  {isFree ? 'Gratuit' : currency(guestPrice, guestCurrency)}
                </span>
              </div>

              <div className="mt-6 space-y-2.5">
                <button
                  onClick={goToAuth}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#F5B720] px-5 py-3.5 text-sm font-bold text-[#0A0A0B] transition hover:bg-[#FFC53D]"
                >
                  Payer
                  <ArrowUpRight className="h-4 w-4" />
                </button>
                <p className="text-center text-[11px] text-[#63636B]">
                  Vous serez invité(e) à vous connecter ou créer un compte pour finaliser le paiement.
                </p>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-4 lg:sticky lg:top-24">
              <div className="rounded-[28px] border border-white/10 bg-[#141416] p-6">
                <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[#9B9BA3] mb-5">
                  Détails de la commande
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#9B9BA3]">Sous-total</span>
                    <span className="text-white font-semibold tabular-nums">
                      {isFree ? '0,00 MAD' : currency(guestCourse.price, guestCurrency)}
                    </span>
                  </div>
                  {guestCourse.discountPrice != null && guestCourse.discountPrice < guestCourse.price && (
                    <div className="flex justify-between">
                      <span className="text-[#9B9BA3]">Réduction</span>
                      <span className="text-[#5C90FF] font-semibold tabular-nums">
                        - {currency(guestCourse.price - guestCourse.discountPrice, guestCurrency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/10 pt-3 font-bold text-white">
                    <span>Total</span>
                    <span className="tabular-nums">{isFree ? 'Gratuit' : currency(guestPrice, guestCurrency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
          <Skeleton className="h-8 w-48 mb-8 bg-white/5" />
          <div className="grid gap-8 lg:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-[28px] bg-white/5" />
            <Skeleton className="h-96 w-full rounded-[28px] bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-[28px] border border-white/10 bg-[#141416] p-8 text-center">
          <ShoppingCart className="mx-auto h-11 w-11 text-[#63636B]" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-white tracking-tight">Votre panier est vide</h1>
          <p className="mt-2 text-sm text-[#9B9BA3]">
            Vous devez ajouter des cours à votre panier avant de procéder au paiement.
          </p>
          <div className="mt-6">
            <Link to="/cart">
              <button className="rounded-full bg-[#F5B720] px-5 py-2.5 text-sm font-bold text-[#0A0A0B] transition hover:bg-[#FFC53D]">
                Voir mon panier
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalAmount = cart.totalAmount;
  const cartCurrency = cart.currency;
  const isSingleItem = cart.items.length === 1;

  const handlePayPalSuccess = (courseId: string) => {
    setPaymentError(null);
    queryClient.invalidateQueries({ queryKey: ['cart', 'mine'] });
    queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] });
    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    navigate(`/learning/${courseId}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="mb-8 flex flex-col gap-4">
          <StepRail step={2} />
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Paiement sécurisé
            </h1>
            <p className="mt-1.5 text-sm text-[#9B9BA3]">
              Finalisez votre commande via PayPal ou le paiement simulé.
            </p>
          </div>
        </div>

        {paymentError && (
          <div className="mb-6 rounded-2xl border border-[#FF6B57]/30 bg-[#FF6B57]/10 px-4 py-3 text-sm text-[#FF9B87] flex items-start gap-2.5">
            <span className="font-bold text-[#FF6B57] shrink-0">Échec du paiement —</span>
            <span>{paymentError}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_400px] items-start">
          {/* Payment Form */}
          <div className="order-2 lg:order-1 rounded-[28px] border border-white/10 bg-[#141416] p-6 sm:p-7">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[#9B9BA3] mb-6">
              Informations de paiement
            </h2>
            {isSingleItem && (
              <div className="mb-6">
                {paypalOrderLoading ? (
                  <p className="text-sm text-[#9B9BA3]">Préparation du paiement PayPal…</p>
                ) : paypalOrder ? (
                  <PayPalButton
                    orderId={paypalOrder.orderId}
                    courseId={paypalOrder.courseId}
                    onSuccess={handlePayPalSuccess}
                    onError={(msg) => setPaymentError(msg)}
                    disabled={paymentMutation.isPending}
                  />
                ) : (
                  <p className="text-xs text-[#FF9B87]">
                    Impossible de préparer le paiement PayPal. Utilisez le paiement simulé ci-dessous.
                  </p>
                )}
                <div className="my-5 flex items-center gap-3 text-[11px] text-[#63636B]">
                  <span className="h-px flex-1 bg-white/10" />
                  OU PAIEMENT SIMULÉ
                  <span className="h-px flex-1 bg-white/10" />
                </div>
              </div>
            )}
            <MockPaymentForm
              onSubmit={(data) => {
                setPaymentError(null);
                paymentMutation.mutate(data);
              }}
              isLoading={paymentMutation.isPending}
              totalAmount={totalAmount}
              currency={cartCurrency}
            />
            <div className="mt-6 flex items-center gap-2 text-[11px] text-[#63636B]">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>Paiement simulé à des fins de démonstration — aucune carte réelle n'est débitée.</span>
            </div>
          </div>

          {/* Order Summary */}
          <div className="order-1 lg:order-2 space-y-4 lg:sticky lg:top-24">
            {/* Items */}
            <div className="rounded-[28px] border border-white/10 bg-[#141416] p-6">
              <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[#9B9BA3] mb-5">
                Récapitulatif
              </h2>
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-white/[0.04]">
                      {item.courseThumbnailUrl ? (
                        <img
                          src={item.courseThumbnailUrl}
                          alt={item.courseTitle}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[#63636B]">
                          <BookOpen className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">{item.courseTitle}</h3>
                    </div>
                    <div className="text-sm font-bold text-white tabular-nums">
                      {currency(item.price, item.currency || cartCurrency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total — rendered as a brand card, matches cart page */}
            <div
              className="relative rounded-[28px] p-6 shadow-[0_24px_50px_-16px_rgba(245,183,32,0.35)]"
              style={{ background: 'linear-gradient(135deg, #F9CE5B 0%, #F5B720 45%, #E0A30F 100%)' }}
            >
              <div className="flex items-start justify-between">
                <BrandMark tone="dark" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#0A0A0B]/60">
                  Total à payer
                </span>
              </div>
              <div className="mt-4 text-3xl font-extrabold text-[#0A0A0B] tabular-nums tracking-tight">
                {currency(totalAmount, cartCurrency)}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4 text-xs text-[#9B9BA3] space-y-1.5">
              <p className="font-bold text-white mb-1">Cartes de test</p>
              <div className="flex justify-between">
                <span>Succès</span>
                <code className="font-mono text-[#B9B9C2]">4111 1111 1111 1111</code>
              </div>
              <div className="flex justify-between">
                <span>Carte invalide</span>
                <code className="font-mono text-[#B9B9C2]">4000 0000 0000 0002</code>
              </div>
              <div className="flex justify-between">
                <span>Fonds insuffisants</span>
                <code className="font-mono text-[#B9B9C2]">4000 0000 0000 9995</code>
              </div>
              <div className="flex justify-between">
                <span>Carte expirée</span>
                <span className="text-[#313167]">date passée, ex. 01/22</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}