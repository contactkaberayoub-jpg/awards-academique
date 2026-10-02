import { CheckCircle2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminPayouts,
  confirmPayout,
  rejectPayout,
  type PayoutRequest,
} from '@/api/finance';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { EmptyState } from '@/components/admin/EmptyState';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/formatDate';

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reject modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      setPayouts(await fetchAdminPayouts());
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Erreur lors du chargement des demandes de retrait.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleConfirm = async (id: string) => {
    if (!window.confirm('Confirmer et exécuter ce versement ?')) return;
    setErrorMessage(null);
    try {
      await confirmPayout(id);
      setSuccessMessage('Versement confirmé et exécuté avec succès.');
      setTimeout(() => setSuccessMessage(null), 4000);
      void loadData();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Impossible de confirmer le versement.');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId) return;
    setErrorMessage(null);
    try {
      await rejectPayout(rejectingId, rejectionReason.trim());
      setRejectingId(null);
      setRejectionReason('');
      setSuccessMessage('Demande de retrait rejetée. Les fonds ont été restitués à l’instructeur.');
      setTimeout(() => setSuccessMessage(null), 4000);
      void loadData();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Impossible de rejeter la demande.');
    }
  };

  if (isLoading) {
    return <Loading label="Chargement des demandes de retrait..." />;
  }

  const columns: DataTableColumn<PayoutRequest>[] = [
    {
      key: 'instructor',
      header: 'Instructeur',
      render: (p) => <span className="font-semibold text-text-primary">{p.instructorName}</span>,
    },
    {
      key: 'requestedAt',
      header: 'Date',
      render: (p) => <span className="text-text-secondary">{formatDate(p.requestedAt)}</span>,
    },
    {
      key: 'amount',
      header: 'Montant',
      render: (p) => (
        <span className="font-bold text-text-primary">
          {p.requestedAmount.toFixed(2)} {p.currency}
        </span>
      ),
    },
    {
      key: 'destination',
      header: 'Méthode & Destination',
      render: (p) => (
        <div>
          <span className="text-xs uppercase font-medium bg-surface-hover px-1.5 py-0.5 rounded mr-2">{p.method}</span>
          <span className="text-xs text-text-secondary">{p.destinationRef || '—'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (p) => {
        const variant = p.status === 'PAID' ? 'success' : p.status === 'PENDING' ? 'warning' : 'error';
        return <Badge variant={variant} size="sm">{p.status}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (p) => {
        if (p.status !== 'PENDING') {
          return <span className="text-xs text-text-secondary font-mono">{p.providerRef || p.rejectionReason || 'Traité'}</span>;
        }
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleConfirm(p.id)}
              className="px-2.5 py-1 text-xs font-medium bg-success text-white rounded hover:bg-success/90 transition flex items-center space-x-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirmer</span>
            </button>
            <button
              onClick={() => setRejectingId(p.id)}
              className="px-2.5 py-1 text-xs font-medium bg-error text-white rounded hover:bg-error/90 transition flex items-center space-x-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Rejeter</span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Versements (Payouts)"
        description="Examinez et approuvez les demandes de retrait des instructeurs."
      />

      {errorMessage && <Notice type="error" message={errorMessage} />}
      {successMessage && <Notice type="success" message={successMessage} />}

      <div className="bg-surface rounded-xl border border-border p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-text-primary">Toutes les demandes de retrait</h3>
        {payouts.length === 0 ? (
          <EmptyState title="Aucune demande de retrait" description="Les demandes des instructeurs apparaîtront ici." />
        ) : (
          <DataTable columns={columns} data={payouts} getRowKey={(p) => p.id} />
        )}
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl border border-border max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-text-primary">Motif du rejet</h3>
            <p className="text-xs text-text-secondary">
              Veuillez indiquer pourquoi cette demande de retrait est rejetée. Les fonds seront automatiquement recrédités au solde de l'instructeur.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Ex: Coordonnées bancaires erronées..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm resize-none"
              />
              <div className="flex justify-end space-x-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingId(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-error text-white rounded-lg hover:bg-error/90"
                >
                  Confirmer le rejet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
