package com.awardsacademique.progress.service.impl;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.common.pipeline.CourseCompletionPipeline;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.enrollments.entity.Enrollment;
import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import com.awardsacademique.lessons.Repository.LessonRepository;
import com.awardsacademique.lessons.entity.Lesson;
import com.awardsacademique.progress.Repository.LessonProgressRepository;
import com.awardsacademique.progress.dto.request.CreateLessonProgressRequest;
import com.awardsacademique.progress.dto.request.UpdateLessonProgressRequest;
import com.awardsacademique.progress.dto.response.CourseProgressResponse;
import com.awardsacademique.progress.dto.response.LessonProgressResponse;
import com.awardsacademique.progress.entity.LessonProgress;
import com.awardsacademique.progress.exception.LessonProgressNotFoundException;
import com.awardsacademique.progress.mapper.LessonProgressMapper;
import com.awardsacademique.progress.service.interfaces.LessonProgressService;
import com.awardsacademique.progress.validation.LessonProgressValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LessonProgressServiceImpl implements LessonProgressService {

    private final LessonProgressRepository lessonProgressRepository;
    private final LessonRepository lessonRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final LessonProgressMapper lessonProgressMapper;
    private final LessonProgressValidator lessonProgressValidator;
    private final AuthorizationService authorizationService;
    private final CourseCompletionPipeline courseCompletionPipeline;

    @Override
    @Transactional
    public LessonProgressResponse create(CreateLessonProgressRequest request) {
        User currentUser = requireCurrentUser();
        Lesson lesson = lessonProgressValidator.resolveLesson(request.getLessonId());

        Enrollment enrollment = resolveOrValidateEnrollment(
                request.getEnrollmentId(), currentUser, lesson
        );

        LessonProgressResponse response = lessonProgressRepository
                .findByEnrollmentIdAndLessonId(enrollment.getId(), lesson.getId())
                .map(existing -> updateExisting(existing, request.isCompleted()))
                .orElseGet(() -> {
                    LessonProgress created = LessonProgress.builder()
                            .enrollment(enrollment)
                            .lesson(lesson)
                            .completed(request.isCompleted())
                            .build();
                    try {
                        return lessonProgressMapper.toResponse(lessonProgressRepository.save(created));
                    } catch (DataIntegrityViolationException ex) {
                        // Race condition: a concurrent request inserted the same
                        // (enrollment, lesson) row between our findBy and save.
                        // Re-query — the row now exists and is the authoritative record.
                        log.warn("Race-condition duplicate on lesson_progress save for enrollment={} lesson={}: {}",
                                enrollment.getId(), lesson.getId(), ex.getMessage());
                        return lessonProgressRepository
                                .findByEnrollmentIdAndLessonId(enrollment.getId(), lesson.getId())
                                .map(existing -> updateExisting(existing, request.isCompleted()))
                                .orElseThrow(() -> ex);
                    }
                });

        courseCompletionPipeline.recomputeForEnrollment(enrollment.getId());
        return response;
    }

    @Override
    @Transactional
    public LessonProgressResponse markLessonCompleted(UUID lessonId) {
        return create(CreateLessonProgressRequest.builder()
                .lessonId(lessonId)
                .completed(true)
                .build());
    }

    @Override
    @Transactional
    public LessonProgressResponse markLessonStarted(UUID lessonId) {
        return create(CreateLessonProgressRequest.builder()
                .lessonId(lessonId)
                .completed(false)
                .build());
    }

    @Override
    @Transactional
    public LessonProgressResponse update(UUID id, UpdateLessonProgressRequest request) {
        LessonProgress progress = lessonProgressRepository.findById(id)
                .orElseThrow(() -> new LessonProgressNotFoundException(id));
        User currentUser = requireCurrentUser();
        lessonProgressValidator.validateModifyAccess(progress, currentUser);

        progress.setCompleted(request.isCompleted());
        LessonProgress saved = lessonProgressRepository.save(progress);

        courseCompletionPipeline.recomputeForEnrollment(saved.getEnrollment().getId());
        return lessonProgressMapper.toResponse(saved);
    }

    @Override
    public LessonProgressResponse getByLesson(UUID lessonId) {
        User currentUser = requireCurrentUser();
        Lesson lesson = lessonProgressValidator.resolveLesson(lessonId);

        return lessonProgressRepository
                .findByUserIdAndLessonId(currentUser.getId(), lesson.getId())
                .map(lessonProgressMapper::toResponse)
                .orElseGet(() -> LessonProgressResponse.builder()
                        .lessonId(lesson.getId())
                        .sectionId(lesson.getSection() != null ? lesson.getSection().getId() : null)
                        .lessonTitle(lesson.getTitle())
                        .userId(currentUser.getId())
                        .courseId(lesson.getSection() != null
                                && lesson.getSection().getCourse() != null
                                ? lesson.getSection().getCourse().getId() : null)
                        .completed(false)
                        .build());
    }

    @Override
    public List<LessonProgressResponse> getByEnrollment(UUID enrollmentId) {
        Enrollment enrollment = lessonProgressValidator.resolveEnrollment(enrollmentId);
        User currentUser = requireCurrentUser();
        if (!authorizationService.isAdministrator(currentUser)
                && (enrollment.getUser() == null
                || !enrollment.getUser().getId().equals(currentUser.getId()))) {
            throw new AccessDeniedException("You can only view progress for your own enrollment");
        }

        List<LessonProgress> byEnrollment =
                lessonProgressRepository.findByEnrollmentIdOrderByLesson_DisplayOrderAsc(enrollmentId);
        return byEnrollment.stream()
                .map(lessonProgressMapper::toResponse)
                .toList();
    }

    @Override
    public CourseProgressResponse getCourseProgressByCourse(UUID courseId) {
        User currentUser = requireCurrentUser();
        Enrollment enrollment = enrollmentRepository
                .findByUserIdAndCourseId(currentUser.getId(), courseId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "You are not enrolled in this course"));
        return courseCompletionPipeline.buildCourseProgress(enrollment);
    }

    @Override
    public CourseProgressResponse getCourseProgressByEnrollment(UUID enrollmentId) {
        Enrollment enrollment = lessonProgressValidator.resolveEnrollment(enrollmentId);
        User currentUser = requireCurrentUser();
        if (!authorizationService.isAdministrator(currentUser)
                && (enrollment.getUser() == null
                || !enrollment.getUser().getId().equals(currentUser.getId()))) {
            throw new AccessDeniedException("You can only view progress for your own enrollment");
        }
        return courseCompletionPipeline.buildCourseProgress(enrollment);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        LessonProgress progress = lessonProgressRepository.findById(id)
                .orElseThrow(() -> new LessonProgressNotFoundException(id));
        User currentUser = requireCurrentUser();
        lessonProgressValidator.validateModifyAccess(progress, currentUser);
        UUID enrollmentId = progress.getEnrollment() != null
                ? progress.getEnrollment().getId() : null;
        lessonProgressRepository.delete(progress);
        courseCompletionPipeline.recomputeForEnrollment(enrollmentId);
    }

    private Enrollment resolveOrValidateEnrollment(
            UUID providedEnrollmentId, User user, Lesson lesson) {
        UUID courseId = lesson.getSection() != null
                && lesson.getSection().getCourse() != null
                ? lesson.getSection().getCourse().getId() : null;
        if (courseId == null) {
            throw new IllegalArgumentException("Lesson is not attached to a course");
        }

        Enrollment enrollment;
        if (providedEnrollmentId != null) {
            enrollment = lessonProgressValidator.resolveEnrollment(providedEnrollmentId);
        } else {
            enrollment = enrollmentRepository.findByUserIdAndCourseId(user.getId(), courseId)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "You are not enrolled in this course"));
        }
        lessonProgressValidator.validateEnrollmentForCourse(enrollment, user, courseId);
        if (enrollment.getStatus() != EnrollmentStatusEnum.active) {
            throw new IllegalArgumentException("Enrollment is not active");
        }
        return enrollment;
    }

    private LessonProgressResponse updateExisting(LessonProgress existing, boolean completed) {
        existing.setCompleted(completed);
        return lessonProgressMapper.toResponse(lessonProgressRepository.save(existing));
    }

    private User requireCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authentication required");
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
    }
}


