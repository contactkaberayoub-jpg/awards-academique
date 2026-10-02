package com.awardsacademique.progress.validation;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.enrollments.entity.Enrollment;
import com.awardsacademique.enrollments.exception.EnrollmentNotFoundException;
import com.awardsacademique.lessons.Repository.LessonRepository;
import com.awardsacademique.lessons.entity.Lesson;
import com.awardsacademique.lessons.exception.LessonNotFoundException;
import com.awardsacademique.progress.entity.LessonProgress;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LessonProgressValidator {

    private final LessonRepository lessonRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AuthorizationService authorizationService;

    public Lesson resolveLesson(UUID lessonId) {
        return lessonRepository.findByIdAndDeletedAtIsNull(lessonId)
                .orElseThrow(() -> new LessonNotFoundException(lessonId));
    }

    public Enrollment resolveEnrollment(UUID enrollmentId) {
        return enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new EnrollmentNotFoundException(enrollmentId));
    }

    public void validateEnrollmentForCourse(Enrollment enrollment, User user, UUID courseId) {
        if (enrollment.getUser() == null
                || !enrollment.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Enrollment does not belong to the current user");
        }
        if (enrollment.getCourse() == null
                || !enrollment.getCourse().getId().equals(courseId)) {
            throw new IllegalArgumentException("Enrollment does not match the lesson's course");
        }
    }

    public void validateModifyAccess(LessonProgress progress, User currentUser) {
        boolean isOwner = progress.getEnrollment() != null
                && progress.getEnrollment().getUser() != null
                && progress.getEnrollment().getUser().getId().equals(currentUser.getId());
        if (!isOwner && !authorizationService.isAdministrator(currentUser)) {
            throw new AccessDeniedException("You can only modify your own lesson progress");
        }
    }
}
