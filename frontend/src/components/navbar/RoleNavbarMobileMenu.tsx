import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../ui/Button';

export interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

export function RoleNavbarMobileMenu({ items }: { items: NavItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-text-secondary hover:text-text-primary"
        aria-label="Ouvrir le menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

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
                <span className="text-xl font-bold text-text-primary">Menu</span>
                <button onClick={() => setIsOpen(false)} className="p-2 text-text-secondary">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <nav className="flex flex-col gap-4 overflow-y-auto">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      `text-[16px] font-medium transition-colors duration-200 ${
                        isActive ? 'text-text-primary' : 'text-text-secondary'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="mt-auto">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                    {user?.firstName?.charAt(0)}
                    {user?.lastName?.charAt(0)}
                  </div>
                  <p className="text-[15px] font-semibold text-text-primary">
                    {user?.firstName} {user?.lastName}
                  </p>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
