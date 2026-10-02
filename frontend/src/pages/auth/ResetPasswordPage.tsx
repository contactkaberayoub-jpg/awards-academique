import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../../auth/authApi';
import { resetPasswordSchema } from '../../auth/validation';
import { getApiErrorMessage } from '../../lib/apiError';
import { AuthCard } from '../../components/auth/AuthCard';
import { AuthBrandPanel } from '../../components/auth/AuthBrandPanel';
import { PasswordField } from '../../components/auth/PasswordField';
import { SubmitButton } from '../../components/auth/SubmitButton';
import { APIError } from '../../components/auth/APIError';

type ResetPasswordFormInputs = {
  newPassword: string;
  confirmPassword: string;
};

type ResetStatus = 'idle' | 'success' | 'error' | 'missing-token';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<ResetStatus>(
    token ? 'idle' : 'missing-token'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setStatus('missing-token');
  }, [token]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormInputs>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormInputs) => {
    if (!token) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await authApi.resetPassword(token, data.newPassword);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        getApiErrorMessage(
          error,
          'Impossible de réinitialiser votre mot de passe. Veuillez réessayer.'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      brandPanel={
        <AuthBrandPanel
          heading="Nouveau mot de passe"
          subheading="Choisissez un mot de passe robuste pour sécuriser votre compte Awards Académique."
          footerPrompt="Pas encore de compte ?"
          footerLinkLabel="Créer un compte"
          footerLinkTo="/register"
        />
      }
    >
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          {status === 'success'
            ? 'Mot de passe réinitialisé'
            : 'Définir un nouveau mot de passe'}
        </h1>
      </div>

      {status === 'missing-token' && (
        <div className="space-y-4">
          <p
            role="alert"
            className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm font-medium text-error"
          >
            Le lien de réinitialisation est incomplet. Utilisez le lien reçu
            dans votre e-mail.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block text-sm font-semibold text-text-primary underline underline-offset-2"
          >
            Demander un nouveau lien
          </Link>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-6">
          <p className="text-sm leading-relaxed text-text-secondary">
            Votre mot de passe a été réinitialisé avec succès. Vous pouvez
            maintenant vous connecter avec votre nouveau mot de passe.
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
        <div className="space-y-5">
          <p
            role="alert"
            className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm font-medium text-error"
          >
            {errorMessage}
          </p>
          <p className="text-sm text-text-secondary">
            Le lien peut avoir expiré (il est valable 30 minutes) ou avoir déjà
            été utilisé.
          </p>
          <Link
            to="/forgot-password"
            className="flex w-full items-center justify-center rounded-sm border border-primary bg-transparent py-3.5 text-[15px] font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            Demander un nouveau lien
          </Link>
          <p className="text-center text-sm text-text-secondary">
            <Link
              to="/login"
              className="font-semibold text-text-primary underline underline-offset-2"
            >
              Retour à la connexion
            </Link>
          </p>
        </div>
      )}

      {status === 'idle' && (
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-5">
            <PasswordField
              id="newPassword"
              label="Nouveau mot de passe"
              autoComplete="new-password"
              placeholder="Nouveau mot de passe"
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <PasswordField
              id="confirmPassword"
              label="Confirmer le mot de passe"
              autoComplete="new-password"
              placeholder="Confirmer le mot de passe"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </div>

          <APIError message={errorMessage} />

          <SubmitButton
            isLoading={isSubmitting}
            loadingLabel="Enregistrement..."
          >
            Réinitialiser le mot de passe
          </SubmitButton>

          <p className="text-center text-sm text-text-secondary">
            <Link
              to="/forgot-password"
              className="font-semibold text-text-primary underline underline-offset-2"
            >
              Demander un nouveau lien
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}