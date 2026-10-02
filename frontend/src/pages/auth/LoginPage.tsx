import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { resolvePostLoginDestination } from '../../auth/roleRoutes';
import { loginSchema } from '../../auth/validation';
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

type LoginFormInputs = {
  email: string;
  password: string;
  keepLoggedIn: boolean;
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stateFrom = location.state as { from?: { pathname?: string } } | null;
  const redirectParam = new URLSearchParams(location.search).get('redirect');
  const from = stateFrom?.from?.pathname ?? redirectParam ?? null;
  const registerHref = redirectParam
    ? `/register?redirect=${encodeURIComponent(redirectParam)}`
    : '/register';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      keepLoggedIn: false,
    },
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const authenticatedUser = await login(
        data.email,
        data.password,
        data.keepLoggedIn
      );
      const destination = resolvePostLoginDestination(
        authenticatedUser.role,
        from
      );
      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'Connexion impossible. Veuillez réessayer.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      brandPanel={
        <AuthBrandPanel
          heading="Bon retour !"
          subheading="Connectez-vous pour poursuivre votre parcours d'apprentissage sur Awards Académique."
          footerPrompt="Pas encore membre ?"
          footerLinkLabel="Créer un compte"
          footerLinkTo={registerHref}
        />
      }
    >
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Se connecter
        </h1>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-5">
          <FormField
            id="email"
            label="E-mail ou nom d'utilisateur"
            type="email"
            autoComplete="email"
            placeholder="E-mail ou nom d'utilisateur"
            error={errors.email?.message}
            {...register('email')}
          />
          <PasswordField
            id="password"
            label="Mot de passe"
            autoComplete="current-password"
            placeholder="Mot de passe"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <div className="flex items-center justify-between">
          <Checkbox
            id="keepLoggedIn"
            label="Rester connecté"
            {...register('keepLoggedIn')}
          />
          <Link
            to="/forgot-password"
            className="whitespace-nowrap text-sm font-medium text-text-secondary underline underline-offset-2 hover:text-primary"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <APIError message={errorMessage} />

        <SubmitButton isLoading={isSubmitting} loadingLabel="Connexion en cours...">
          Se connecter
        </SubmitButton>

        <AuthDivider label="Ou se connecter avec" />
        <SocialButtons label="Se connecter avec {provider}" redirectPath={from} />

        <p className="text-center text-sm text-text-secondary md:hidden">
          Pas encore membre ?{' '}
          <Link
            to={registerHref}
            className="font-semibold text-text-primary underline underline-offset-2"
          >
            Créer un compte
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
