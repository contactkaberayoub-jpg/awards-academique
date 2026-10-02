package com.awardsacademique.enrollments.validation;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.courses.exception.CourseNotFoundException;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.enrollments.entity.Enrollment;
import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import com.awardsacademique.enrollments.exception.EnrollmentNotFoundException;
import com.awardsacademique.enrollments.exception.PaymentRequiredException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Encapsulates business validation rules for enrollment operations.
 */
@Component
@RequiredArgsConstructor
public class EnrollmentValidator {

    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;

    public Course resolveCourse(UUID courseId) {
        return courseRepository.findByIdAndDeletedAtIsNull(courseId)
                .orElseThrow(() -> new CourseNotFoundException(courseId));
    }

    public Enrollment resolveEnrollment(UUID id) {
        return enrollmentRepository.findById(id)
                .orElseThrow(() -> new EnrollmentNotFoundException(id));
    }

    public void validateEnrollable(Course course) {
        if (course.getStatus() != CourseStatusEnum.published || !course.isPublished()) {
            throw new IllegalArgumentException("You can only enroll in published courses");
        }
        if (!course.isActive()) {
            throw new IllegalArgumentException("This course is no longer accepting enrollments");
        }
        // Paid courses require payment, which is not implemented yet. The price always comes from
        // the Course entity (never from the client) so it cannot be spoofed by the frontend.
        BigDecimal price = course.getPrice();
        if (price != null && price.compareTo(BigDecimal.ZERO) > 0) {
            throw new PaymentRequiredException(
                    "Payment required: this course is not free. Please purchase it before enrolling.");
        }
    }

    public void ensureNotAlreadyEnrolled(UUID userId, UUID courseId) {
        if (enrollmentRepository.findByUserIdAndCourseId(userId, courseId).isPresent()) {
            throw new IllegalStateException("You are already enrolled in this course");
        }
    }

    public boolean hasActiveEnrollment(User user, Course course) {
        if (user == null || course == null) {
            return false;
        }
        return enrollmentRepository.findByUserIdAndCourseId(user.getId(), course.getId())
                .filter(e -> e.getStatus() == EnrollmentStatusEnum.active || e.getStatus() == EnrollmentStatusEnum.completed)
                .isPresent();
    }

    public void requireActiveEnrollment(User user, Course course) {
        if (!hasActiveEnrollment(user, course)) {
            throw new AccessDeniedException(
                    "You must have an active enrollment to access this course's learning content");
        }
    }
}
