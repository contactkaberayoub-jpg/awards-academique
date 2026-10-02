import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  Bell,
  BookOpen,
  Bot,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { ROLE_DASHBOARD } from '@/auth/roleRoutes';
import { notificationsApi } from '@/api/notifications';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { useBreadcrumbItems } from './breadcrumbs';
import { ThemeToggle } from './ThemeToggle';
import type { ShellRole } from './navigation';

interface TopbarProps {
  role: ShellRole;
  onOpenMobileMenu: () => void;
}

const ROLE_LABEL: Record<ShellRole, string> = {
  STUDENT: 'Étudiant',
  INSTRUCTOR: 'Formateur',
  ADMINISTRATOR: 'Administrateur',
};

const NOTIFICATION_TYPE_CONFIG: Record<string, { icon: LucideIcon; tint: string }> = {
  payment: { icon: CreditCard, tint: 'bg-success-tint text-success' },
  course: { icon: BookOpen, tint: 'bg-primary-tint text-primary' },
  certificate: { icon: Award, tint: 'bg-accent-tint text-accent' },
  ai: { icon: Bot, tint: 'bg-info-tint text-info' },
  system: { icon: Settings, tint: 'bg-gray-tint text-text-secondary' },
};

const DEFAULT_NOTIFICATION_CONFIG: { icon: LucideIcon; tint: string } = {
  icon: Bell,
  tint: 'bg-gray-tint text-text-secondary',
};

function formatTimeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function SearchField() {
  return (
    <div className="group relative hidden lg:block">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
      <input
        type="search"
        placeholder="Rechercher un cours, un étudiant…"
        className="h-10 w-72 rounded-sm border border-border bg-surface-secondary/60 pl-10 pr-12 text-sm text-text-primary outline-none transition-all duration-normal placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-4 focus:ring-focus-ring-subtle"
        aria-label="Rechercher"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-surface px-1.5 py-0.5 text-2xs font-medium text-text-muted">
        ⌘K
      </kbd>
    </div>
  );
}

function NotificationBell({ role }: { role: ShellRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', 'mine'],
    queryFn: notificationsApi.fetchMine,
    refetchInterval: 60_000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-text-secondary transition-colors duration-fast hover:bg-surface-secondary hover:text-text-primary"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-2xs font-bold leading-none text-white ring-2 ring-surface" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-text-primary">Notifications</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="text-xs font-medium text-primary transition-colors hover:text-primary-hover disabled:opacity-60"
                >
                  {markAllRead.isPending ? '…' : 'Tout marquer comme lu'}
                </button>
              )}
            </div>
            {isLoading ? (
              <div className="px-4 py-6 text-center text-xs text-text-muted">
                Chargement des notifications…
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-6 w-6 text-text-muted/50" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-text-secondary">Aucune notification</p>
                <p className="mt-0.5 text-xs text-text-muted">Vous êtes à jour — rien à signaler.</p>
              </div>
            ) : (
              <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                {notifications.slice(0, 8).map((notification) => {
                  const config = NOTIFICATION_TYPE_CONFIG[notification.type] ?? DEFAULT_NOTIFICATION_CONFIG;
                  const Icon = config.icon;
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        disabled={notification.isRead}
                        onClick={() => markRead.mutate(notification.id)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-secondary/60 ${
                          notification.isRead ? '' : 'bg-primary-tint/40'
                        }`}
                      >
                        <span className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.tint}`}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-text-primary">{notification.title}</span>
                            {!notification.isRead && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                            )}
                          </span>
                          <span className="block truncate text-xs text-text-secondary">{notification.content}</span>
                        </span>
                        <span className="shrink-0 text-2xs text-text-muted">{formatTimeAgo(notification.createdAt)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="border-t border-border p-2">
              {role === 'INSTRUCTOR' ? (
                <Link
                  to="/instructor/notifications"
                  onClick={() => setIsOpen(false)}
                  className="block rounded-md px-3 py-2 text-center text-xs font-medium text-primary transition-colors hover:bg-primary-tint"
                >
                  Voir toutes les notifications
                </Link>
              ) : (
                <span className="block rounded-md px-3 py-2 text-center text-xs font-medium text-text-muted">
                  Centre de notifications en direct
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileMenu({ role }: { role: ShellRole }) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dashboardPath = ROLE_DASHBOARD[role];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const name = `${user?.firstName ?? 'User'} ${user?.lastName ?? ''}`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-2 rounded-sm p-1 transition-colors hover:bg-surface-secondary"
        aria-label="Ouvrir le menu du profil"
      >
        <Avatar name={name} size="sm" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-64 overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-lg"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-4">
              <Avatar name={name} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">{name}</p>
                <p className="truncate text-xs text-text-muted">{user?.email}</p>
              </div>
            </div>
            <div className="px-3 py-2">
              <div className="mb-1 px-2 pt-1">
                <Badge variant="primary" size="sm">
                  {ROLE_LABEL[role]}
                </Badge>
              </div>
              <Link
                to={dashboardPath}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
              >
                <LayoutDashboard className="h-4 w-4 text-text-muted" aria-hidden="true" />
                Mon tableau de bord
              </Link>
              {role === 'INSTRUCTOR' ? (
                <Link
                  to="/instructor/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
                >
                  <UserCircle className="h-4 w-4 text-text-muted" aria-hidden="true" />
                  Profil
                </Link>
              ) : role === 'STUDENT' ? (
                <Link
                  to="/student/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 rounded-sm px-2 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary"
                >
                  <UserCircle className="h-4 w-4 text-text-muted" aria-hidden="true" />
                  Profil
                </Link>
              ) : (
                <span className="flex cursor-not-allowed items-center gap-3 rounded-sm px-2 py-2 text-sm text-text-muted/70">
                  <UserCircle className="h-4 w-4" aria-hidden="true" />
                  Profil
                </span>
              )}
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-error-tint hover:text-error"
              >
                <LogOut className="h-4 w-4 text-text-muted" aria-hidden="true" />
                Se déconnecter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Topbar({ role, onOpenMobileMenu }: TopbarProps) {
  const breadcrumbs = useBreadcrumbItems(role);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="inline-flex h-10 w-10 items-center justify-center rounded-sm text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden min-w-0 md:block">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <SearchField />
        <ThemeToggle />
        <NotificationBell role={role} />
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
        <ProfileMenu role={role} />
      </div>
    </header>
  );
}
