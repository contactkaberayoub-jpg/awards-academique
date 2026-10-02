package com.awardsacademique.enrollments.service.impl;

import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.exception.UserNotFoundException;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.enrollments.dto.request.CreateEnrollmentRequest;
import com.awardsacademique.enrollments.dto.request.UpdateEnrollmentRequest;
import com.awardsacademique.enrollments.dto.response.EnrollmentResponse;
import com.awardsacademique.enrollments.entity.Enrollment;
import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import com.awardsacademique.enrollments.exception.EnrollmentNotFoundException;
import com.awardsacademique.enrollments.mapper.EnrollmentMapper;
import com.awardsacademique.enrollments.service.interfaces.EnrollmentService;
import com.awardsacademique.enrollments.validation.EnrollmentValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EnrollmentServiceImpl implements EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final EnrollmentMapper enrollmentMapper;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final AuthorizationService authorizationService;
    private final EnrollmentValidator enrollmentValidator;

    @Override
    @Transactional
    public EnrollmentResponse enroll(CreateEnrollmentRequest request) {
        User student = authorizationService.requireCurrentUser();
        return doEnroll(student, request);
    }

    @Override
    @Transactional
    public EnrollmentResponse enrollAs(UUID userId, CreateEnrollmentRequest request) {
        authorizationService.requireAdministrator();
        User student = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
        return doEnroll(student, request);
    }

    @Override
    @Transactional
    public EnrollmentResponse enrollFromPaidOrder(User student, Course course) {
        enrollmentValidator.ensureNotAlreadyEnrolled(student.getId(), course.getId());
        return persistEnrollment(student, course);
    }

    private EnrollmentResponse doEnroll(User student, CreateEnrollmentRequest request) {
        Course course = enrollmentValidator.resolveCourse(request.getCourseId());

        enrollmentValidator.validateEnrollable(course);
        enrollmentValidator.ensureNotAlreadyEnrolled(student.getId(), course.getId());

        return persistEnrollment(student, course);
    }

    private EnrollmentResponse persistEnrollment(User student, Course course) {
        Enrollment enrollment = Enrollment.builder()
                .user(student)
                .course(course)
                .status(EnrollmentStatusEnum.active)
                .completionPercentage(BigDecimal.ZERO)
                .build();

        Enrollment saved = enrollmentRepository.save(enrollment);

        course.setEnrollmentsCount(course.getEnrollmentsCount() + 1);
        course.setUpdatedAt(LocalDateTime.now());
        courseRepository.save(course);

        return enrollmentMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getMine() {
        User currentUser = authorizationService.requireCurrentUser();
        return enrollmentRepository.findByUserIdOrderByEnrolledAtDesc(currentUser.getId()).stream()
                .map(enrollmentMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getByCourse(UUID courseId) {
        Course course = enrollmentValidator.resolveCourse(courseId);

        User currentUser = authorizationService.requireCurrentUser();
        if (!authorizationService.isAdministrator(currentUser)
                && !authorizationService.ownsCourse(course, currentUser)) {
            throw new AccessDeniedException("You can only view enrollments for your own courses");
        }

        return enrollmentRepository.findByCourseIdOrderByEnrolledAtDesc(courseId).stream()
                .map(enrollmentMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getAll() {
        authorizationService.requireAdministrator();
        return enrollmentRepository.findAllByOrderByEnrolledAtDesc().stream()
                .map(enrollmentMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public EnrollmentResponse update(UUID id, UpdateEnrollmentRequest request) {
        authorizationService.requireAdministrator();
        Enrollment enrollment = enrollmentValidator.resolveEnrollment(id);

        if (request.getStatus() != null) {
            enrollment.setStatus(request.getStatus());
            if (request.getStatus() == EnrollmentStatusEnum.completed
                    && enrollment.getCompletedAt() == null) {
                enrollment.setCompletedAt(LocalDateTime.now());
            }
        }
        if (request.getCompletionPercentage() != null) {
            enrollment.setCompletionPercentage(request.getCompletionPercentage());
            if (enrollment.getCompletionPercentage().compareTo(BigDecimal.valueOf(100)) == 0) {
                enrollment.setCompletedAt(LocalDateTime.now());
                enrollment.setStatus(EnrollmentStatusEnum.completed);
            }
        }
        enrollment.setLastActivityAt(LocalDateTime.now());

        return enrollmentMapper.toResponse(enrollmentRepository.save(enrollment));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        authorizationService.requireAdministrator();
        Enrollment enrollment = enrollmentValidator.resolveEnrollment(id);

        Course course = enrollment.getCourse();
        enrollmentRepository.delete(enrollment);

        if (course != null
                && (enrollment.getStatus() == EnrollmentStatusEnum.active
                    || enrollment.getStatus() == EnrollmentStatusEnum.completed)) {
            int current = course.getEnrollmentsCount();
            course.setEnrollmentsCount(Math.max(0, current - 1));
            course.setUpdatedAt(LocalDateTime.now());
            courseRepository.save(course);
        }
    }
}

