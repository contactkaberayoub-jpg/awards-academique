import { Outlet } from 'react-router-dom';
import { RoleBasedNavbar } from '../components/navbar/RoleBasedNavbar';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavbar />
      <Outlet />
    </div>
  );
}
