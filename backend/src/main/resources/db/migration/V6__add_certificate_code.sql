-- Adds the certificate_code column to the certificates table.
-- The column was added to the Certificate entity, but the shared database
-- already contained a certificates table created before it existed.
ALTER TABLE public.certificates
    ADD COLUMN IF NOT EXISTS certificate_code VARCHAR(100);

-- Backfill legacy rows with a deterministic code derived from the row id,
-- matching the "CERT-" prefix used by CertificateServiceImpl.generateCode().
UPDATE public.certificates
SET certificate_code = 'CERT-' || UPPER(REPLACE(id::text, '-', ''))
WHERE certificate_code IS NULL;

ALTER TABLE public.certificates
    ALTER COLUMN certificate_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_certificates_certificate_code
    ON public.certificates (certificate_code);
