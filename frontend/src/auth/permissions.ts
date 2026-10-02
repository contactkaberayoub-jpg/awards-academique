import type { Role } from '../types';

/**
 * Central permission registry for the UI. The same rules are enforced
 * server-side by com.awardsacademique.common.rbac.AuthorizationService;
 * this module only controls what the UI surfaces (routes, buttons, forms).
 */
export const PERMISSIONS = {
  COURSE_CREATE: 'courses:create',
  COURSE_EDIT_OWN: 'courses:editOwn',
  COURSE_DELETE_OWN: 'courses:deleteOwn',
  COURSE_PUBLISH: 'courses:publish',
  COURSE_REJECT: 'courses:reject',
  COURSE_ARCHIVE: 'courses:archive',
  COURSE_RESTORE: 'courses:restore',
  SECTION_MANAGE: 'sections:manage',
  LESSON_MANAGE: 'lessons:manage',
  LESSON_PUBLISH: 'lessons:publish',
  CATEGORY_MANAGE: 'categories:manage',
  USER_MANAGE: 'users:manage',
  ANALYTICS_VIEW: 'analytics:view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMINISTRATOR: [
    PERMISSIONS.COURSE_CREATE,
    PERMISSIONS.COURSE_EDIT_OWN,
    PERMISSIONS.COURSE_DELETE_OWN,
    PERMISSIONS.COURSE_PUBLISH,
    PERMISSIONS.COURSE_REJECT,
    PERMISSIONS.COURSE_ARCHIVE,
    PERMISSIONS.COURSE_RESTORE,
    PERMISSIONS.SECTION_MANAGE,
    PERMISSIONS.LESSON_MANAGE,
    PERMISSIONS.LESSON_PUBLISH,
    PERMISSIONS.CATEGORY_MANAGE,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  INSTRUCTOR: [
    PERMISSIONS.COURSE_CREATE,
    PERMISSIONS.COURSE_EDIT_OWN,
    PERMISSIONS.COURSE_DELETE_OWN,
    PERMISSIONS.SECTION_MANAGE,
    PERMISSIONS.LESSON_MANAGE,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  STUDENT: [],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
