import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar, MobileSidebar } from './AppSidebar';
import { Topbar } from './Topbar';
import type { ShellRole } from './navigation';
import { MobileStudentBottomNav } from '@/components/student/MobileStudentBottomNav';

interface AppShellProps {
  role: ShellRole;
  children?: ReactNode;
}

export default function AppShell({ role, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div data-role={role} className="min-h-screen bg-background text-text-primary">
      <AppSidebar role={role} />
      <MobileSidebar role={role} open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="lg:pl-[264px]">
        <Topbar role={role} onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">
          {children ?? <Outlet />}
        </main>
      </div>

      {role === 'STUDENT' && <MobileStudentBottomNav />}
    </div>
  );
}
