import { Search, Bell, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../auth/AuthContext';
import { motion } from 'framer-motion';

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Cours', href: '/courses' },
    { name: 'Certificats', href: '/certificates' },
    { name: 'Assistant IA', href: '/ai' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary text-lg font-bold text-primary-foreground">
              AA
            </div>
            <span className="text-xl font-bold text-text-primary">Awards Académique</span>
          </a>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                {item.name}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex flex-1 max-w-md mx-4">
          <Input
            placeholder="Rechercher des cours, catégories ou certificats..."
            leftIcon={<Search className="h-4 w-4" />}
            className="hidden sm:block"
          />
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-text-secondary hover:text-text-primary transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-error" />
          </button>

          <div className="hidden md:flex items-center gap-3">
            <Avatar
              initials={user?.firstName?.charAt(0) + user?.lastName?.charAt(0) || 'ST'}
              size="md"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-text-primary">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-xs text-text-secondary">Étudiant</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              Se déconnecter
            </Button>
          </div>

          <button
            className="md:hidden p-2 text-text-secondary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-border bg-surface p-4"
        >
          <Input
            placeholder="Rechercher des cours..."
            leftIcon={<Search className="h-4 w-4" />}
            className="mb-4"
          />
          <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                {item.name}
              </a>
            ))}
            <div className="flex items-center gap-3 pt-3 border-t border-border">
              <Avatar
                initials={user?.firstName?.charAt(0) + user?.lastName?.charAt(0) || 'ST'}
                size="md"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-text-primary">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                Se déconnecter
              </Button>
            </div>
          </nav>
        </motion.div>
      )}
    </header>
  );
}
