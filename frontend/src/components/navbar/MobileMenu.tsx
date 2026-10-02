import { Search, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../ui/Button';
import { Avatar } from './Avatar';

const navItems = [
  { name: 'Accueil', href: '/' },
  { name: 'Cours', href: '/courses' },
  { name: 'Certificats', href: '/certificates' },
  { name: 'Mon parcours', href: '/student' },
  { name: 'Devenir formateur', href: '/become-instructor' },
  { name: 'Assistant IA', href: '/ai' },
  { name: 'À propos', href: '/about' },
];

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="lg:hidden">
      {!searchExpanded ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchExpanded(true)}
            className="p-2 text-text-secondary hover:text-text-primary"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-text-secondary hover:text-text-primary"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      ) : (
        <div className="flex-1 mx-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-text-muted" />
            </div>
            <input
              type="text"
              placeholder="Rechercher des cours..."
              className="w-full h-12 pl-12 pr-4 rounded-full bg-surface-secondary border-transparent border text-base text-text-primary placeholder:text-text-muted"
            />
            <button
              onClick={() => setSearchExpanded(false)}
              className="absolute inset-y-0 right-0 pr-4 text-text-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 z-40 bg-surface p-6"
          >
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
                    AA
                  </div>
                  <span className="text-xl font-bold text-text-primary">
                    Awards Académique
                  </span>
                </Link>
                <button onClick={() => setIsOpen(false)} className="p-2 text-text-secondary">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <nav className="flex flex-col gap-4">
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    end
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      `text-[16px] font-medium transition-colors duration-200 ${
                        isActive ? 'text-text-primary' : 'text-text-secondary'
                      }`
                    }
                  >
                    {item.name}
                  </NavLink>
                ))}
              </nav>

              <div className="mt-auto">
                {isAuthenticated ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar size="md" />
                      <div>
                        <p className="text-[15px] font-semibold text-text-primary">
                          {user?.firstName} {user?.lastName}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="w-full justify-start"
                    >
                      Se déconnecter
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full">
                        Se connecter
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsOpen(false)}>
                      <Button className="w-full bg-primary text-primary-foreground">
                        Créer un compte
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
