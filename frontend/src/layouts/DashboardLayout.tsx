import { Outlet } from 'react-router-dom';
import AppShell from '../components/shell/AppShell';

export default function DashboardLayout() {
  return (
    <AppShell role="STUDENT">
      <Outlet />
    </AppShell>
  );
}
