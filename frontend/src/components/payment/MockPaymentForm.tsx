import { useState } from 'react';
import { Lock, CreditCard } from 'lucide-react';

export interface PaymentFormData {
  cardNumber: string;
  cardHolderName: string;
  expiryDate: string;
  cvv: string;
}

interface MockPaymentFormProps {
  onSubmit: (data: PaymentFormData) => void;
  isLoading: boolean;
  totalAmount: number;
  currency: string;
}

function currency(value: number, code?: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: code ?? 'MAD',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function cardBrand(digits: string): 'visa' | 'mastercard' | null {
  if (digits.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(digits)) return 'mastercard';
  return null;
}

/** Brand mark: two overlapping circles — a monogram for "Awards Académique" (AA) */
function BrandMark() {
  return (
    <div className="relative h-6 w-9 shrink-0">
      <div className="absolute left-0 top-0 h-6 w-6 rounded-full bg-[#0A0A0B]" />
      <div className="absolute left-3 top-0 h-6 w-6 rounded-full bg-[#FBF1E2] border-2 border-[#0A0A0B]" />
    </div>
  );
}

export function MockPaymentForm({ onSubmit, isLoading, totalAmount, currency: currencyCode }: MockPaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [flipped, setFlipped] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof PaymentFormData, string>>>({});

  const digits = cardNumber.replace(/\D/g, '');
  const brand = cardBrand(digits);
  const last4 = digits.slice(-4);

  function validate(): boolean {
    const next: Partial<Record<keyof PaymentFormData, string>> = {};
    if (digits.length < 13) next.cardNumber = 'Numéro de carte invalide';
    if (!cardHolderName.trim()) next.cardHolderName = 'Nom du titulaire requis';
    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) next.expiryDate = 'Date invalide (MM/AA)';
    if (!/^\d{3,4}$/.test(cvv)) next.cvv = 'CVC invalide';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ cardNumber: digits, cardHolderName, expiryDate, cvv });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Flip card visual — signature element, matches brand card language */}
      <div className="[perspective:1200px]">
        <div
          className="relative h-[196px] w-full max-w-sm mx-auto transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-[28px] p-6 flex flex-col justify-between [backface-visibility:hidden] shadow-[0_20px_44px_-16px_rgba(245,183,32,0.5)]"
            style={{ background: 'linear-gradient(135deg, #F9CE5B 0%, #F5B720 45%, #E0A30F 100%)' }}
          >
            <div className="flex items-start justify-between">
              <BrandMark />
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#0A0A0B]/60">
                {brand ?? 'carte'}
              </span>
            </div>

            <div className="font-bold text-2xl text-[#0A0A0B] tracking-[0.06em] tabular-nums">
              {cardNumber ? formatCardNumber(cardNumber) : '•••• •••• •••• ••••'}
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0A0A0B]/50">
                  Titulaire
                </p>
                <p className="text-sm font-bold text-[#0A0A0B] truncate max-w-[180px]">
                  {cardHolderName || 'NOM PRÉNOM'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0A0A0B]/50">
                  EXP date
                </p>
                <p className="text-sm font-bold text-[#0A0A0B] tabular-nums">{expiryDate || 'MM/AA'}</p>
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-[28px] [backface-visibility:hidden] overflow-hidden shadow-[0_20px_44px_-16px_rgba(0,0,0,0.5)]"
            style={{ transform: 'rotateY(180deg)', background: '#FBF1E2' }}
          >
            <div className="mt-7 h-11 w-full bg-[#0A0A0B]" />
            <div className="mt-6 px-6 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0A0A0B]/50">
                CVC
              </p>
              <div className="h-9 w-20 rounded-lg bg-white flex items-center justify-end px-3 shadow-inner">
                <span className="font-mono text-sm text-[#0A0A0B] tabular-nums">{cvv || '•••'}</span>
              </div>
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0A0A0B]/50">
                {last4 ? `•••• ${last4}` : '•••• ••••'}
              </span>
              <BrandMark />
            </div>
          </div>
        </div>
      </div>

      {/* Card number */}
      <div>
        <label htmlFor="cardNumber" className="block text-xs font-semibold text-[#B9B9C2] mb-1.5">
          Numéro de carte
        </label>
        <div className="relative">
          <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#63636B]" />
          <input
            id="cardNumber"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4111 1111 1111 1111"
            value={formatCardNumber(cardNumber)}
            onFocus={() => setFlipped(false)}
            onChange={(e) => setCardNumber(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-3 text-sm text-white placeholder:text-[#63636B] outline-none transition focus:border-[#F5B720] focus:ring-1 focus:ring-[#F5B720] font-mono tabular-nums"
          />
        </div>
        {errors.cardNumber && <p className="mt-1 text-xs text-[#FF6B57]">{errors.cardNumber}</p>}
      </div>

      {/* Cardholder */}
      <div>
        <label htmlFor="cardHolderName" className="block text-xs font-semibold text-[#B9B9C2] mb-1.5">
          Nom du titulaire
        </label>
        <input
          id="cardHolderName"
          autoComplete="cc-name"
          placeholder="NOM PRÉNOM"
          value={cardHolderName}
          onFocus={() => setFlipped(false)}
          onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-[#63636B] outline-none transition focus:border-[#F5B720] focus:ring-1 focus:ring-[#F5B720]"
        />
        {errors.cardHolderName && <p className="mt-1 text-xs text-[#FF6B57]">{errors.cardHolderName}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="expiryDate" className="block text-xs font-semibold text-[#B9B9C2] mb-1.5">
            Expiration
          </label>
          <input
            id="expiryDate"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            value={expiryDate}
            onFocus={() => setFlipped(false)}
            onChange={(e) => setExpiryDate(formatExpiry(e.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-[#63636B] outline-none transition focus:border-[#F5B720] focus:ring-1 focus:ring-[#F5B720] font-mono tabular-nums"
          />
          {errors.expiryDate && <p className="mt-1 text-xs text-[#FF6B57]">{errors.expiryDate}</p>}
        </div>

        <div>
          <label htmlFor="cvv" className="block text-xs font-semibold text-[#B9B9C2] mb-1.5">
            CVC
          </label>
          <input
            id="cvv"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={cvv}
            onFocus={() => setFlipped(true)}
            onBlur={() => setFlipped(false)}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-[#63636B] outline-none transition focus:border-[#F5B720] focus:ring-1 focus:ring-[#F5B720] font-mono tabular-nums"
          />
          {errors.cvv && <p className="mt-1 text-xs text-[#FF6B57]">{errors.cvv}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#F5B720] px-5 py-3.5 text-sm font-bold text-[#0A0A0B] transition hover:bg-[#FFC53D] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 border-[#0A0A0B]/30 border-t-[#0A0A0B] animate-spin" />
            Traitement en cours…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Payer {currency(totalAmount, currencyCode)}
          </>
        )}
      </button>
    </form>
  );
}