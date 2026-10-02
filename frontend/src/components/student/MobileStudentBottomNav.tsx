import { LayoutDashboard, BookOpen, Award, Sparkles, UserCircle } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Accueil', to: '/student', icon: LayoutDashboard, end: true },
  { label: 'Cours', to: '/student/courses', icon: BookOpen },
  { label: 'Certificats', to: '/student/certificates', icon: Award },
  { label: 'IA Tutor', to: '/student/ai', icon: Sparkles },
  { label: 'Profil', to: '/student/profile', icon: UserCircle },
];

export function MobileStudentBottomNav() {
  return (
    <nav
      aria-label="Navigation mobile étudiant"
      className="fixed bottom-0 left-0 right-0 z-40 block border-t border-border bg-surface shadow-lg lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid h-16 grid-cols-5 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => [
                'flex flex-col items-center justify-center py-1 text-2xs font-medium transition-colors',
                isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              {({ isActive }) => (
                <>
                  <div className={`relative rounded-full p-1 transition-transform ${isActive ? 'scale-110 bg-primary-tint' : ''}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="mt-0.5 truncate text-[11px] font-semibold">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
