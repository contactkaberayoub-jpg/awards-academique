import { Award, BadgeCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchInstructorCertificates,
  type InstructorCertificate,
  type InstructorCertificatesData,
} from '@/api/certificates';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { EmptyState } from '@/components/admin/EmptyState';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/instructor/StatCard';
import { formatDate } from '@/lib/formatDate';

const columns: DataTableColumn<InstructorCertificate>[] = [
  {
    key: 'certificateCode',
    header: 'Code',
    render: (certificate) => (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-text-primary">
        <BadgeCheck className="h-4 w-4 text-success" />
        {certificate.certificateCode}
      </span>
    ),
  },
  {
    key: 'course',
    header: 'Cours',
    render: (certificate) => <span className="font-medium text-text-primary">{certificate.courseTitle}</span>,
  },
  {
    key: 'student',
    header: 'Étudiant',
    render: (certificate) => (
      <div>
        <p className="text-text-primary">{certificate.studentName}</p>
        <p className="text-xs text-text-secondary">{certificate.studentEmail}</p>
      </div>
    ),
  },
  {
    key: 'issuedAt',
    header: 'Délivré le',
    render: (certificate) => <span className="text-text-secondary">{formatDate(certificate.issuedAt)}</span>,
  },
];

export default function InstructorCertificatesPage() {
  const [data, setData] = useState<InstructorCertificatesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      setData(await fetchInstructorCertificates());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger vos certificats.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (isLoading) {
    return <Loading label="Chargement de vos certificats..." />;
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader title="Certificats" description="Certificats attribués aux étudiants qui ont terminé vos cours." />
        <Notice type="error" message={errorMessage} />
      </div>
    );
  }

  const certificates = data?.certificates ?? [];
  const hasCertificates = certificates.length > 0;

  return (
    <div>
      <PageHeader title="Certificats" description="Récompenses obtenues par les étudiants qui terminent vos cours." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatCard label="Certificats au total" value={data?.totalCertificates ?? 0} icon={Award} color="green" hint="Délivrés aux étudiants" />
        <StatCard
          label="Récemment délivrés"
          value={data?.recentCertificates.length ?? 0}
          icon={BadgeCheck}
          color="blue"
          hint="3 derniers certificats"
        />
      </div>

      {!hasCertificates ? (
        <div className="mt-6">
          <EmptyState title="Aucun certificat pour le moment" description="Les certificats sont délivrés automatiquement quand un étudiant termine un cours." />
        </div>
      ) : (
        <div className="mt-6">
          <DataTable columns={columns} data={certificates} getRowKey={(certificate) => certificate.id} />
        </div>
      )}
    </div>
  );
}
