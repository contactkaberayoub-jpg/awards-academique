import { NavLink } from 'react-router-dom';
import { MegaMenu } from './MegaMenu';

const navItems = [
  { name: 'Accueil', href: '/' },
  { name: 'Mon parcours', href: '/student' },
  { name: 'Devenir formateur', href: '/become-instructor' },
  { name: 'Assistant IA', href: '/ai' },
  { name: 'À propos', href: '/about' },
];

export function DesktopNavigation() {
  return (
    <nav className="hidden lg:flex items-center gap-8">
      <MegaMenu />
      {navItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          end
          className={({ isActive }) => `
            relative text-[15px] font-medium transition-all duration-200
            ${isActive ? 'text-text-primary' : 'text-text-secondary'}
          `}
        >
          {({ isActive }) => (
            <>
              <span className="hover:-translate-y-0.5 inline-block transition-transform duration-200">
                {item.name}
              </span>
              <span
                className={`absolute bottom-[-3px] left-0 h-0.5 bg-text-primary transition-all duration-200 ${
                  isActive ? 'w-full' : 'w-0 hover:w-full'
                }`}
              ></span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
