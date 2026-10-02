import { BrowserRouter, Routes, Route } from 'react-router-dom';

import MainLayout from '@/layouts/MainLayout';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import AdminLayout from '@/layouts/AdminLayout';
import InstructorLayout from '@/layouts/InstructorLayout';

import LandingPage from '@/pages/LandingPage';
import CoursesCatalogPage from '@/pages/courses/CoursesCatalogPage';
import CourseDetailsPage from '@/pages/courses/CourseDetailsPage';
import VerifyCertificatePage from '@/pages/public/VerifyCertificatePage';
import CartPage from '@/pages/cart/CartPage';
import CheckoutPage from '@/pages/checkout/CheckoutPage';
import NotFoundPage from '@/pages/notfound/NotFoundPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import GoogleCallbackPage from '@/pages/auth/GoogleCallbackPage';
import BecomeInstructorPage from '@/pages/auth/BecomeInstructorPage';

import StudentDashboard from '@/pages/student/StudentDashboard';
import MyCoursesPage from '@/pages/student/MyCoursesPage';
import LearningPage from '@/pages/student/LearningPage';
import StudentCertificatesPage from '@/pages/student/StudentCertificatesPage';
import StudentCertificateViewPage from '@/pages/student/StudentCertificateViewPage';
import StudentOrdersPage from '@/pages/student/StudentOrdersPage';
import StudentProfilePage from '@/pages/student/StudentProfilePage';
import StudentAIPage from '@/pages/student/StudentAIPage';
import InstructorDashboard from '@/pages/instructor/InstructorDashboard';
import InstructorCoursesPage from '@/pages/instructor/InstructorCoursesPage';
import InstructorCourseManagePage from '@/pages/instructor/InstructorCourseManagePage';
import InstructorSectionsPage from '@/pages/instructor/InstructorSectionsPage';
import InstructorLessonsPage from '@/pages/instructor/InstructorLessonsPage';
import InstructorStudentsPage from '@/pages/instructor/InstructorStudentsPage';
import InstructorAnalyticsPage from '@/pages/instructor/InstructorAnalyticsPage';
import InstructorProfilePage from '@/pages/instructor/InstructorProfilePage';
import InstructorNotificationsPage from '@/pages/instructor/InstructorNotificationsPage';
import InstructorQuizzesPage from '@/pages/instructor/InstructorQuizzesPage';
import InstructorResourcesPage from '@/pages/instructor/InstructorResourcesPage';
import InstructorOrdersPage from '@/pages/instructor/InstructorOrdersPage';
import InstructorEarningsPage from '@/pages/instructor/InstructorEarningsPage';
import InstructorReviewsPage from '@/pages/instructor/InstructorReviewsPage';
import InstructorCertificatesPage from '@/pages/instructor/InstructorCertificatesPage';
import InstructorApplicationPage from '@/pages/instructor/InstructorApplicationPage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import CategoriesPage from '@/pages/admin/CategoriesPage';
import CoursesPage from '@/pages/admin/CoursesPage';
import SectionsPage from '@/pages/admin/SectionsPage';
import LessonsPage from '@/pages/admin/LessonsPage';
import AdminRevenuePage from '@/pages/admin/AdminRevenuePage';
import AdminPayoutsPage from '@/pages/admin/AdminPayoutsPage';
import AdminPlatformParametresPage from '@/pages/admin/AdminPlatformParametresPage';
import AdminInstructorApplicationsPage from '@/pages/admin/AdminInstructorApplicationsPage';
import AdminInstructorsPage from '@/pages/admin/AdminInstructorsPage';
import AdminInstructorDetailsPage from '@/pages/admin/AdminInstructorDetailsPage';
import AdminCourseDetailsPage from '@/pages/admin/AdminCourseDetailsPage';
import AdminReviewsPage from '@/pages/admin/AdminReviewsPage';
import AdminStudentsPage from '@/pages/admin/AdminStudentsPage';
import AdminReportsPage from '@/pages/admin/AdminReportsPage';

import { ProtectedRoute } from './ProtectedRoute';
import { InstructorApprovedGate } from './InstructorApprovedGate';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/courses" element={<CoursesCatalogPage />} />
          <Route path="/courses/:id" element={<CourseDetailsPage />} />
          <Route
            path="/cart"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route path="/certificate/verify" element={<VerifyCertificatePage />} />
        </Route>

        {/* Auth */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/become-instructor" element={<BecomeInstructorPage />} />
        </Route>

        {/* Learning Space */}
        <Route
          path="/learning/:courseId"
          element={
            <ProtectedRoute allowedRoles={['STUDENT', 'INSTRUCTOR', 'ADMINISTRATOR']}>
              <LearningPage />
            </ProtectedRoute>
          }
        />

        {/* Standalone certificate diploma page (outside the dashboard shell) so
            printing exports only the A4 certificate. */}
        <Route
          path="/student/certificates/:certificateId"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentCertificateViewPage />
            </ProtectedRoute>
          }
        />

        {/* Role-specific shells (protected) — one AppShell instance per role */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="courses" element={<MyCoursesPage />} />
          <Route path="certificates" element={<StudentCertificatesPage />} />
          <Route path="orders" element={<StudentOrdersPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
          <Route path="ai" element={<StudentAIPage />} />
        </Route>

        <Route
          path="/instructor"
          element={
            <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
              <InstructorApprovedGate>
                <InstructorLayout />
              </InstructorApprovedGate>
            </ProtectedRoute>
          }
        >
          <Route index element={<InstructorDashboard />} />
          <Route path="application" element={<InstructorApplicationPage />} />
          <Route path="courses" element={<InstructorCoursesPage />} />
          <Route path="courses/:courseId/manage" element={<InstructorCourseManagePage />} />
          <Route path="sections" element={<InstructorSectionsPage />} />
          <Route path="lessons" element={<InstructorLessonsPage />} />
          <Route path="students" element={<InstructorStudentsPage />} />
          <Route path="analytics" element={<InstructorAnalyticsPage />} />
          <Route path="quizzes" element={<InstructorQuizzesPage />} />
          <Route path="resources" element={<InstructorResourcesPage />} />
          <Route path="orders" element={<InstructorOrdersPage />} />
          <Route path="earnings" element={<InstructorEarningsPage />} />
          <Route path="reviews" element={<InstructorReviewsPage />} />
          <Route path="certificates" element={<InstructorCertificatesPage />} />
          <Route path="profile" element={<InstructorProfilePage />} />
          <Route path="notifications" element={<InstructorNotificationsPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:id" element={<AdminCourseDetailsPage />} />
          <Route path="sections" element={<SectionsPage />} />
          <Route path="lessons" element={<LessonsPage />} />
          <Route path="revenue" element={<AdminRevenuePage />} />
          <Route path="payouts" element={<AdminPayoutsPage />} />
          <Route path="instructors" element={<AdminInstructorsPage />} />
          <Route path="instructors/:id" element={<AdminInstructorDetailsPage />} />
          <Route path="instructor-applications" element={<AdminInstructorApplicationsPage />} />
          <Route path="students" element={<AdminStudentsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="parametres" element={<AdminPlatformParametresPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
