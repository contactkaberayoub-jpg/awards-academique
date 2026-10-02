import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, Search, X, ShoppingCart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Logo } from './Logo';
import { Avatar } from '../ui/Avatar';
import { SearchBar } from './SearchBar';
import { MobileMenu } from './MobileMenu';
import { useAuth } from '../../auth/AuthContext';
import { normalizeRole, ROLE_DASHBOARD } from '../../auth/roleRoutes';
import { useCategories, useMyCart } from '../../api/hooks';
import type { CategoryNode } from '../../api/categories';
import apiClient from '../../api/client';

// ---------------------------------------------------------------------------
// Row 1 — top bar
// ---------------------------------------------------------------------------

function ExplorerDropdown({ categories }: { categories: CategoryNode[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const roots = categories.filter((c) => !c.parentId);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        Explorer
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-surface border border-border rounded-lg shadow-xl p-3 z-50 max-h-[70vh] overflow-y-auto">
          <ul className="space-y-1">
            {roots.map((cat) => (
              <li key={cat.id}>
                <Link
                  to={`/courses?category=${cat.slug}`}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary"
                >
                  {cat.name}
                </Link>
                {cat.children && cat.children.length > 0 && (
                  <ul className="ml-3 border-l border-border pl-2 mt-1 space-y-1">
                    {cat.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          to={`/courses?category=${child.slug}`}
                          onClick={() => setOpen(false)}
                          className="block rounded-md px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {roots.length === 0 && (
              <li className="px-3 py-2 text-xs text-text-muted">Aucune catégorie</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function CartButton() {
  const { isAuthenticated, user } = useAuth();
  const role = user ? normalizeRole(user.role) : null;
  const isStudent = role === 'STUDENT';
  const { data: cart } = useMyCart();

  if (!isAuthenticated || !isStudent) return null;

  const count = cart?.items?.length ?? 0;

  return (
    <Link
      to="/cart"
      className="relative p-2 text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
      aria-label="Panier"
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-2xs font-semibold text-primary-foreground">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => apiClient.get<number>('/notifications/unread-count').then((r) => r.data),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  const count = typeof unread === 'number' ? unread : 0;

  return (
    <button
      className="relative p-2 text-text-secondary hover:text-text-primary transition-colors"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-2xs font-semibold text-error-foreground">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const fullName = user ? `${user.firstName} ${user.lastName}` : '';
  const dashboardPath = user ? ROLE_DASHBOARD[normalizeRole(user.role)] : '/student';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full ring-2 ring-transparent hover:ring-border transition"
        aria-label="Menu du compte"
      >
        <Avatar size="md" name={fullName} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-lg shadow-xl py-2 z-50">
          <div className="px-4 py-2 border-b border-border">
            <p className="text-sm font-semibold text-text-primary">{fullName}</p>
            <p className="text-xs text-text-secondary">{user?.email}</p>
          </div>
          <Link
            to={dashboardPath}
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-secondary"
          >
            Mon tableau de bord
          </Link>
          {/* TODO: créer la route /profile (n'existe pas encore côté frontend) */}
          <Link
            to={dashboardPath}
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-secondary"
          >
            Profil
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="block w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-secondary"
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

function NavbarTop({
  mobileSearch,
  setMobileSearch,
}: {
  mobileSearch: boolean;
  setMobileSearch: (v: boolean) => void;
}) {
  const { isAuthenticated, user } = useAuth();
  const { data: categories = [] } = useCategories();
  const role = user ? normalizeRole(user.role) : null;
  const isStudent = role === 'STUDENT';
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
        delayChildren: shouldReduceMotion ? 0 : 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.4,
        ease: [0.25, 1, 0.5, 1] as const,
      },
    },
  };

  const searchVariants = {
    hidden: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.98, y: shouldReduceMotion ? 0 : -8 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.4,
        ease: [0.25, 1, 0.5, 1] as const,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex h-16 items-center gap-4 px-4 sm:px-6"
    >
      <motion.div variants={itemVariants}>
        <Logo />
      </motion.div>

      {/* Centre-gauche : liens */}
      <motion.div variants={itemVariants} className="hidden md:flex items-center gap-5">
        <ExplorerDropdown categories={categories} />
        {/* Secondaire : cible existante (/courses). À renommer "Mes formations" au choix. */}
        <Link
          to="/courses"
          className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          Cours
        </Link>
        <Link
          to="/become-instructor"
          className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          Devenir formateur
        </Link>
      </motion.div>

      {/* Centre : recherche */}
      <motion.div variants={searchVariants} className="hidden md:flex flex-1 justify-center px-4">
        <div className="w-full max-w-xl">
          <SearchBar />
        </div>
      </motion.div>

      {/* Droite */}
      <motion.div variants={itemVariants} className="ml-auto flex items-center gap-2 sm:gap-3">
        {isStudent && (
          <Link
            to="/student"
            className="hidden sm:inline text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Mon apprentissage
          </Link>
        )}

        {/* Recherche mobile */}
        <button
          className="md:hidden p-2 text-text-secondary hover:text-text-primary"
          onClick={() => setMobileSearch(!mobileSearch)}
          aria-label="Rechercher"
        >
          {mobileSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
        </button>

        <CartButton />
        {isAuthenticated && <NotificationBell />}
        {isAuthenticated ? (
          <UserMenu />
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              Se connecter
            </Link>
            <Link
              to="/register"
              className="hidden sm:inline rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Créer un compte
            </Link>
          </div>
        )}
        <MobileMenu />
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Row 2 — categories
// ---------------------------------------------------------------------------

function NavbarCategories() {
  const { data: categories = [], isLoading, error } = useCategories();
  const location = useLocation();
  const activeSlug = new URLSearchParams(location.search).get('category');
  const shouldReduceMotion = useReducedMotion();

  if (error) {
    return (
      <div className="h-12 flex items-center px-4 sm:px-6 text-sm text-text-muted">
        Catégories indisponibles
      </div>
    );
  }

  const roots = categories.filter((c) => !c.parentId);

  return (
    <motion.div
      initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.4, delay: shouldReduceMotion ? 0 : 0.15, ease: [0.25, 1, 0.5, 1] as const }}
      className="h-12 border-t border-border bg-surface-secondary/40 overflow-x-auto scrollbar-hide"
    >
      <div className="flex h-12 items-center gap-6 px-4 sm:px-6 whitespace-nowrap">
        {isLoading ? (
          <div className="flex gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 w-24 animate-pulse rounded bg-surface-tertiary" />
            ))}
          </div>
        ) : roots.length === 0 ? (
          <span className="text-sm text-text-muted">Aucune catégorie</span>
        ) : (
          roots.map((cat) => {
            const active = cat.slug === activeSlug;
            return (
              <Link
                key={cat.id}
                to={`/courses?category=${cat.slug}`}
                className={`text-sm font-medium transition-colors ${
                  active
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {cat.name}
              </Link>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Navbar (composition)
// ---------------------------------------------------------------------------

export function Navbar() {
  const [mobileSearch, setMobileSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const headerVariants = {
    hidden: { opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.5,
        ease: [0.25, 1, 0.5, 1] as const,
      },
    },
  };

  return (
    <motion.header
      variants={headerVariants}
      initial="hidden"
      animate="visible"
      className={`sticky top-0 z-40 w-full bg-surface border-b border-border transition-shadow duration-300 ${
        scrolled ? 'shadow-md' : 'shadow-none'
      }`}
    >
      <NavbarTop mobileSearch={mobileSearch} setMobileSearch={setMobileSearch} />
      <NavbarCategories />

      {/* Recherche mobile (toggle) */}
      <AnimatePresence>
        {mobileSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: 'easeOut' }}
            className="md:hidden border-t border-border p-3 overflow-hidden"
          >
            <SearchBar />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

