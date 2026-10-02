import { User, LayoutDashboard, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { normalizeRole, ROLE_DASHBOARD } from '../../auth/roleRoutes';
import type { Role } from '../../types';
import { Avatar } from './Avatar';

const ROLE_LABEL: Record<Role, string> = {
  ADMINISTRATOR: 'Administrateur',
  INSTRUCTOR: 'Formateur',
  STUDENT: 'Étudiant',
};

export function ProfileDropdown() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const role: Role | null = user?.role ? normalizeRole(user.role) : null;
  const roleLabel = role ? ROLE_LABEL[role] : 'Utilisateur';
  const dashboardPath = role ? ROLE_DASHBOARD[role] : '/';

  const menuItems = [
    { icon: LayoutDashboard, label: 'Mon tableau de bord', href: dashboardPath },
    { icon: User, label: 'Profil', href: '/profile' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Ouvrir le menu du profil"
        className="flex items-center gap-3 hover:opacity-90 transition-opacity duration-200"
      >
        <Avatar size="md" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-14 w-60 bg-surface rounded-lg shadow-lg border border-border py-2 z-50"
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-text-primary">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-text-secondary">{roleLabel}</p>
            </div>
            {menuItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-secondary transition-colors duration-150"
              >
                <item.icon className="h-4 w-4 text-text-secondary" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-secondary transition-colors duration-150 w-full text-left"
            >
              <LogOut className="h-4 w-4 text-text-secondary" />
              Se déconnecter
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
