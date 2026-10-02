import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/admin/Notice';
import apiClient from '@/api/client';
import { UserCircle, Lock, Save } from 'lucide-react';

export default function StudentProfilePage() {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await apiClient.put('/auth/profile', { firstName, lastName });
      setSuccessMessage('Profil mis à jour avec succès.');
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Impossible de mettre à jour le profil.');
    } finally {
      setIsSubmitting(false);
    }

    try {
      await refreshUser();
    } catch {
      // best-effort: refresh via /auth/me; the profile update already succeeded
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordSuccess(null);
    setPasswordError(null);
    try {
      await apiClient.post('/auth/change-password', { currentPassword, newPassword });
      setPasswordSuccess('Mot de passe modifié avec succès.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message || 'Impossible de modifier le mot de passe.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Étudiant';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Profil et Paramètres"
        description="Gérez vos informations personnelles et la sécurité de votre compte."
      />

      {successMessage && <Notice type="success" message={successMessage} />}
      {errorMessage && <Notice type="error" message={errorMessage} />}

      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-border">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {(user?.firstName?.[0] ?? 'E').toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">{fullName}</h2>
            <p className="text-sm text-text-secondary">{user?.email} · Étudiant</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-primary" />
            Informations personnelles
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Prénom</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Nom</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">E-mail (non modifiable)</label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface-secondary text-text-muted text-sm cursor-not-allowed"
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les modifications</span>
            </button>
          </div>
        </form>
      </Card>

      <Card className="p-6 space-y-6">
        {passwordSuccess && <Notice type="success" message={passwordSuccess} />}
        {passwordError && <Notice type="error" message={passwordError} />}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Sécurité / Mot de passe
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Mot de passe actuel</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>Changer le mot de passe</span>
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
