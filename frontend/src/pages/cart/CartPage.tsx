import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Trash2, ArrowRight, BookOpen, AlertCircle, ArrowUpRight } from 'lucide-react';
import { cartApi, type CartItemResponse } from '@/api/cart';
import { useMyCart } from '@/api/hooks';
import { getApiErrorMessage } from '@/lib/apiError';
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
    <div className="relative h-7 w-11 shrink-0">
      <div className="absolute left-0 top-0 h-7 w-7 rounded-full" style={{ background: a }} />
      <div
        className="absolute left-4 top-0 h-7 w-7 rounded-full border-2"
        style={{ background: b, borderColor: a }}
      />
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <Skeleton className="h-8 w-48 mb-8 bg-white/5" />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-28 w-full rounded-3xl bg-white/5" />
            <Skeleton className="h-28 w-full rounded-3xl bg-white/5" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-72 w-full rounded-[28px] bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: cart, isLoading, error } = useMyCart();

  const removeMutation = useMutation({
    mutationFn: (courseId: string) => cartApi.removeItem(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', 'mine'] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => cartApi.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', 'mine'] });
    },
  });

  if (isLoading) {
    return <CartSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-[28px] border border-white/10 bg-[#141416] p-8 text-center">
          <AlertCircle className="mx-auto h-11 w-11 text-[#FF6B57]" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-white tracking-tight">Erreur de chargement</h1>
          <p className="mt-2 text-sm text-[#9B9BA3]">
            {getApiErrorMessage(error, 'Impossible de récupérer les éléments de votre panier.')}
          </p>
          <div className="mt-6">
            <Link to="/courses">
              <button className="rounded-full bg-[#F5B720] px-5 py-2.5 text-sm font-bold text-[#0A0A0B] transition hover:bg-[#FFC53D]">
                Explorer les cours
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const items = cart?.items ?? [];
  const totalAmount = cart?.totalAmount ?? 0;
  const cartCurrency = cart?.currency ?? 'MAD';

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5B720]">
              Étape 1 sur 2
            </span>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
              Mon panier
              {items.length > 0 && (
                <span className="text-sm font-semibold rounded-full border border-white/10 bg-white/[0.06] text-[#B9B9C2] px-3 py-1">
                  {items.length} {items.length === 1 ? 'cours' : 'cours'}
                </span>
              )}
            </h1>
          </div>

          {items.length > 0 && (
            <button
              disabled={clearMutation.isPending}
              onClick={() => clearMutation.mutate()}
              className="self-start sm:self-auto text-sm font-semibold text-[#9B9BA3] hover:text-[#FF6B57] transition disabled:opacity-40 flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Vider le panier
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="relative max-w-lg mx-auto rounded-[28px] border border-white/10 bg-[#141416] py-16 px-8 text-center overflow-hidden">
            {/* abstract decorative shapes, echoing the illustration mood without copying it */}
            <div className="pointer-events-none absolute -top-6 -left-6 h-16 w-16 rounded-full bg-[#2F6FF6]/25 blur-xl" aria-hidden="true" />
            <div className="pointer-events-none absolute bottom-4 right-6 h-10 w-10 rounded-full bg-[#F5B720]/25 blur-lg" aria-hidden="true" />
            <div className="pointer-events-none absolute top-10 right-10 h-4 w-4 rounded-full bg-[#FF6B57]" aria-hidden="true" />

            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] text-[#9B9BA3] mb-5">
              <ShoppingCart className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="relative text-xl font-bold text-white tracking-tight">Rien à payer pour l'instant</h2>
            <p className="relative mt-2 text-sm text-[#9B9BA3] max-w-sm mx-auto leading-relaxed">
              Ajoutez un cours au panier et il apparaîtra ici, prêt pour le paiement.
            </p>
            <div className="relative mt-7">
              <Link to="/courses">
                <button className="inline-flex items-center gap-2 rounded-full bg-[#F5B720] px-5 py-2.5 text-sm font-bold text-[#0A0A0B] transition hover:bg-[#FFC53D]">
                  Explorer les cours
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px] items-start">
            {/* Items List */}
            <div className="space-y-3">
              {items.map((item: CartItemResponse) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#141416] transition-colors hover:border-white/20"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-5">
                    <div className="h-20 w-32 shrink-0 overflow-hidden rounded-2xl bg-white/[0.04]">
                      {item.courseThumbnailUrl ? (
                        <img
                          src={item.courseThumbnailUrl}
                          alt={item.courseTitle}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[#9B9BA3]">
                          <BookOpen className="h-6 w-6" aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/courses/${item.courseId}`}
                        className="text-base font-semibold text-white hover:text-[#F5B720] transition-colors line-clamp-1"
                      >
                        {item.courseTitle}
                      </Link>
                      <p className="mt-1 text-xs text-[#63636B]">
                        Ajouté le {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <span className="text-lg font-bold text-white tabular-nums">
                        {currency(item.price, item.currency || cartCurrency)}
                      </span>
                      <button
                        disabled={removeMutation.isPending && removeMutation.variables === item.courseId}
                        onClick={() => removeMutation.mutate(item.courseId)}
                        className="text-[#63636B] hover:text-[#FF6B57] transition p-2 -m-2 disabled:opacity-40"
                        aria-label="Supprimer du panier"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary — rendered as a tilted brand "card" object */}
            <div className="lg:sticky lg:top-24">
              <div className="relative pt-4 pb-2">
                {/* stacked card peeking behind, for depth like the reference stack */}
                <div
                  className="absolute inset-x-6 top-0 h-[188px] rounded-[26px] rotate-[5deg]"
                  style={{ background: 'linear-gradient(135deg, #3B7BFF 0%, #1E52C4 100%)' }}
                  aria-hidden="true"
                />

                <div
                  className="relative rounded-[28px] p-6 -rotate-1 shadow-[0_24px_50px_-16px_rgba(245,183,32,0.35)]"
                  style={{ background: 'linear-gradient(135deg, #F9CE5B 0%, #F5B720 45%, #E0A30F 100%)' }}
                >
                  <div className="flex items-start justify-between">
                    <BrandMark tone="dark" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#0A0A0B]/60">
                      Total
                    </span>
                  </div>

                  <div className="mt-5 text-4xl font-extrabold text-[#0A0A0B] tabular-nums tracking-tight">
                    {currency(totalAmount, cartCurrency)}
                  </div>

                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0A0A0B]/50">
                        Cours
                      </p>
                      <p className="text-sm font-bold text-[#0A0A0B]">{items.length}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0A0A0B]/50">
                        Devise
                      </p>
                      <p className="text-sm font-bold text-[#0A0A0B]">{cartCurrency}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <button
                  disabled={items.length === 0}
                  onClick={() => navigate('/checkout')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#F5B720] px-5 py-3.5 text-sm font-bold text-[#0A0A0B] transition hover:bg-[#FFC53D] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Passer au paiement
                  <ArrowUpRight className="h-4 w-4" />
                </button>

                <Link to="/courses" className="block w-full">
                  <button className="w-full rounded-full border border-white/10 bg-transparent px-5 py-3.5 text-sm font-semibold text-[#B9B9C2] transition hover:border-white/20 hover:text-white">
                    Continuer mes achats
                  </button>
                </Link>
              </div>

              <p className="mt-4 text-center text-[11px] text-[#63636B]">
                Accès immédiat au cours dès la validation du paiement.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}