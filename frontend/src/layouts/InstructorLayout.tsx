import { Outlet } from 'react-router-dom';
import AppShell from '@/components/shell/AppShell';

export default function InstructorLayout() {
  return (
    <AppShell role="INSTRUCTOR">
      <Outlet />
    </AppShell>
  );
}
