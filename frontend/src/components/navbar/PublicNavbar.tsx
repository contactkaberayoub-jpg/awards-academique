import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';
import { DesktopNavigation } from './DesktopNavigation';
import { CategoryBar } from './CategoryBar';
import { NotificationButton } from './NotificationButton';
import { ProfileDropdown } from './ProfileDropdown';
import { MobileMenu } from './MobileMenu';
import { Button } from '../ui/Button';
import { useAuth } from '../../auth/AuthContext';
import { normalizeRole, ROLE_DASHBOARD } from '../../auth/roleRoutes';
import { Link } from 'react-router-dom';

export function PublicNavbar() {
  const { isAuthenticated, user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const dashboardPath = user ? ROLE_DASHBOARD[normalizeRole(user.role)] : '/student';

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-surface border-b border-[#ECECEC] transition-shadow duration-300 ${
        isScrolled ? 'shadow-sm' : ''
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-[1700px] px-10 sm:px-12"
      >
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-12">
            <Logo />
            <DesktopNavigation />
          </div>

          <SearchBar />

          <div className="flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <Link
                  to={dashboardPath}
                  className="text-[15px] font-medium text-text-secondary hover:text-text-primary transition-colors duration-200"
                >
                  Mon tableau de bord
                </Link>
                <Link
                  to="/wishlist"
                  className="text-[15px] font-medium text-text-secondary hover:text-text-primary transition-colors duration-200"
                >
                  Liste d'envies
                </Link>
                <NotificationButton />
                <ProfileDropdown />
              </>
            ) : (
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
            )}

            <MobileMenu />
          </div>
        </div>
      </motion.div>

      <CategoryBar />
    </header>
  );
}
