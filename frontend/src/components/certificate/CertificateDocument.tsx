import { forwardRef } from 'react';
import { formatCertificateDate } from '@/lib/formatCertificateDate';

interface CertificateDocumentProps {
  studentName: string;
  courseTitle: string;
  instructorName: string | null;
  certificateCode: string;
  issuedAt: string;
}

const CertificateDocument = forwardRef<HTMLDivElement, CertificateDocumentProps>(
  function CertificateDocument(
    { studentName, courseTitle, instructorName, certificateCode, issuedAt },
    ref,
  ) {
    return (
      <div ref={ref} className="certificate-sheet">
        <div className="certificate-frame-outer" aria-hidden="true" />
        <div className="certificate-frame-inner" aria-hidden="true" />

        <span className="certificate-corner certificate-corner-tl" aria-hidden="true" />
        <span className="certificate-corner certificate-corner-tr" aria-hidden="true" />
        <span className="certificate-corner certificate-corner-bl" aria-hidden="true" />
        <span className="certificate-corner certificate-corner-br" aria-hidden="true" />

        <div className="certificate-content">
          <header className="certificate-header">
            <p className="certificate-eyebrow">Académie d'excellence</p>
            <h1 className="certificate-wordmark">Awards Académique</h1>
            <div className="certificate-divider" aria-hidden="true">
              <span className="certificate-divider-line" />
              <span className="certificate-divider-diamond" />
              <span className="certificate-divider-line" />
            </div>
            <h2 className="certificate-title">Certificat de réussite</h2>
          </header>

          <main className="certificate-body">
            <p className="certificate-body-label">Ce certificat est fièrement présenté à</p>
            <p className="certificate-student-name">{studentName}</p>
            <p className="certificate-body-label">pour avoir complété avec succès le cours</p>
            <p className="certificate-course-title">{courseTitle}</p>
          </main>

          <footer className="certificate-footer">
            <div className="certificate-meta">
              <p className="certificate-meta-label">Formateur</p>
              <p className="certificate-meta-value">{instructorName ?? 'Awards Académique'}</p>
            </div>
            <div className="certificate-meta certificate-meta-center">
              <p className="certificate-meta-label">Délivré le</p>
              <p className="certificate-meta-value">{formatCertificateDate(issuedAt)}</p>
            </div>
            <div className="certificate-meta">
              <p className="certificate-meta-label">Identifiant du certificat</p>
              <p className="certificate-meta-value certificate-code">{certificateCode}</p>
            </div>
          </footer>
        </div>
      </div>
    );
  },
);

export default CertificateDocument;