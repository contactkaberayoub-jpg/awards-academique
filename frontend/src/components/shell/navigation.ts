import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  ClipboardCheck,
  FolderOpen,
  GraduationCap,
  Layers,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  NotebookTabs,
  PieChart,
  Receipt,
  Settings,
  Shapes,
  ShoppingCart,
  Sparkles,
  Star,
  UserCheck,
  UserCircle,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  disabled?: boolean;
  soon?: boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export type ShellRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMINISTRATOR';

export const NAV_BY_ROLE: Record<ShellRole, NavSection[]> = {
  STUDENT: [
    {
      label: 'Le Parcours',
      items: [{ label: 'Mon parcours', to: '/student', icon: LayoutDashboard, end: true }],
    },
    {
      label: 'Découvrir',
      items: [
        { label: 'Mes cours', to: '/student/courses', icon: BookOpen },
        { label: 'Mes certificats', to: '/student/certificates', icon: Award },
        { label: 'Assistant IA', to: '/student/ai', icon: Sparkles },
        { label: 'Panier', to: '/cart', icon: ShoppingCart },
        { label: 'Commandes', to: '/student/orders', icon: Receipt },
      ],
    },
    {
      label: 'Compte',
      items: [
        { label: 'Profil', to: '/student/profile', icon: UserCircle },
      ],
    },
  ],

  INSTRUCTOR: [
    {
      label: 'Le Parcours',
      items: [
        { label: 'Vue d\'ensemble', to: '/instructor', icon: LayoutDashboard, end: true },
        { label: 'Ma candidature', to: '/instructor/application', icon: ClipboardCheck },
      ],
    },
    {
      label: 'Enseigner',
      items: [
        { label: 'Mes cours', to: '/instructor/courses', icon: BookOpen },
        { label: 'Sections', to: '/instructor/sections', icon: Layers },
        { label: 'Leçons', to: '/instructor/lessons', icon: NotebookTabs },
        { label: 'Quiz', to: '/instructor/quizzes', icon: ListChecks },
        { label: 'Ressources', to: '/instructor/resources', icon: FolderOpen },
      ],
    },
    {
      label: 'Audience',
      items: [
        { label: 'Étudiants', to: '/instructor/students', icon: Users },
        { label: 'Commandes', to: '/instructor/orders', icon: Receipt },
        { label: 'Revenus & Retraits', to: '/instructor/earnings', icon: Wallet },
        { label: 'Avis', to: '/instructor/reviews', icon: Star },
        { label: 'Certificats', to: '/instructor/certificates', icon: Award },
      ],
    },
    {
      label: 'Analyses',
      items: [{ label: 'Statistiques', to: '/instructor/analytics', icon: BarChart3 }],
    },
    {
      label: 'Compte',
      items: [
        { label: 'Profil', to: '/instructor/profile', icon: UserCircle },
        { label: 'Notifications', to: '/instructor/notifications', icon: Bell },
      ],
    },
  ],

  ADMINISTRATOR: [
    {
      label: 'Le Parcours',
      items: [{ label: 'Vue d\'ensemble', to: '/admin', icon: LayoutDashboard, end: true }],
    },
    {
      label: 'Catalogue',
      items: [
        { label: 'Catégories', to: '/admin/categories', icon: Shapes },
        { label: 'Cours', to: '/admin/courses', icon: BookOpen },
        { label: 'Sections', to: '/admin/sections', icon: Layers },
        { label: 'Leçons', to: '/admin/lessons', icon: NotebookTabs },
      ],
    },
    {
      label: 'Plateforme',
      items: [
        { label: 'Étudiants', to: '/admin/students', icon: GraduationCap },
        { label: 'Formateurs', to: '/admin/instructors', icon: Users },
        { label: 'Candidatures formateurs', to: '/admin/instructor-applications', icon: UserCheck },
        { label: 'Avis', to: '/admin/reviews', icon: MessageSquare },
        { label: 'Revenus', to: '/admin/revenue', icon: Wallet },
        { label: 'Versements', to: '/admin/payouts', icon: Receipt },
        { label: 'Paramètres', to: '/admin/parametres', icon: Settings },
        { label: 'Rapports', to: '/admin/reports', icon: PieChart },
      ],
    },
  ],
};

export function getNavSections(role: ShellRole): NavSection[] {
  return NAV_BY_ROLE[role] ?? [];
}
