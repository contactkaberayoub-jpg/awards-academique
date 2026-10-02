package com.awardsacademique.reviews.service.impl;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.exception.CourseNotFoundException;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.reviews.Repository.ReviewRepository;
import com.awardsacademique.reviews.validation.ReviewValidator;
import com.awardsacademique.reviews.dto.request.CreateReviewRequest;
import com.awardsacademique.reviews.dto.request.UpdateReviewRequest;
import com.awardsacademique.reviews.dto.response.ReviewResponse;
import com.awardsacademique.reviews.entity.Review;
import com.awardsacademique.reviews.entity.ReviewStatusEnum;
import com.awardsacademique.reviews.exception.ReviewNotFoundException;
import com.awardsacademique.reviews.mapper.ReviewMapper;
import com.awardsacademique.reviews.service.interfaces.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReviewMapper reviewMapper;
    private final CourseRepository courseRepository;
    private final AuthorizationService authorizationService;
    private final ReviewValidator reviewValidator;

    @Override
    @Transactional
    public ReviewResponse create(CreateReviewRequest request) {
        User student = authorizationService.requireCurrentUser();
        Course course = reviewValidator.resolveCourse(request.getCourseId());

        reviewValidator.validateReviewable(course, student.getId());
        reviewValidator.ensureNotAlreadyReviewed(student.getId(), course.getId());

        Review review = Review.builder()
                .user(student)
                .course(course)
                .rating(request.getRating())
                .comment(request.getComment())
                .status(ReviewStatusEnum.visible)
                .build();

        Review saved = reviewRepository.save(review);
        recalculateCourseAverage(course);
        return reviewMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewResponse> getMine() {
        User currentUser = authorizationService.requireCurrentUser();
        return reviewRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId()).stream()
                .map(reviewMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewResponse> getByCourse(UUID courseId) {
        Course course = reviewValidator.resolveCourse(courseId);

        User currentUser = authorizationService.requireCurrentUser();
        boolean privileged = authorizationService.isAdministrator(currentUser)
                || authorizationService.ownsCourse(course, currentUser);

        List<Review> reviews;
        if (privileged) {
            reviews = reviewRepository.findByCourseIdOrderByCreatedAtDesc(courseId);
        } else if (course.isPublished()) {
            reviews = reviewRepository.findByCourseIdAndStatus(courseId, ReviewStatusEnum.visible);
        } else {
            throw new AccessDeniedException("You do not have permission to view reviews for this course");
        }

        return reviews.stream()
                .map(reviewMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewResponse> getAll() {
        authorizationService.requireAdministrator();
        return reviewRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(reviewMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ReviewResponse update(UUID id, UpdateReviewRequest request) {
        User currentUser = authorizationService.requireCurrentUser();
        Review review = reviewValidator.resolveReview(id);

        reviewValidator.validateModerationRights(request, currentUser);
        reviewValidator.validateModificationAccess(review, currentUser);

        if (request.getRating() != null) {
            review.setRating(request.getRating());
        }
        if (request.getComment() != null) {
            review.setComment(request.getComment());
        }
        if (request.getStatus() != null) {
            review.setStatus(request.getStatus());
        }

        Review saved = reviewRepository.save(review);
        recalculateCourseAverage(review.getCourse());
        return reviewMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        User currentUser = authorizationService.requireCurrentUser();
        Review review = reviewValidator.resolveReview(id);

        reviewValidator.validateModificationAccess(review, currentUser);

        Course course = review.getCourse();
        reviewRepository.delete(review);
        recalculateCourseAverage(course);
    }

    private void recalculateCourseAverage(Course course) {
        List<Review> visibleReviews = reviewRepository.findByCourseIdAndStatus(course.getId(), ReviewStatusEnum.visible);

        BigDecimal average = BigDecimal.ZERO;
        int count = visibleReviews.size();
        if (count > 0) {
            BigDecimal sum = visibleReviews.stream()
                    .map(r -> BigDecimal.valueOf(r.getRating()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            average = sum.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
        }

        course.setAverageRating(average);
        course.setReviewsCount(count);
        course.setUpdatedAt(LocalDateTime.now());
        courseRepository.save(course);
    }
}
