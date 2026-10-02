import { Link } from 'react-router-dom';

const navItems = [
  { name: 'Accueil', href: '/' },
  { name: 'Cours', href: '/courses' },
  { name: 'Certificats', href: '/certificates' },
  { name: 'Assistant IA', href: '/ai' },
  { name: 'À propos', href: '/about' },
];

export function DesktopMenu() {
  return (
    <nav className="hidden lg:flex items-center gap-8">
      {navItems.map((item) => (
        <Link
          key={item.name}
          to={item.href}
          className="relative text-[15px] font-medium text-text-secondary transition-all duration-200 hover:text-text-primary hover:opacity-90"
        >
          {item.name}
          <span className="absolute bottom-[-2px] left-0 w-0 h-0.5 bg-text-primary transition-all duration-200 hover:w-full"></span>
        </Link>
      ))}
    </nav>
  );
}
