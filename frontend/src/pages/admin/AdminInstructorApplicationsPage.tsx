import { CheckCircle2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { instructorAdminApi } from '@/api/instructor';
import type { InstructorApplication, InstructorStatus } from '@/types';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { EmptyState } from '@/components/admin/EmptyState';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/instructor/StatusBadge';
import { formatDate } from '@/lib/formatDate';

type TabKey = 'ALL' | InstructorStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'PENDING', label: 'En attente' },
  { key: 'APPROVED', label: 'Approuvées' },
  { key: 'REJECTED', label: 'Rejetées' },
];

export default function AdminInstructorApplicationsPage() {
  const [applications, setApplications] = useState<InstructorApplication[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const loadData = useCallback(async (tab: TabKey) => {
    setIsLoading(true);
    try {
      const status: InstructorStatus | undefined =
        tab === 'ALL' ? undefined : tab;
      const response = await instructorAdminApi.list(status);
      setApplications(response.data);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(
        (err as any)?.response?.data?.message ||
          (err as any)?.message ||
          'Erreur lors du chargement des candidatures.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(activeTab);
  }, [activeTab, loadData]);

  const handleApprove = async (application: InstructorApplication) => {
    if (!window.confirm(
      `Approuver la candidature de ${application.firstName} ${application.lastName} ?`
    )) return;
    setErrorMessage(null);
    setIsSubmittingAction(true);
    try {
      await instructorAdminApi.approve(application.userId);
      setSuccessMessage('Candidature approuvée. Le formateur a été notifié.');
      setTimeout(() => setSuccessMessage(null), 4000);
      void loadData(activeTab);
    } catch (err) {
      setErrorMessage(
        (err as any)?.response?.data?.message || 'Impossible d’approuver la candidature.'
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId) return;
    setErrorMessage(null);
    setIsSubmittingAction(true);
    try {
      await instructorAdminApi.reject(rejectingId, rejectionReason.trim());
      setRejectingId(null);
      setRejectionReason('');
      setSuccessMessage('Candidature refusée. Le formateur a été notifié du motif.');
      setTimeout(() => setSuccessMessage(null), 4000);
      void loadData(activeTab);
    } catch (err) {
      setErrorMessage(
        (err as any)?.response?.data?.message || 'Impossible de refuser la candidature.'
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (isLoading) {
    return <Loading label="Chargement des candidatures..." />;
  }

  const columns: DataTableColumn<InstructorApplication>[] = [
    {
      key: 'instructor',
      header: 'Formateur',
      render: (a) => (
        <div>
          <p className="font-semibold text-text-primary">
            {a.firstName} {a.lastName}
          </p>
          <p className="text-xs text-text-muted">{a.email}</p>
        </div>
      ),
    },
    {
      key: 'submittedAt',
      header: 'Soumission',
      render: (a) => (
        <span className="text-text-secondary">{formatDate(a.submittedAt)}</span>
      ),
    },
    {
      key: 'expertise',
      header: 'Expertise / Titre',
      render: (a) => (
        <div className="max-w-52">
          {a.professionalTitle ? (
            <p className="font-medium text-text-primary">{a.professionalTitle}</p>
          ) : (
            <p className="text-text-muted italic">—</p>
          )}
          {a.expertise && (
            <p className="text-xs truncate text-text-muted">{a.expertise}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (a) => <StatusBadge status={a.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (a) => {
        if (a.status !== 'PENDING') {
          return (
            <span className="text-xs text-text-secondary">
              {a.status === 'REJECTED'
                ? `Rejetée — ${a.rejectionReason ?? 'motif non précisé'}`
                : a.reviewedAt
                  ? `Approuvée le ${formatDate(a.reviewedAt)}`
                  : 'Traitée'}
            </span>
          );
        }
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => void handleApprove(a)}
              disabled={isSubmittingAction}
              className="px-2.5 py-1 text-xs font-medium bg-success text-white rounded hover:bg-success/90 transition flex items-center space-x-1 disabled:opacity-60"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approuver</span>
            </button>
            <button
              onClick={() => setRejectingId(a.userId)}
              disabled={isSubmittingAction}
              className="px-2.5 py-1 text-xs font-medium bg-error text-white rounded hover:bg-error/90 transition flex items-center space-x-1 disabled:opacity-60"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Refuser</span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidatures de formateurs"
        description="Examinez les demandes de candidature et approuvez ou refusez les nouveaux formateurs."
      />

      {errorMessage && <Notice type="error" message={errorMessage} />}
      {successMessage && <Notice type="success" message={successMessage} />}

      <div className="flex items-center gap-2 border-b border-border pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-text-primary">
          {TABS.find((t) => t.key === activeTab)?.label} candidatures
        </h3>
        {applications.length === 0 ? (
          <EmptyState
            title="Aucune candidature de formateur."
            description="Les candidatures envoyées par les formateurs apparaîtront ici."
          />
        ) : (
          <DataTable
            columns={columns}
            data={applications}
            getRowKey={(a) => a.userId}
          />
        )}
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl border border-border max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-text-primary">Motif du refus</h3>
            <p className="text-xs text-text-secondary">
              Veuillez indiquer la raison du refus. Le formateur sera notifié de ce motif et
              pourra soumettre à nouveau sa candidature après correction.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Ex: Diplômes ou preuves d'expérience manquants..."
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
                  disabled={isSubmittingAction || !rejectionReason.trim()}
                  className="px-4 py-2 text-sm font-medium bg-error text-white rounded-lg hover:bg-error/90 disabled:opacity-60"
                >
                  Confirmer le refus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}