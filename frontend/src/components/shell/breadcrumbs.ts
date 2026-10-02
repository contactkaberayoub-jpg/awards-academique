import { useLocation } from 'react-router-dom';
import type { BreadcrumbItem } from '../ui/Breadcrumbs';
import { getNavSections, type ShellRole } from './navigation';
import { ROLE_DASHBOARD } from '@/auth/roleRoutes';

function titleCase(value: string): string {
  const labels: Record<string, string> = {
    profile: 'Profil',
    settings: 'Paramètres',
    notifications: 'Notifications',
    orders: 'Commandes',
    reviews: 'Avis',
    certificates: 'Certificats',
    analytics: 'Statistiques',
    courses: 'Cours',
    lessons: 'Leçons',
    sections: 'Sections',
    categories: 'Catégories',
    quizzes: 'Quiz',
    resources: 'Ressources',
    students: 'Étudiants',
  };
  const direct = labels[value];
  if (direct) return direct;
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function useBreadcrumbItems(role: ShellRole): BreadcrumbItem[] {
  const { pathname } = useLocation();
  const dashboardPath = ROLE_DASHBOARD[role];

  const base: BreadcrumbItem[] = [{ label: 'Le Parcours', to: dashboardPath }];

  if (pathname === dashboardPath || pathname === `${dashboardPath}/`) {
    return base;
  }

  for (const section of getNavSections(role)) {
    for (const item of section.items) {
      if (item.disabled) continue;
      if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
        return section.label
          ? [...base, { label: section.label }, { label: item.label }]
          : [...base, { label: item.label }];
      }
    }
  }

  const lastSegment = pathname.split('/').filter(Boolean).pop();
  return lastSegment ? [...base, { label: titleCase(decodeURIComponent(lastSegment)) }] : base;
}
