package com.awardsacademique.reviews.validation;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.exception.CourseNotFoundException;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.reviews.Repository.ReviewRepository;
import com.awardsacademique.reviews.dto.request.UpdateReviewRequest;
import com.awardsacademique.reviews.entity.Review;
import com.awardsacademique.reviews.exception.ReviewNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Encapsulates business validation rules for review operations.
 */
@Component
@RequiredArgsConstructor
public class ReviewValidator {

    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ReviewRepository reviewRepository;
    private final AuthorizationService authorizationService;

    public Course resolveCourse(UUID courseId) {
        return courseRepository.findByIdAndDeletedAtIsNull(courseId)
                .orElseThrow(() -> new CourseNotFoundException(courseId));
    }

    public Review resolveReview(UUID id) {
        return reviewRepository.findById(id)
                .orElseThrow(() -> new ReviewNotFoundException(id));
    }

    public void validateReviewable(Course course, UUID userId) {
        if (!course.isPublished()) {
            throw new IllegalArgumentException("You can only review published courses");
        }
        if (!enrollmentRepository.existsByUserIdAndCourseId(userId, course.getId())) {
            throw new AccessDeniedException("You must be enrolled in the course to review it");
        }
    }

    public void ensureNotAlreadyReviewed(UUID userId, UUID courseId) {
        if (reviewRepository.existsByUserIdAndCourseId(userId, courseId)) {
            throw new IllegalArgumentException("You have already reviewed this course");
        }
    }

    public void validateModificationAccess(Review review, User currentUser) {
        boolean isOwner = review.getUser() != null && review.getUser().getId().equals(currentUser.getId());
        if (!isOwner && !authorizationService.isAdministrator(currentUser)) {
            throw new AccessDeniedException("You can only modify or delete your own reviews");
        }
    }

    public void validateModerationRights(UpdateReviewRequest request, User currentUser) {
        if (request.getStatus() != null && !authorizationService.isAdministrator(currentUser)) {
            throw new AccessDeniedException("Only administrators can moderate review status");
        }
    }
}
