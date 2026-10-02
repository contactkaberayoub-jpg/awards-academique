import { Award, BookOpen, Mail, UserCircle } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { PageHeader } from '@/components/admin/PageHeader';

export default function InstructorProfilePage() {
  const { user } = useAuth();

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Formateur';

  const details = [
    { label: 'Prénom', value: user?.firstName ?? '—' },
    { label: 'Nom', value: user?.lastName ?? '—' },
    { label: 'Email', value: user?.email ?? '—', icon: Mail },
    { label: 'Rôle', value: 'Formateur', icon: Award },
    { label: 'Identifiant du compte', value: user?.userId ?? '—' },
  ];

  return (
    <div>
      <PageHeader title="Profil" description="Les détails de votre compte formateur." />

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border bg-surface-secondary px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {(user?.firstName?.[0] ?? 'F').toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{fullName}</h2>
              <p className="text-sm text-text-secondary">Formateur · {user?.email}</p>
            </div>
          </div>
        </div>

        <ul className="divide-y divide-border">
          {details.map((detail) => {
            const Icon = detail.icon ?? UserCircle;
            return (
              <li key={detail.label} className="flex items-center gap-4 px-6 py-3.5">
                <Icon className="h-4 w-4 shrink-0 text-text-muted" />
                <span className="w-32 shrink-0 text-sm font-medium text-text-secondary">{detail.label}</span>
                <span className="truncate text-sm text-text-primary">{detail.value}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-text-primary">Enseignement</h3>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            Utilisez <span className="font-medium">Mes cours</span> pour créer du contenu, l'organiser en{' '}
            <span className="font-medium">Sections</span> et publier des{' '}
            <span className="font-medium">Leçons</span> pour vos étudiants.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-accent" />
            <h3 className="font-semibold text-text-primary">Compte</h3>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            Utilisez vos paramètres de compte pour modifier vos informations personnelles.
          </p>
        </div>
      </div>
    </div>
  );
}
