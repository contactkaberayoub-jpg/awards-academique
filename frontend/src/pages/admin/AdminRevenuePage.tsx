import { useEffect, useState } from 'react';
import { fetchAdminRevenue, fetchAdminInstructorEarnings, type RevenueSummary, type AdminInstructorEarnings } from '@/api/finance';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { EmptyState } from '@/components/admin/EmptyState';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/ui/Badge';

export default function AdminRevenuePage() {
  const [revenue, setRevenue] = useState<RevenueSummary[]>([]);
  const [instructorEarnings, setInstructorEarnings] = useState<AdminInstructorEarnings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [rData, ieData] = await Promise.all([fetchAdminRevenue(), fetchAdminInstructorEarnings()]);
        setRevenue(rData);
        setInstructorEarnings(ieData);
        setErrorMessage(null);
      } catch (err: any) {
        setErrorMessage(err?.response?.data?.message || err?.message || 'Erreur lors du chargement des revenus.');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  if (isLoading) {
    return <Loading label="Chargement des rapports financiers..." />;
  }

  const columns: DataTableColumn<AdminInstructorEarnings>[] = [
    {
      key: 'instructor',
      header: 'Instructeur',
      render: (row) => (
        <div>
          <p className="font-semibold text-text-primary">{row.instructorName}</p>
          <p className="text-xs text-text-secondary">{row.instructorEmail}</p>
        </div>
      ),
    },
    {
      key: 'currency',
      header: 'Devise',
      render: (row) => <span className="font-medium text-text-primary">{row.currency}</span>,
    },
    {
      key: 'gross',
      header: 'Ventes Brutes',
      render: (row) => <span className="text-text-primary">{row.grossRevenue.toFixed(2)} {row.currency}</span>,
    },
    {
      key: 'earnings',
      header: 'Gains (2%)',
      render: (row) => <span className="font-bold text-success">{row.earningsAmount.toFixed(2)} {row.currency}</span>,
    },
    {
      key: 'available',
      header: 'Disponible',
      render: (row) => <span className="font-semibold text-brand">{row.availableAmount.toFixed(2)} {row.currency}</span>,
    },
    {
      key: 'paid',
      header: 'Déjà payé',
      render: (row) => <span className="text-text-secondary">{row.paidOutAmount.toFixed(2)} {row.currency}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenus de la Plateforme"
        description="Vue d'ensemble de tous les encaissements, des volumes de vente et des commissions dues aux instructeurs."
      />

      {errorMessage && <Notice type="error" message={errorMessage} />}

      {/* Global Revenue Summaries */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {revenue.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border p-5 text-text-secondary">Aucun revenu enregistré.</div>
        ) : (
          revenue.map((r) => (
            <div key={r.currency} className="bg-surface rounded-xl border border-border p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-secondary uppercase">Devise : {r.currency}</span>
                <Badge variant="success" size="sm">{r.paidCount} payées</Badge>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{r.paidAmount.toFixed(2)} {r.currency}</p>
                <p className="text-xs text-text-secondary">Chiffre d'affaires encaissé (total : {r.totalAmount.toFixed(2)} {r.currency})</p>
              </div>
              <div className="pt-2 border-t border-border flex justify-between text-xs text-text-secondary">
                <span>En attente : {r.pendingCount}</span>
                <span>Échouées/Remboursées : {r.failedCount}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Instructor Earnings Breakdown */}
      <div className="bg-surface rounded-xl border border-border p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-text-primary">Gains par instructeur</h3>
        {instructorEarnings.length === 0 ? (
          <EmptyState title="Aucun gain instructeur" description="Les commissions des instructeurs apparaîtront ici." />
        ) : (
          <DataTable columns={columns} data={instructorEarnings} getRowKey={(row) => `${row.instructorId}-${row.currency}`} />
        )}
      </div>
    </div>
  );
}
