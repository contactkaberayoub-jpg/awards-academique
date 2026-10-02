package com.awardsacademique.common.rbac;

import com.awardsacademique.authentification.entity.InstructorStatusEnum;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Single source of truth for authorization rules used by the feature services.
 *
 * <p>Central RBAC rules:
 * <ul>
 *   <li>Administrators can read and modify everything.</li>
 *   <li>Instructors can only modify courses they own, and only while the course
 *       is in {@code pending} or {@code rejected} state. They cannot publish
 *       courses or lessons.</li>
 *   <li>Instructors whose application is {@code pending} or {@code rejected}
 *       are blocked from all instructor-sensitive functionality.</li>
 *   <li>Students can only read published content.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class AuthorizationService {

    private final CurrentUserProvider currentUserProvider;

    public User requireCurrentUser() {
        return currentUserProvider.requireCurrentUser();
    }

    /** The currently authenticated user, or {@link Optional#empty()} for anonymous requests. */
    public Optional<User> getCurrentUser() {
        return currentUserProvider.getCurrentUser();
    }

    public boolean isAdministrator() {
        return currentUserProvider.getCurrentUser()
                .map(currentUserProvider::isAdministrator)
                .orElse(false);
    }

    public boolean isAdministrator(User user) {
        return currentUserProvider.isAdministrator(user);
    }

    public boolean isInstructor(User user) {
        return currentUserProvider.isInstructor(user);
    }

    public boolean isApprovedInstructor(User user) {
        return currentUserProvider.isInstructor(user)
                && user.getInstructorStatus() == InstructorStatusEnum.APPROVED;
    }

    /**
     * Requires the current principal to be an instructor whose application has
     * been approved. Pending or rejected instructors are rejected here so that
     * instructor-sensitive functionality is blocked until approval.
     */
    public User requireApprovedInstructor() {
        User user = requireCurrentUser();
        if (!isApprovedInstructor(user)) {
            if (isAdministrator(user)) {
                throw new AccessDeniedException("Administrators cannot act as instructors");
            }
            throw new AccessDeniedException(
                    "Only instructors whose application has been approved can perform this action");
        }
        return user;
    }

    /**
     * Like {@link #requireApprovedInstructor()} but operating on an explicit
     * user that must be an approved instructor.
     */
    public void requireApprovedInstructor(User user) {
        if (!isApprovedInstructor(user)) {
            if (isAdministrator(user)) {
                throw new AccessDeniedException("Administrators cannot act as instructors");
            }
            throw new AccessDeniedException(
                    "Only instructors whose application has been approved can perform this action");
        }
    }

    public void requireAdministrator() {
        if (!isAdministrator()) {
            throw new AccessDeniedException("You do not have permission to perform this action");
        }
    }

    /**
     * Like {@link #requireAdministrator()} but also returns the authenticated
     * administrator (e.g. to stamp reviewed_by on financial records).
     */
    public User requireAdministratorReturningUser() {
        User user = requireCurrentUser();
        if (!isAdministrator(user)) {
            throw new AccessDeniedException("You do not have permission to perform this action");
        }
        return user;
    }

    public void requireAnyRole(User user, String... roleNames) {
        if (user == null || user.getRole() == null) {
            throw new AccessDeniedException("Authentication required");
        }
        String actual = user.getRole().getName().name();
        for (String role : roleNames) {
            if (actual.equals(role)) {
                return;
            }
        }
        throw new AccessDeniedException("You do not have permission to perform this action");
    }

    public boolean ownsCourse(Course course, User user) {
        return user != null
                && course != null
                && course.getInstructor() != null
                && course.getInstructor().getId() != null
                && course.getInstructor().getId().equals(user.getId());
    }

    /**
     * Administrators may modify any course. Instructors may only modify courses
     * they own while the course is pending or rejected.
     */
    public void requireCanModifyCourse(Course course, User user) {
        if (isAdministrator(user)) {
            return;
        }
        if (!ownsCourse(course, user)) {
            throw new AccessDeniedException("You can only modify your own courses");
        }
        if (user.getInstructorStatus() != InstructorStatusEnum.APPROVED) {
            throw new AccessDeniedException(
                    "Only instructors whose application has been approved can modify courses");
        }
        CourseStatusEnum status = course.getStatus();
        if (status != CourseStatusEnum.pending && status != CourseStatusEnum.rejected) {
            throw new AccessDeniedException("Courses can only be edited while in pending or rejected state");
        }
    }

    /**
     * Ensures the current principal may view a course. Published courses are
     * public; anything else requires the administrator or the owning instructor.
     */
    public void requireCanViewCourse(Course course) {
        if (course.isPublished()) {
            return;
        }
        User user = currentUserProvider.getCurrentUser()
                .orElseThrow(() -> new AccessDeniedException("Authentication required to view this course"));
        if (isAdministrator(user) || ownsCourse(course, user)) {
            return;
        }
        throw new AccessDeniedException("You do not have permission to view this course");
    }

    public void requireCanPublishLesson(User user) {
        if (!isAdministrator(user)) {
            throw new AccessDeniedException("Only administrators can publish lessons");
        }
    }

    /**
     * Instructors may never modify lessons that are already published.
     */
    public void requireCanModifyPublishedLesson(User user, boolean lessonPublished) {
        if (lessonPublished && !isAdministrator(user)) {
            throw new AccessDeniedException("Published lessons can only be modified by administrators");
        }
    }
}
