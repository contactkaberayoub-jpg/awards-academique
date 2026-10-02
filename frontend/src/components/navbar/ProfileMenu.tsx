import { Bell, LogOut, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';

export function ProfileMenu() {
  const { user, logout, isAuthenticated } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-4">
        <Link
          to="/login"
          className="text-[15px] font-medium text-text-secondary hover:text-text-primary transition-colors duration-200"
        >
          Se connecter
        </Link>
        <Link to="/register">
          <Button className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-[15px] font-medium">
            Créer un compte
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4" ref={dropdownRef}>
      <button
        className="relative p-2 text-text-secondary hover:text-text-primary transition-colors duration-200"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-error"></span>
      </button>

      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-3 hover:opacity-90 transition-opacity duration-200"
      >
        <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
          {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-[15px] font-semibold text-text-primary">
            {user?.firstName} {user?.lastName}
          </p>
        </div>
      </button>

      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-10 top-20 w-56 bg-surface rounded-lg shadow-lg border border-border py-2 z-50"
          >
            <Link
              to="/profile"
              className="flex items-center gap-3 px-4 py-3 text-[15px] text-text-secondary hover:bg-surface-secondary transition-colors duration-150"
            >
              <User className="h-4 w-4" />
              Profil
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-3 text-[15px] text-text-secondary hover:bg-surface-secondary transition-colors duration-150 w-full text-left"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
