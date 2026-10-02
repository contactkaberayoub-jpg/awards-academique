import { Wallet, ArrowUpRight, Building2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchInstructorEarnings,
  fetchInstructorCourseEarnings,
  fetchInstructorPayoutAccount,
  upsertInstructorPayoutAccount,
  fetchInstructorPayouts,
  requestPayout,
  type EarningsSummary,
  type EarningsByCourse,
  type PayoutAccount,
  type PayoutRequest,
} from '@/api/finance';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { EmptyState } from '@/components/admin/EmptyState';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/instructor/StatCard';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/formatDate';

function payoutBadgeVariant(status: PayoutRequest['status']) {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'REJECTED':
      return 'error';
    default:
      return 'default';
  }
}

function payoutStatusLabel(status: PayoutRequest['status']) {
  switch (status) {
    case 'PAID':
      return 'Payé';
    case 'PENDING':
      return 'En attente';
    case 'REJECTED':
      return 'Rejeté';
    default:
      return status;
  }
}

export default function InstructorEarningsPage() {
  const [earnings, setEarnings] = useState<EarningsSummary[]>([]);
  const [courseEarnings, setCourseEarnings] = useState<EarningsByCourse[]>([]);
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Account form state
  const [accountForm, setAccountForm] = useState<PayoutAccount>({
    fullName: '',
    country: 'Maroc',
    method: 'PAYPAL',
    paypalEmail: '',
    bankName: '',
    bankAccountName: '',
    iban: '',
    swift: '',
    currency: 'MAD',
  });

  // Request form state
  const [requestAmount, setRequestAmount] = useState<string>('');
  const [requestCurrency, setRequestCurrency] = useState<string>('MAD');
  const [requestNotes, setRequestNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eData, cData, aData, pData] = await Promise.all([
        fetchInstructorEarnings(),
        fetchInstructorCourseEarnings(),
        fetchInstructorPayoutAccount(),
        fetchInstructorPayouts(),
      ]);
      setEarnings(eData);
      setCourseEarnings(cData);
      setPayoutAccount(aData);
      if (aData) {
        setAccountForm(aData);
        // A payout may only be requested in the currency of the configured
        // payout account (the backend enforces this). Deriving the default from
        // the earnings array (as before) sent e.g. MAD while the account was in
        // USD, producing a 400 "ne correspond pas à votre compte de paiement".
        setRequestCurrency(aData.currency);
      }
      setPayouts(pData);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Erreur lors du chargement des finances.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await upsertInstructorPayoutAccount(accountForm);
      setPayoutAccount(updated);
      setIsAccountModalOpen(false);
      setSuccessMessage('Coordonnées de paiement enregistrées avec succès.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Impossible d’enregistrer les coordonnées.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(requestAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Veuillez saisir un montant valide.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
const effectiveCurrency = payoutAccount?.currency ?? requestCurrency;
    await requestPayout({
      requestedAmount: amount,
      currency: effectiveCurrency,
      notes: requestNotes.trim() || undefined,
    });
      setIsRequestModalOpen(false);
      setRequestAmount('');
      setRequestNotes('');
      setSuccessMessage('Demande de retrait soumise avec succès.');
      setTimeout(() => setSuccessMessage(null), 4000);
      void loadData();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Impossible de soumettre la demande de retrait.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loading label="Chargement de vos revenus et retraits..." />;
  }

  const commissionRate = earnings.length > 0 ? earnings[0].commissionRatePercent : null;

  // A payout request is always denominated in the payout account's currency
  // (the backend rejects any other value with a 400). The available balance is
  // therefore that currency's entry in the earnings summary, if any.
  const payoutCurrency = payoutAccount?.currency ?? null;
  const payoutAvailable = payoutCurrency
    ? earnings.find((e) => e.currency === payoutCurrency) ?? null
    : null;
  const payoutAvailableAmount = payoutAvailable?.availableAmount ?? 0;

  const columns: DataTableColumn<PayoutRequest>[] = [
    {
      key: 'requestedAt',
      header: 'Date',
      render: (p) => <span className="text-text-primary">{formatDate(p.requestedAt)}</span>,
    },
    {
      key: 'amount',
      header: 'Montant',
      render: (p) => (
        <span className="font-semibold text-text-primary">
          {p.requestedAmount.toFixed(2)} {p.currency}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Méthode',
      render: (p) => (
        <span className="text-xs uppercase font-medium bg-surface-secondary text-text-primary px-2 py-1 rounded-lg">
          {p.method}
        </span>
      ),
    },
    {
      key: 'destination',
      header: 'Destination',
      render: (p) => <span className="text-sm text-text-secondary">{p.destinationRef || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (p) => (
        <Badge variant={payoutBadgeVariant(p.status)} size="sm">
          {payoutStatusLabel(p.status)}
        </Badge>
      ),
    },
    {
      key: 'providerRef',
      header: 'Réf. Paiement',
      render: (p) => <span className="font-mono text-xs text-text-secondary">{p.providerRef || p.rejectionReason || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenus & Retraits"
        description="Gérez vos gains, vos coordonnées de paiement et vos demandes de retrait."
      />

      {errorMessage && <Notice type="error" message={errorMessage} />}
      {successMessage && <Notice type="success" message={successMessage} />}

      {/* Earnings KPIs per currency */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {earnings.length === 0 ? (
          <StatCard label="Gains disponibles" value="0.00 MAD" icon={Wallet} color="green" hint="Aucun revenu payé pour l'instant" />
        ) : (
          earnings.map((e) => (
            <div key={e.currency} className="bg-surface rounded-xl border border-border p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Devise : {e.currency}</span>
                <span className="text-xs bg-primary-tint text-primary font-semibold px-2 py-0.5 rounded-lg">Commission : {e.commissionRatePercent}%</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                <div>
                  <p className="text-xs text-text-secondary">Disponible</p>
                  <p className="text-xl font-bold text-success">{e.availableAmount.toFixed(2)} {e.currency}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Ventes brutes</p>
                  <p className="text-sm font-semibold text-text-primary">{e.grossRevenue.toFixed(2)} {e.currency}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">En attente</p>
                  <p className="text-sm font-semibold text-warning">{e.pendingAmount.toFixed(2)} {e.currency}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Déjà retiré</p>
                  <p className="text-sm font-semibold text-text-secondary">{e.paidOutAmount.toFixed(2)} {e.currency}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Actions: Configure account & Request payout */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-border">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-tint text-primary rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {payoutAccount ? `Compte de versement configuré (${payoutAccount.method})` : 'Aucun compte de versement configuré'}
            </p>
            <p className="text-xs text-text-secondary">
              {payoutAccount
                ? (payoutAccount.method === 'PAYPAL' ? payoutAccount.paypalEmail : payoutAccount.iban)
                : 'Configurez votre compte PayPal ou bancaire pour recevoir vos gains.'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="px-4 py-2 text-sm font-medium border border-border rounded-lg text-text-primary hover:bg-surface-secondary transition"
          >
            {payoutAccount ? 'Modifier le compte' : 'Configurer le compte'}
          </button>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            disabled={!payoutAccount}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Demander un retrait</span>
          </button>
        </div>
      </div>

      {/* Course Earnings Breakdown */}
      <div className="bg-surface rounded-xl border border-border p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-text-primary">Gains par cours</h3>
        {courseEarnings.length === 0 ? (
          <p className="text-sm text-text-secondary">Aucun cours payé n'a généré de commissions pour le moment.</p>
        ) : (
          <div className="divide-y divide-border">
            {courseEarnings.map((c) => (
              <div key={c.courseId} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-text-primary">{c.title}</p>
                  <p className="text-xs text-text-secondary">{c.orderCount} vente(s) payée(s) — Ventes brutes : {c.grossRevenue.toFixed(2)} {c.currency}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-success">+{c.earningsAmount.toFixed(2)} {c.currency}</p>
                  <p className="text-xs text-text-secondary">
                    {commissionRate !== null ? `Votre commission (${commissionRate}%)` : 'Votre commission'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout Requests History */}
      <div className="bg-surface rounded-xl border border-border p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-text-primary">Historique des demandes de retrait</h3>
        {payouts.length === 0 ? (
          <EmptyState title="Aucune demande de retrait" description="Vos demandes de retrait apparaîtront ici dès que vous en effectuerez une." />
        ) : (
          <DataTable columns={columns} data={payouts} getRowKey={(p) => p.id} />
        )}
      </div>

      {/* Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl border border-border max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-text-primary">Coordonnées de versement</h3>
            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  value={accountForm.fullName}
                  onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Pays</label>
                <input
                  type="text"
                  required
                  value={accountForm.country}
                  onChange={(e) => setAccountForm({ ...accountForm, country: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Méthode</label>
                  <select
                    value={accountForm.method}
                    onChange={(e) => setAccountForm({ ...accountForm, method: e.target.value as any })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm"
                  >
                    <option value="PAYPAL">PayPal</option>
                    <option value="BANK">Virement Bancaire</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Devise principale</label>
                  <select
                    value={accountForm.currency}
                    onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm"
                  >
                    <option value="MAD">MAD</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              {accountForm.method === 'PAYPAL' ? (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">E-mail PayPal</label>
                  <input
                    type="email"
                    required
                    value={accountForm.paypalEmail ?? ''}
                    onChange={(e) => setAccountForm({ ...accountForm, paypalEmail: e.target.value })}
                    placeholder="votre-compte@paypal.com"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Nom de la banque</label>
                    <input
                      type="text"
                      required
                      value={accountForm.bankName ?? ''}
                      onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Titulaire du compte</label>
                    <input
                      type="text"
                      required
                      value={accountForm.bankAccountName ?? ''}
                      onChange={(e) => setAccountForm({ ...accountForm, bankAccountName: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">IBAN / Numéro de compte</label>
                    <input
                      type="text"
                      required
                      value={accountForm.iban ?? ''}
                      onChange={(e) => setAccountForm({ ...accountForm, iban: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Code BIC / SWIFT</label>
                    <input
                      type="text"
                      required
                      value={accountForm.swift ?? ''}
                      onChange={(e) => setAccountForm({ ...accountForm, swift: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Payout Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl border border-border max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-text-primary">Demander un retrait</h3>
            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Devise</label>
                <div className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm">
                  {requestCurrency}
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {payoutAvailableAmount > 0
                    ? `Disponible : ${payoutAvailableAmount.toFixed(2)} ${requestCurrency}`
                    : `Aucun gain disponible dans la devise de votre compte de paiement (${requestCurrency}).`}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Montant à retirer</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={payoutAvailableAmount > 0 ? payoutAvailableAmount : undefined}
                  required
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Notes (optionnel)</label>
                <textarea
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  rows={3}
                  placeholder="Commentaire pour l'administrateur..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm resize-none"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || payoutAvailableAmount <= 0}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Soumettre la demande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
