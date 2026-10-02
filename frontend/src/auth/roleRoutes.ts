import type { Role } from '../types';

export const ROLE_DASHBOARD: Record<Role, string> = {
  ADMINISTRATOR: '/admin',
  INSTRUCTOR: '/instructor',
  STUDENT: '/student',
};

export function normalizeRole(role: string): Role {
  return role.toUpperCase() as Role;
}

export function resolvePostLoginDestination(
  role: string,
  requestedPath: string | null
): string {
  const dashboardPath = ROLE_DASHBOARD[normalizeRole(role)];

  if (!requestedPath) {
    return dashboardPath;
  }

  const requestedPathname = requestedPath.split('?')[0] ?? '';

  const isSafeInternalPath =
    requestedPathname.startsWith('/') &&
    !requestedPathname.startsWith('/login') &&
    !requestedPathname.startsWith('/register');

  if (isSafeInternalPath) {
    return requestedPath;
  }

  return dashboardPath;
}
