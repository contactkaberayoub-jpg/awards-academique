import { CheckCircle2, Clock, RotateCcw, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/auth/AuthContext';
import { instructorApi } from '@/api/instructor';
import type { InstructorApplication } from '@/types';
import { StatusBadge } from '@/components/instructor/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { FormField } from '@/components/auth/FormField';
import { APIError } from '@/components/auth/APIError';
import { getApiErrorMessage } from '@/lib/apiError';

const applicationSchema = z.object({
  professionalTitle: z.string().trim().optional(),
  institution: z.string().trim().optional(),
  expertise: z.string().trim().optional(),
  linkedinUrl: z.string().trim().optional(),
});

type ApplicationFormInputs = z.infer<typeof applicationSchema>;

export default function InstructorApplicationPage() {
  const { refreshUser, user } = useAuth();
  const [application, setApplication] = useState<InstructorApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApplicationFormInputs>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      professionalTitle: '',
      institution: '',
      expertise: '',
      linkedinUrl: '',
    },
  });

  const loadApplication = useCallback(async () => {
    try {
      const response = await instructorApi.getApplication();
      setApplication(response.data);
      reset({
        professionalTitle: response.data.professionalTitle ?? '',
        institution: response.data.institution ?? '',
        expertise: response.data.expertise ?? '',
        linkedinUrl: response.data.linkedinUrl ?? '',
      });
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(
        getApiErrorMessage(err, 'Impossible de charger votre candidature.')
      );
    } finally {
      setIsLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  useEffect(() => {
    // Refresh the stored user status so an approval/unblock is picked up
    // without requiring a full re-login.
    if (user?.role === 'INSTRUCTOR') {
      refreshUser().catch(() => {
        /* keep the current user; the status resolves on next request */
      });
    }
  }, [user?.role, refreshUser]);

  const onSave = async (data: ApplicationFormInputs) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await instructorApi.updateApplication(data);
      setApplication(response.data);
      reset({
        professionalTitle: response.data.professionalTitle ?? '',
        institution: response.data.institution ?? '',
        expertise: response.data.expertise ?? '',
        linkedinUrl: response.data.linkedinUrl ?? '',
      });
      setSuccessMessage('Vos informations ont été enregistrées.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'Impossible d’enregistrer vos informations.'));
    } finally {
      setIsSaving(false);
    }
  };

  const onResubmit = async () => {
    setIsResubmitting(true);
    setErrorMessage(null);
    try {
      const response = await instructorApi.resubmit();
      setApplication(response.data);
      await refreshUser();
      setSuccessMessage('Votre candidature a été soumise à nouveau pour examen.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'Impossible de soumettre à nouveau la candidature.'));
    } finally {
      setIsResubmitting(false);
    }
  };

  if (isLoading) {
    return <Loading label="Chargement de votre candidature..." />;
  }

  const status = application?.status;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ma candidature de formateur"
        description="Suivez l'état de votre demande et complétez vos informations."
      />

      {errorMessage && <Notice type="error" message={errorMessage} />}
      {successMessage && <Notice type="success" message={successMessage} />}

      {status === 'APPROVED' ? (
        <div className="bg-surface rounded-xl border border-border p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Candidature approuvée</h2>
              <StatusBadge status="APPROVED" />
            </div>
          </div>
          <p className="text-sm text-text-secondary">
            Félicitations ! Votre candidature de formateur a été approuvée. Vous pouvez
            maintenant créer et gérer vos cours, publier des quiz et percevoir vos revenus.
          </p>
          <Link
            to="/instructor"
            className="inline-flex"
          >
            <Button variant="primary">Aller à mon espace formateur</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-surface rounded-xl border border-border p-6 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {status === 'REJECTED' ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error/15 text-error">
                    <XCircle className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/15 text-warning">
                    <Clock className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    {status === 'REJECTED' ? 'Candidature refusée' : 'Candidature en cours d’examen'}
                  </h2>
                  <StatusBadge status={status ?? 'PENDING'} />
                </div>
              </div>
              {application?.submittedAt && (
                <p className="text-xs text-text-secondary">
                  Soumise le {new Date(application.submittedAt).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>

            {status === 'REJECTED' && application?.rejectionReason && (
              <div className="rounded-lg border border-error/30 bg-error/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-error">
                  Motif du refus
                </p>
                <p className="mt-1 text-sm text-text-primary">{application.rejectionReason}</p>
              </div>
            )}

            {status === 'PENDING' && (
              <p className="text-sm text-text-secondary">
                Votre candidature est en cours d'examen par notre équipe. Vous serez notifié
                dès qu'une décision sera prise. Vous pouvez modifier vos informations
                ci-dessous à tout moment.
              </p>
            )}
          </div>

          <div className="bg-surface rounded-xl border border-border p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-text-primary">Informations professionnelles</h3>
            <form onSubmit={handleSubmit(onSave)} className="space-y-5" noValidate>
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

              <APIError message={null} />

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSaving}
                  disabled={isResubmitting}
                >
                  Enregistrer
                </Button>
                {status === 'REJECTED' && (
                  <Button
                    type="button"
                    variant="outline"
                    loading={isResubmitting}
                    disabled={isSaving}
                    onClick={onResubmit}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Soumettre à nouveau
                  </Button>
                )}
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}