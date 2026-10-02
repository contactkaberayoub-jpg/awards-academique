import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { authApi } from '../../auth/authApi';
import { resolvePostLoginDestination } from '../../auth/roleRoutes';
import { registerSchema } from '../../auth/validation';
import { getApiErrorMessage } from '../../lib/apiError';
import { AuthCard } from '../../components/auth/AuthCard';
import { AuthBrandPanel } from '../../components/auth/AuthBrandPanel';
import { FormField } from '../../components/auth/FormField';
import { PasswordField } from '../../components/auth/PasswordField';
import { Checkbox } from '../../components/auth/Checkbox';
import { SubmitButton } from '../../components/auth/SubmitButton';
import { APIError } from '../../components/auth/APIError';
import { AuthDivider } from '../../components/auth/AuthDivider';
import { SocialButtons } from '../../components/auth/SocialButtons';

type RegisterFormInputs = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
};

export default function RegisterPage() {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const redirectParam = new URLSearchParams(location.search).get('redirect');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
  });

  const onSubmit = async (data: RegisterFormInputs) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const authenticatedUser = await registerAuth({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      if (!authenticatedUser.emailVerified) {
        setRegisteredEmail(authenticatedUser.email);
        setIsSubmitting(false);
        return;
      }
      const destination = resolvePostLoginDestination(
        authenticatedUser.role,
        redirectParam
      );
      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'Impossible de créer votre compte. Veuillez réessayer.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setIsResending(true);
    setResendMessage(null);
    try {
      await authApi.resendVerification(registeredEmail);
      setResendMessage('Un nouvel e-mail de vérification a été envoyé.');
    } catch (error) {
      setResendMessage(
        getApiErrorMessage(
          error,
          'Impossible d’envoyer un nouvel e-mail. Réessayez plus tard.'
        )
      );
    } finally {
      setIsResending(false);
    }
  };

  if (registeredEmail) {
    return (
      <AuthCard
        brandPanel={
          <AuthBrandPanel
            heading="Vérifiez votre e-mail"
            subheading="Activez votre compte en confirmant votre adresse e-mail."
            footerPrompt="Déjà compatible ?"
            footerLinkLabel="Se connecter"
            footerLinkTo="/login"
          />
        }
      >
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Vérifiez votre boîte de réception
          </h1>
        </div>
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-text-secondary">
            Un e-mail de vérification a été envoyé à{' '}
            <span className="font-semibold text-text-primary">
              {registeredEmail}
            </span>
            . Cliquez sur le bouton de confirmation pour activer votre compte.
          </p>

          <div className="rounded-md border border-border bg-surface-muted px-4 py-3">
            <p className="text-sm text-text-secondary">
              Vous n’avez rien reçu ? Vérifiez vos courriers indésirables ou
              demandez un nouvel e-mail.
            </p>
          </div>

          <button
            type="button"
            disabled={isResending}
            onClick={handleResend}
            className="w-full rounded-sm border border-primary bg-transparent py-3 text-[15px] font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isResending ? 'Envoi en cours…' : 'Renvoyer l’e-mail de vérification'}
          </button>

          {resendMessage && (
            <p
              role="status"
              className="text-center text-sm font-medium text-text-secondary"
            >
              {resendMessage}
            </p>
          )}

          <p className="text-center text-sm text-text-secondary">
            Vous pouvez aussi{' '}
            <Link
              to="/login"
              className="font-semibold text-text-primary underline underline-offset-2"
            >
              vous connecter
            </Link>{' '}
            une fois votre adresse confirmée.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      brandPanel={
        <AuthBrandPanel
          heading="Bienvenue !"
          subheading="Créez un compte pour obtenir des certificats et suivre votre progression."
          footerPrompt="Déjà membre ?"
          footerLinkLabel="Se connecter"
          footerLinkTo="/login"
        />
      }
    >
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Créer un compte
        </h1>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="firstName"
              label="Prénom"
              autoComplete="given-name"
              placeholder="Prénom"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <FormField
              id="lastName"
              label="Nom"
              autoComplete="family-name"
              placeholder="Nom"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>
          <FormField
            id="email"
            label="E-mail (*)"
            type="email"
            autoComplete="email"
            placeholder="E-mail"
            error={errors.email?.message}
            {...register('email')}
          />
          <div className="grid grid-cols-2 gap-4">
            <PasswordField
              id="password"
              label="Mot de passe (*)"
              autoComplete="new-password"
              placeholder="Mot de passe"
              error={errors.password?.message}
              {...register('password')}
            />
            <PasswordField
              id="confirmPassword"
              label="Confirmer le mot de passe (*)"
              autoComplete="new-password"
              placeholder="Confirmer le mot de passe"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Checkbox
            id="termsAccepted"
            aria-invalid={!!errors.termsAccepted}
            aria-describedby={
              errors.termsAccepted ? 'termsAccepted-error' : undefined
            }
            label={
              <>
                J'ai lu et j'accepte les{' '}
                <span className="font-semibold text-text-primary underline underline-offset-2">
                  Conditions générales
                </span>
              </>
            }
            {...register('termsAccepted')}
          />
          {errors.termsAccepted?.message && (
            <p
              id="termsAccepted-error"
              role="alert"
              className="-mt-1 pl-6 text-xs font-medium text-error"
            >
              {errors.termsAccepted.message}
            </p>
          )}
        </div>

        <APIError message={errorMessage} />

        <SubmitButton isLoading={isSubmitting} loadingLabel="Création du compte...">
          Créer un compte
        </SubmitButton>

        <AuthDivider label="Ou s'inscrire avec" />
        <SocialButtons label="S'inscrire avec {provider}" redirectPath={redirectParam} />

        <p className="text-center text-sm text-text-secondary md:hidden">
          Déjà membre ?{' '}
          <Link
            to="/login"
            className="font-semibold text-text-primary underline underline-offset-2"
          >
            Se connecter
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
