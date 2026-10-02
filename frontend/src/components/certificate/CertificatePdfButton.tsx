import { Download } from 'lucide-react';
import { useRef, useState } from 'react';
import { adminApi } from '@/api/admin';
import type { StudentCertificate } from '@/api/certificates';
import { Button } from '@/components/ui/Button';
import { downloadCertificatePdf } from '@/lib/exportCertificatePdf';
import CertificateDocument from './CertificateDocument';

interface CertificatePdfButtonProps {
  certificate: StudentCertificate;
  instructorName?: string | null;
}

/**
 * Renders the real certificate off-screen (natural A4 size) and exports it
 * to `certificate-{code}.pdf`. The instructor can be passed in when already
 * loaded; otherwise it is fetched on demand — no extra calls up front.
 */
export function CertificatePdfButton({
  certificate,
  instructorName,
}: CertificatePdfButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [renderInstructor, setRenderInstructor] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleClick = async () => {
    if (exporting) {
      return;
    }
    setExporting(true);
    try {
      let instructor = instructorName ?? null;
      if (instructor == null) {
        const course = await adminApi.getCourseById(certificate.courseId);
        instructor = course.data.instructorName ?? null;
      }
      setRenderInstructor(instructor);
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      if (sheetRef.current) {
        await downloadCertificatePdf(sheetRef.current, certificate.certificateCode);
      }
    } finally {
      setRenderInstructor(null);
      setExporting(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleClick} loading={exporting}>
        <Download className="h-4 w-4" aria-hidden="true" />
        Télécharger PDF
      </Button>

      {renderInstructor !== null && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -left-[20000px] top-0 -z-10"
        >
          <CertificateDocument
            ref={sheetRef}
            studentName={certificate.userName}
            courseTitle={certificate.courseTitle}
            instructorName={renderInstructor}
            certificateCode={certificate.certificateCode}
            issuedAt={certificate.issuedAt}
          />
        </div>
      )}
    </>
  );
}