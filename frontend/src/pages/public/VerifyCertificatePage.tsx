import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  BadgeCheck,
  ShieldCheck,
  XCircle,
  Search as SearchIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { verifyCertificatePublic } from '@/api/certificates';
import type { PublicCertificateVerification } from '@/api/certificates';

const VALID_TONE = 'text-[#0A7A3F]';
const INVALID_TONE = 'text-[#B00020]';

export default function VerifyCertificatePage() {
  const shouldReduceMotion = useReducedMotion();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') ?? '');
  const [result, setResult] = useState<PublicCertificateVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doVerify = async (codeToCheck: string) => {
    const trimmed = codeToCheck.trim();
    if (!trimmed) {
      setError('Veuillez saisir un code de certificat.');
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await verifyCertificatePublic(trimmed);
      setResult(data);
    } catch {
      setError('Impossible de vérifier le certificat. Réessayez dans un instant.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading) void doVerify(code);
  };

  return (
    <div
      data-theme="dark"
      className="min-h-screen bg-[#0A0A0A] px-6 py-20 text-white lg:px-16 lg:py-28"
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <div className="mb-6 flex justify-center">
            <ShieldCheck className="h-14 w-14 text-[#1A73E8]" />
          </div>
          <motion.h1
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold font-heading uppercase tracking-tight lg:text-6xl"
          >
            Vérifier un certificat
          </motion.h1>
          <motion.p
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/60"
          >
            Saisissez le code présent sur le certificat (ex. CERT-AB12CD34EF) pour confirmer son
            authenticité auprès de son détenteur.
          </motion.p>
        </div>

        <motion.form
          onSubmit={onSubmit}
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code du certificat"
            aria-label="Code du certificat"
            className="flex-1 border-white/20 bg-white/5 text-white placeholder:text-white/40"
          />
          <Button
            type="submit"
            disabled={loading}
            className="font-heading text-sm font-semibold uppercase tracking-[0.08em] bg-white text-[#0A0A0A] hover:bg-[#1A73E8] hover:text-white"
          >
            {loading ? (
              'Vérification…'
            ) : (
              <span className="flex items-center gap-2">
                <SearchIcon className="h-4 w-4" />
                Vérifier
              </span>
            )}
          </Button>
        </motion.form>

        {error && (
          <p className="mt-4 rounded-lg border border-[#B00020]/40 bg-[#B00020]/10 px-4 py-3 text-sm text-[#FF8A80]">
            {error}
          </p>
        )}

        {result && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`mt-6 rounded-2xl border p-6 ${
              result.valid ? 'border-[#0A7A3F]/40 bg-[#0A7A3F]/10' : 'border-[#B00020]/40 bg-[#B00020]/10'
            }`}
          >
            <div className="mb-4 flex items-center gap-3">
              {result.valid ? (
                <BadgeCheck className="h-6 w-6 text-[#0A7A3F]" />
              ) : (
                <XCircle className="h-6 w-6 text-[#B00020]" />
              )}
              <span
                className={`text-sm font-bold uppercase tracking-[0.12em] ${
                  result.valid ? VALID_TONE : INVALID_TONE
                }`}
              >
                {result.valid ? 'Certificat authentique' : 'Certificat introuvable'}
              </span>
            </div>

            {result.valid ? (
              <dl className="space-y-2 text-sm text-white/85">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="w-36 shrink-0 uppercase tracking-wide text-white/45">Détenteur</dt>
                  <dd>{result.holderName}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="w-36 shrink-0 uppercase tracking-wide text-white/45">Formation</dt>
                  <dd>{result.courseTitle}</dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt className="w-36 shrink-0 uppercase tracking-wide text-white/45">Délivré le</dt>
                  <dd>{new Date(result.issuedAt ?? '').toLocaleDateString('fr-FR')}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-white/75">
                Aucun certificat ne correspond au code « {result.certificateCode} ». Vérifiez le
                code et réessayez, ou contactez l&apos;établissement qui a délivré le certificat.
              </p>
            )}
          </motion.div>
        )}

        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-white/50"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1A73E8]" />
          <p>
            Cette vérification est publique et ne demande pas de connexion. Seules des informations
            limitées (nom, formation, date) sont affichées — jamais l&apos;adresse e-mail ou le
            compte du détenteur.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
