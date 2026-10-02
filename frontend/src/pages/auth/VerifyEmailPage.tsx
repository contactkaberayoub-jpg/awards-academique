import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../auth/authApi';
import { getApiErrorMessage } from '../../lib/apiError';
import { AuthCard } from '../../components/auth/AuthCard';
import { AuthBrandPanel } from '../../components/auth/AuthBrandPanel';

type VerifyStatus = 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<VerifyStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const verify = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage(
          "Le lien de vérification est incomplet. Utilisez le lien reçu dans votre e-mail."
        );
        return;
      }
      try {
        await authApi.verifyEmail(token);
        setStatus('success');
      } catch (error) {
        setStatus('error');
        setErrorMessage(
          getApiErrorMessage(
            error,
            'La vérification de votre adresse e-mail a échoué. Veuillez réessayer.'
          )
        );
      }
    };

    void verify();
  }, [token]);

  return (
    <AuthCard
      brandPanel={
        <AuthBrandPanel
          heading="Vérification"
          subheading="Confirmez votre adresse e-mail pour activer votre compte Awards Académique."
          footerPrompt="Déjà membre ?"
          footerLinkLabel="Se connecter"
          footerLinkTo="/login"
        />
      }
    >
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          {status === 'verifying' && 'Vérification en cours…'}
          {status === 'success' && 'Adresse vérifiée !'}
          {status === 'error' && 'Vérification impossible'}
        </h1>
      </div>

      {status === 'verifying' && (
        <p className="text-sm text-text-secondary">
          Nous confirmons votre adresse e-mail, un instant…
        </p>
      )}

      {status === 'success' && (
        <div className="space-y-6">
          <p className="text-sm text-text-secondary">
            Votre adresse e-mail est vérifiée. Vous pouvez maintenant vous
            connecter à votre compte.
          </p>
          <Link
            to="/login"
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground transition-all duration-normal hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-md active:translate-y-0 active:shadow-none"
          >
            Se connecter
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          {errorMessage && (
            <p
              role="alert"
              className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm font-medium text-error"
            >
              {errorMessage}
            </p>
          )}
          <p className="text-sm text-text-secondary">
            {token
              ? 'Le lien peut avoir expiré (il est valable 24 heures).'
              : 'Revenez à l’e-mail que vous avez reçu et cliquez sur le bouton de vérification.'}
          </p>
          <Link
            to="/login"
            className="inline-block text-sm font-semibold text-text-primary underline underline-offset-2"
          >
            Retour à la connexion
          </Link>
        </div>
      )}
    </AuthCard>
  );
}