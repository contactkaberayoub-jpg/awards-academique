import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { normalizeRole, ROLE_DASHBOARD } from '../../auth/roleRoutes';
import { ProfileDropdown } from './ProfileDropdown';
import { RoleNavbarMobileMenu } from './RoleNavbarMobileMenu';
import type { NavItem } from './RoleNavbarMobileMenu';

const navigation: NavItem[] = [
  { to: '/instructor', label: 'Tableau de bord', end: true },
  { to: '/instructor/courses', label: 'Mes cours' },
  { to: '/instructor/sections', label: 'Sections' },
  { to: '/instructor/lessons', label: 'Leçons' },
  { to: '/instructor/quizzes', label: 'Quiz' },
  { to: '/instructor/resources', label: 'Ressources' },
  { to: '/instructor/students', label: 'Étudiants' },
  { to: '/instructor/orders', label: 'Commandes' },
  { to: '/instructor/reviews', label: 'Avis' },
  { to: '/instructor/certificates', label: 'Certificats' },
  { to: '/instructor/analytics', label: 'Statistiques' },
  { to: '/instructor/profile', label: 'Profil' },
  { to: '/instructor/notifications', label: 'Notifications' },
];

export function InstructorNavbar() {
  const { user } = useAuth();
  const dashboardPath = user ? ROLE_DASHBOARD[normalizeRole(user.role)] : '/instructor';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#ECECEC] bg-surface">
      <div className="mx-auto max-w-[1700px] px-6 sm:px-8">
        <div className="flex h-20 items-center justify-between gap-6">
          <Link to={dashboardPath} className="flex shrink-0 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
              AA
            </div>
            <span className="hidden text-xl font-bold text-text-primary sm:block">
              Awards Académique
            </span>
          </Link>

          <nav
            className="hidden flex-1 items-center justify-end gap-1 overflow-x-auto lg:flex"
            aria-label="Navigation formateur"
          >
            {navigation.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <ProfileDropdown />
            <RoleNavbarMobileMenu items={navigation} />
          </div>
        </div>
      </div>
    </header>
  );
}
