import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { instructorRegisterSchema } from '../../auth/validation';
import { getApiErrorMessage } from '../../lib/apiError';
import { AuthCard } from '../../components/auth/AuthCard';
import { AuthBrandPanel } from '../../components/auth/AuthBrandPanel';
import { FormField } from '../../components/auth/FormField';
import { PasswordField } from '../../components/auth/PasswordField';
import { Checkbox } from '../../components/auth/Checkbox';
import { SubmitButton } from '../../components/auth/SubmitButton';
import { APIError } from '../../components/auth/APIError';

type BecomeInstructorFormInputs = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
  professionalTitle?: string;
  institution?: string;
  expertise?: string;
  linkedinUrl?: string;
};

export default function BecomeInstructorPage() {
  const { registerInstructor } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BecomeInstructorFormInputs>({
    resolver: zodResolver(instructorRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
      professionalTitle: '',
      institution: '',
      expertise: '',
      linkedinUrl: '',
    },
  });

  const onSubmit = async (data: BecomeInstructorFormInputs) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await registerInstructor({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        professionalTitle: data.professionalTitle || undefined,
        institution: data.institution || undefined,
        expertise: data.expertise || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
      });
      navigate('/instructor/application', { replace: true });
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, 'Impossible d’envoyer votre candidature. Veuillez réessayer.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      brandPanel={
        <AuthBrandPanel
          heading="Devenez formateur"
          subheading="Partagez votre expertise et touchez une rémunération sur chaque vente. Votre candidature sera examinée par notre équipe."
          footerPrompt="Déjà membre ?"
          footerLinkLabel="Se connecter"
          footerLinkTo="/login"
        />
      }
    >
      <div className="mb-8 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-tint text-primary">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Candidature formateur
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Créez votre compte formateur. Un e-mail vous sera notifié dès la décision de
            notre équipe.
          </p>
        </div>
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

        <div className="space-y-5 rounded-lg border border-border bg-surface-secondary/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Vos informations professionnelles
          </p>
          <FormField
            id="professionalTitle"
            label="Titre professionnel"
            placeholder="Ex: Ingénieur logiciel senior"
            error={errors.professionalTitle?.message}
            {...register('professionalTitle')}
          />
          <FormField
            id="institution"
            label="Institution / Entreprise"
            placeholder="Ex: Université Mohammed V"
            error={errors.institution?.message}
            {...register('institution')}
          />
          <FormField
            id="expertise"
            label="Domaines d'expertise"
            placeholder="Ex: Java, Spring Boot, DevOps"
            error={errors.expertise?.message}
            {...register('expertise')}
          />
          <FormField
            id="linkedinUrl"
            label="Profil LinkedIn"
            placeholder="https://www.linkedin.com/in/..."
            error={errors.linkedinUrl?.message}
            {...register('linkedinUrl')}
          />
        </div>

        <div className="space-y-3">
          <Checkbox
            id="termsAccepted"
            aria-invalid={!!errors.termsAccepted}
            aria-describedby={errors.termsAccepted ? 'termsAccepted-error' : undefined}
            label={
              <>
                J'ai lu et j'accepte les{' '}
                <span className="font-semibold text-text-primary underline underline-offset-2">
                  Conditions générales
                </span>{' '}
                de la plateforme.
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

        <SubmitButton isLoading={isSubmitting} loadingLabel="Envoi de la candidature...">
          Envoyer la candidature
        </SubmitButton>

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