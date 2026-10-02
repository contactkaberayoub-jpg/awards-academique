import { ArrowLeft, Award, Download, Loader2, Printer } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { findMyCertificateById } from '@/api/certificates';
import CertificateDocument from '@/components/certificate/CertificateDocument';
import { downloadCertificatePdf } from '@/lib/exportCertificatePdf';

const SHEET_WIDTH_PX = (297 / 25.4) * 96; // 297mm @ 96dpi
const SHEET_HEIGHT_PX = (210 / 25.4) * 96; // 210mm @ 96dpi

function useFitScale() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const measure = useCallback(() => {
    const availableWidth = sceneRef.current?.clientWidth ?? window.innerWidth - 64;
    setScale(Math.min(1, Math.max(0.3, (availableWidth - 64) / SHEET_WIDTH_PX)));
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  return { sceneRef, scale };
}

export default function StudentCertificateViewPage() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const sheetRef = useRef<HTMLDivElement>(null);
  const { sceneRef, scale } = useFitScale();
  const [exporting, setExporting] = useState(false);

  const certificateQuery = useQuery({
    queryKey: ['certificates', 'mine', certificateId],
    queryFn: () => findMyCertificateById(certificateId ?? ''),
    staleTime: 60000,
  });

  const certificate = certificateQuery.data ?? null;

  const courseQuery = useQuery({
    queryKey: ['courses', certificate?.courseId],
    queryFn: () => adminApi.getCourseById(certificate!.courseId).then((res) => res.data),
    enabled: Boolean(certificate),
    staleTime: 60000,
  });

  const handleDownloadPdf = async () => {
    if (exporting || !sheetRef.current || !certificate) {
      return;
    }
    setExporting(true);
    try {
      await downloadCertificatePdf(sheetRef.current, certificate.certificateCode);
    } finally {
      setExporting(false);
    }
  };

  const isLoading = certificateQuery.isLoading;
  const isUnavailable = !isLoading && (certificateQuery.isError || !certificate);

  return (
    <div className="certificate-pdf-page min-h-screen bg-background">
      <div className="no-print border-b border-border bg-surface/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/student/certificates"
            className="inline-flex h-9 items-center gap-2 rounded-sm px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Mes certificats
          </Link>

          {certificate && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={exporting}
                className="inline-flex h-9 items-center gap-1.5 rounded-sm px-3.5 text-sm font-medium text-white shadow-sm transition-all duration-fast hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: '#0F766E' }}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="h-4 w-4" aria-hidden="true" />
                )}
                Télécharger PDF
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border-strong bg-surface px-3.5 text-sm font-medium text-text-primary transition-all duration-fast hover:bg-surface-secondary active:scale-[0.98]"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                Imprimer
              </button>
            </div>
          )}
        </div>
      </div>

      <main className="certificate-scene">
        {isLoading ? (
          <div className="flex min-h-64 w-full flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-text-muted" aria-hidden="true" />
            <p className="text-sm text-text-secondary">Chargement du certificat...</p>
          </div>
        ) : isUnavailable ? (
          <div className="no-print mx-auto w-full max-w-xl py-16 text-center">
            <Award className="mx-auto h-10 w-10 text-text-muted" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-bold tracking-tight text-text-primary">
              Certificat indisponible
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Ce certificat n'existe pas ou n'est pas associé à votre compte. Un certificat
              apparaît ici uniquement une fois le cours terminé et l'examen final réussi.
            </p>
            <Link
              to="/student/certificates"
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-sm px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-fast hover:-translate-y-0.5 hover:shadow-md"
              style={{ backgroundColor: '#0F766E' }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Retour à mes certificats
            </Link>
          </div>
        ) : certificate ? (
          <div
            ref={sceneRef}
            style={{ width: SHEET_WIDTH_PX * scale, height: SHEET_HEIGHT_PX * scale }}
          >
            <div
              className="certificate-scaler"
              style={{
                width: SHEET_WIDTH_PX,
                height: SHEET_HEIGHT_PX,
                transform: `scale(${scale})`,
              }}
            >
              <CertificateDocument
                ref={sheetRef}
                studentName={certificate.userName}
                courseTitle={certificate.courseTitle}
                instructorName={courseQuery.data?.instructorName ?? null}
                certificateCode={certificate.certificateCode}
                issuedAt={certificate.issuedAt}
              />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}