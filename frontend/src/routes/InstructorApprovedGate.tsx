import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { User } from '../types';

/**
 * Instructors whose application has not been approved yet only have access to
 * their application page. Pending or rejected instructors are redirected there
 * instead of reaching the dashboard (courses, earnings, payouts, etc.) which
 * the backend now guards with the approved-instructor check.
 */
export const InstructorApprovedGate: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const location = useLocation();

  if (user?.role !== 'INSTRUCTOR') {
    return <>{children}</>;
  }

  const isApplicationPage = location.pathname === '/instructor/application';

  // Users who still have a stored user without a status can browse until the
  // next /auth/me refresh resolves their status.
  if (!user.instructorStatus) {
    return <>{children}</>;
  }

  if (user.instructorStatus !== 'APPROVED' && !isApplicationPage) {
    return <Navigate to="/instructor/application" replace />;
  }

  return <>{children}</>;
};

export function isApprovedInstructor(user: User | null): boolean {
  return user?.role === 'INSTRUCTOR' && user.instructorStatus === 'APPROVED';
}