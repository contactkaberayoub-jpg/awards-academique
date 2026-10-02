import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap, LogOut, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { getNavSections, type NavSection, type ShellRole } from './navigation';

const ROLE_LABEL: Record<ShellRole, string> = {
  STUDENT: 'Étudiant',
  INSTRUCTOR: 'Formateur',
  ADMINISTRATOR: 'Administrateur',
};

/** Role taglines — a short line under the brand for each role. */
const ROLE_TAGLINE: Record<ShellRole, string> = {
  STUDENT: 'Votre parcours',
  INSTRUCTOR: 'Votre enseignement',
  ADMINISTRATOR: 'Votre plateforme',
};

function SidebarContent({
  role,
  onNavigate,
}: {
  role: ShellRole;
  onNavigate?: () => void;
}) {
  const { user, logout } = useAuth();
  const sections = getNavSections(role);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
          style={{
            backgroundColor: 'var(--role-accent)',
            boxShadow: '0 6px 18px -6px var(--role-accent)',
          }}
        >
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold tracking-tight text-text-primary">
            Awards Académique
          </p>
          <p
            className="truncate text-xs font-medium"
            style={{ color: 'var(--role-accent)' }}
          >
            {ROLE_TAGLINE[role]}
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigate}
          className="ml-auto rounded-sm p-1.5 text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary lg:hidden"
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label={`Navigation ${ROLE_LABEL[role].toLowerCase()}`}>
        {sections.map((section: NavSection) => (
          <div key={section.label ?? 'nav'}>
            {section.label && (
              <p className="px-3 pb-2 text-2xs font-semibold uppercase tracking-wider text-text-muted">
                {section.label}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const classes = ({ isActive }: { isActive: boolean }) => [
                  'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-fast',
                  item.disabled
                    ? 'cursor-not-allowed text-text-muted/70'
                    : isActive
                      ? 'bg-[var(--role-accent-tint)] text-[var(--role-accent)]'
                      : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary',
                ].join(' ');

                return item.disabled ? (
                  <li key={item.label}>
                    <span className={classes({ isActive: false })}>
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.soon && (
                        <Badge variant="default" size="sm" className="shrink-0 px-1.5 text-2xs">
                          Bientôt
                        </Badge>
                      )}
                    </span>
                  </li>
                ) : (
                  <li key={item.label}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={classes}
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition-all duration-fast ${
                              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                            }`}
                            style={{
                              backgroundColor: isActive ? 'var(--role-accent)' : 'var(--role-accent)',
                            }}
                            aria-hidden="true"
                          />
                          <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-lg bg-surface-secondary/70 p-3">
          <span
            className="rounded-full"
            style={{ boxShadow: '0 0 0 2px var(--color-surface), 0 0 0 4px var(--role-accent)' }}
          >
            <Avatar
              name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`}
              size="md"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-primary">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-text-muted">{ROLE_LABEL[role]}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Se déconnecter"
            aria-label="Se déconnecter"
            className="rounded-sm p-2 text-text-muted transition-colors hover:bg-surface-tertiary hover:text-error"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar({ role }: { role: ShellRole }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-border bg-surface lg:block">
      <SidebarContent role={role} />
    </aside>
  );
}

export function MobileSidebar({
  role,
  open,
  onClose,
}: {
  role: ShellRole;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-surface-overlay backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-border bg-surface shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
          >
            <SidebarContent role={role} onNavigate={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
