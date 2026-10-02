import { useAuth } from '../../auth/AuthContext';
import { normalizeRole } from '../../auth/roleRoutes';
import { Navbar } from './Navbar';
import { InstructorNavbar } from './InstructorNavbar';
import { AdminNavbar } from './AdminNavbar';

export function RoleBasedNavbar() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navbar />;
  }

  const role = normalizeRole(user?.role ?? 'STUDENT');

  switch (role) {
    case 'STUDENT':
      return <Navbar />;
    case 'INSTRUCTOR':
      return <InstructorNavbar />;
    case 'ADMINISTRATOR':
      return <AdminNavbar />;
    default:
      return <Navbar />;
  }
}
