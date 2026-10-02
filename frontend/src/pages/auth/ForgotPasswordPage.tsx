import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { authApi } from '../../auth/authApi';
import { forgotPasswordSchema } from '../../auth/validation';
import { getApiErrorMessage } from '../../lib/apiError';
import { AuthCard } from '../../components/auth/AuthCard';
import { AuthBrandPanel } from '../../components/auth/AuthBrandPanel';
import { FormField } from '../../components/auth/FormField';
import { SubmitButton } from '../../components/auth/SubmitButton';
import { APIError } from '../../components/auth/APIError';

type ForgotPasswordFormInputs = {
  email: string;
};

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormInputs>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormInputs) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await authApi.forgotPassword(data.email);
      setSubmitted(true);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'Impossible d’envoyer le lien. Veuillez réessayer.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      brandPanel={
        <AuthBrandPanel
          heading="Mot de passe oublié ?"
          subheading="Nous vous enverrons un lien pour réinitialiser votre mot de passe Awards Académique."
          footerPrompt="Vous vous souvenez de votre mot de passe ?"
          footerLinkLabel="Se connecter"
          footerLinkTo="/login"
        />
      }
    >
      {submitted ? (
        <div className="space-y-5">
          <div className="mb-8">
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              Vérifiez votre boîte de réception
            </h1>
          </div>
          <div className="rounded-md border border-success/30 bg-success/10 px-4 py-3">
            <p className="text-sm leading-relaxed text-text-primary">
              Si un compte existe avec cette adresse e-mail, un lien de
              réinitialisation de mot de passe vous a été envoyé. Vérifiez
              également vos courriers indésirables.
            </p>
          </div>
          <p className="text-sm text-text-secondary">
            Le lien est valable 30 minutes. N’avez-vous toujours rien reçu ?
            Vérifiez que l’adresse saisie est correcte et réessayez.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="w-full rounded-sm border border-primary bg-transparent py-3 text-[15px] font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            Réessayer
          </button>
          <p className="text-center text-sm text-text-secondary">
            <Link
              to="/login"
              className="font-semibold text-text-primary underline underline-offset-2"
            >
              Retour à la connexion
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              Réinitialiser le mot de passe
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Saisissez l’adresse e-mail de votre compte. Nous vous enverrons un
              lien sécurisé pour choisir un nouveau mot de passe.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormField
              id="email"
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="E-mail"
              error={errors.email?.message}
              {...register('email')}
            />

            <APIError message={errorMessage} />

            <SubmitButton
              isLoading={isSubmitting}
              loadingLabel="Envoi en cours..."
            >
              Envoyer le lien
            </SubmitButton>

            <p className="text-center text-sm text-text-secondary">
              <Link
                to="/login"
                className="font-semibold text-text-primary underline underline-offset-2"
              >
                Retour à la connexion
              </Link>
            </p>
          </form>
        </>
      )}
    </AuthCard>
  );
}