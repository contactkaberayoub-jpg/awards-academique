import { Award, BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchMyCertificates } from '@/api/certificates';
import { CertificatePdfButton } from '@/components/certificate/CertificatePdfButton';
import { Card } from '@/components/ui/Card';
import { formatCertificateDate } from '@/lib/formatCertificateDate';

const ACCENT = '#0F766E';

export default function StudentCertificatesPage() {
  const {
    data: certificates,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['certificates', 'mine'],
    queryFn: fetchMyCertificates,
    staleTime: 60000,
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className="text-2xs font-semibold uppercase tracking-wider"
            style={{ color: ACCENT }}
          >
            Vos récompenses
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            Mes certificats
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Les certificats délivrés pour les cours que vous avez terminés avec succès.
          </p>
        </div>
      </div>

      {error ? (
        <Card className="py-12 text-center">
          <p className="text-sm text-text-secondary">
            Impossible de charger vos certificats pour le moment.
          </p>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="h-40 animate-pulse" />
          ))}
        </div>
      ) : !certificates || certificates.length === 0 ? (
        <Card className="py-14 text-center">
          <Award className="mx-auto h-9 w-9 text-text-muted" aria-hidden="true" />
          <p className="mt-4 text-sm font-medium text-text-primary">
            Aucun certificat pour le moment
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Terminez un cours (leçons incluses, quiz réussis et examen final passé) pour obtenir votre certificat.
          </p>
          <Link
            to="/courses"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-sm px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-fast hover:-translate-y-0.5 hover:shadow-md"
            style={{ backgroundColor: ACCENT }}
          >
            Parcourir les cours
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {certificates.map((certificate) => (
            <Card
              key={certificate.id}
              className="flex flex-col gap-4 p-5 transition-shadow duration-normal hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${ACCENT}1F`, color: ACCENT }}
                  >
                    <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-medium leading-snug text-text-primary">
                      {certificate.courseTitle}
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      Délivré le {formatCertificateDate(certificate.issuedAt)}
                    </p>
                  </div>
                </div>
              </div>

              <p className="font-mono text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {certificate.certificateCode}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-2">
                <Link
                  to={`/student/certificates/${certificate.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-sm px-3.5 text-sm font-medium text-white shadow-sm transition-all duration-fast hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                  style={{ backgroundColor: ACCENT }}
                >
                  Voir le certificat
                </Link>
                <CertificatePdfButton certificate={certificate} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}