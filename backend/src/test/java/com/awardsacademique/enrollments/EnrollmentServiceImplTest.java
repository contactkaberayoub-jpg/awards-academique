package com.awardsacademique.enrollments;

import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.enrollments.dto.request.CreateEnrollmentRequest;
import com.awardsacademique.enrollments.dto.response.EnrollmentResponse;
import com.awardsacademique.enrollments.entity.Enrollment;
import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import com.awardsacademique.enrollments.exception.PaymentRequiredException;
import com.awardsacademique.enrollments.mapper.EnrollmentMapper;
import com.awardsacademique.enrollments.service.impl.EnrollmentServiceImpl;
import com.awardsacademique.enrollments.validation.EnrollmentValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Service-level tests for the Sprint 1 enrollment business rule.
 *
 * <p>Uses the real {@link EnrollmentValidator} so the price gate is exercised
 * through the actual production chain: enroll() -> validateEnrollable() -> save().
 */
@ExtendWith(MockitoExtension.class)
class EnrollmentServiceImplTest {

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private EnrollmentMapper enrollmentMapper;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuthorizationService authorizationService;

    private EnrollmentServiceImpl service;

    @BeforeEach
    void setUp() {
        EnrollmentValidator validator = new EnrollmentValidator(courseRepository, enrollmentRepository);
        service = new EnrollmentServiceImpl(
                enrollmentRepository, enrollmentMapper, courseRepository,
                userRepository, authorizationService, validator);
    }

    private User student() {
        return User.builder().id(UUID.randomUUID()).build();
    }

    private Course course(UUID id, boolean published, boolean active, String price) {
        return Course.builder()
                .id(id)
                .status(CourseStatusEnum.published)
                .published(published)
                .isActive(active)
                .price(new BigDecimal(price))
                .build();
    }

    private CreateEnrollmentRequest request(UUID courseId) {
        return CreateEnrollmentRequest.builder().courseId(courseId).build();
    }

    // A. Published + active + FREE course -> enrollment created with status ACTIVE
    @Test
    void enroll_freeCourse_createsActiveEnrollment() {
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course freeCourse = course(courseId, true, true, "0");
        freeCourse.setEnrollmentsCount(5);

        when(authorizationService.requireCurrentUser()).thenReturn(student);
        when(courseRepository.findByIdAndDeletedAtIsNull(courseId)).thenReturn(Optional.of(freeCourse));
        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), courseId))
                .thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> inv.getArgument(0));
        EnrollmentResponse response = EnrollmentResponse.builder().id(UUID.randomUUID()).build();
        when(enrollmentMapper.toResponse(any(Enrollment.class))).thenReturn(response);

        EnrollmentResponse result = service.enroll(request(courseId));

        assertEquals(response, result);
        ArgumentCaptor<Enrollment> captor = ArgumentCaptor.forClass(Enrollment.class);
        verify(enrollmentRepository).save(captor.capture());
        assertEquals(EnrollmentStatusEnum.active, captor.getValue().getStatus());
        assertEquals(6, freeCourse.getEnrollmentsCount());
    }

    // B. Published + active + PAID course -> PaymentRequiredException, enrollment never created
    @Test
    void enroll_paidCourse_throwsPaymentRequiredAndNeverSaves() {
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course paidCourse = course(courseId, true, true, "49.99");

        when(authorizationService.requireCurrentUser()).thenReturn(student);
        when(courseRepository.findByIdAndDeletedAtIsNull(courseId)).thenReturn(Optional.of(paidCourse));

        assertThrows(PaymentRequiredException.class, () -> service.enroll(request(courseId)));
        verify(enrollmentRepository, never()).save(any(Enrollment.class));
    }

    // C. Unpublished course -> existing IllegalArgumentException preserved
    @Test
    void enroll_unpublishedCourse_throwsIllegalArgument() {
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course unpublished = course(courseId, false, true, "0");

        when(authorizationService.requireCurrentUser()).thenReturn(student);
        when(courseRepository.findByIdAndDeletedAtIsNull(courseId)).thenReturn(Optional.of(unpublished));

        assertThrows(IllegalArgumentException.class, () -> service.enroll(request(courseId)));
        verify(enrollmentRepository, never()).save(any(Enrollment.class));
    }

    // D. Inactive course -> existing IllegalArgumentException preserved
    @Test
    void enroll_inactiveCourse_throwsIllegalArgument() {
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course inactive = course(courseId, true, false, "0");

        when(authorizationService.requireCurrentUser()).thenReturn(student);
        when(courseRepository.findByIdAndDeletedAtIsNull(courseId)).thenReturn(Optional.of(inactive));

        assertThrows(IllegalArgumentException.class, () -> service.enroll(request(courseId)));
        verify(enrollmentRepository, never()).save(any(Enrollment.class));
    }

    // E. Duplicate enrollment -> existing IllegalStateException preserved
    @Test
    void enroll_duplicateEnrollment_throwsIllegalState() {
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course freeCourse = course(courseId, true, true, "0");

        when(authorizationService.requireCurrentUser()).thenReturn(student);
        when(courseRepository.findByIdAndDeletedAtIsNull(courseId)).thenReturn(Optional.of(freeCourse));
        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), courseId))
                .thenReturn(Optional.of(Enrollment.builder().id(UUID.randomUUID()).build()));

        assertThrows(IllegalStateException.class, () -> service.enroll(request(courseId)));
        verify(enrollmentRepository, never()).save(any(Enrollment.class));
    }

    // F. The administrator enrollment path (enrollAs) is still protected: a non-admin cannot grant
    //    an enrollment for another user, while the owner-grant path (enrollFromPaidOrder) used by
    //    free-order/mock-payment does not require admin.
    @Test
    void enrollAs_nonAdmin_isProtected() {
        UUID studentId = UUID.randomUUID();
        CreateEnrollmentRequest req = CreateEnrollmentRequest.builder().courseId(UUID.randomUUID()).build();
        doThrow(new AccessDeniedException("admin required")).when(authorizationService).requireAdministrator();

        assertThrows(AccessDeniedException.class, () -> service.enrollAs(studentId, req));
        verify(enrollmentRepository, never()).save(any(Enrollment.class));
    }

    // Sprint 4: the free-order owner-grant uses enrollFromPaidOrder, which must NOT require admin
    // and must create an ACTIVE enrollment for the order owner.
    @Test
    void enrollFromPaidOrder_freeCourse_createsActiveEnrollmentForOwner() {
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course freeCourse = course(courseId, true, true, "0");

        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), courseId)).thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(enrollmentMapper.toResponse(any(Enrollment.class)))
                .thenReturn(EnrollmentResponse.builder().status(EnrollmentStatusEnum.active).build());
        when(courseRepository.save(any(Course.class))).thenAnswer(inv -> inv.getArgument(0));

        EnrollmentResponse result = service.enrollFromPaidOrder(student, freeCourse);

        assertEquals(EnrollmentStatusEnum.active, result.getStatus());
        ArgumentCaptor<Enrollment> captor = ArgumentCaptor.forClass(Enrollment.class);
        verify(enrollmentRepository).save(captor.capture());
        Enrollment persisted = captor.getValue();
        assertEquals(EnrollmentStatusEnum.active, persisted.getStatus());
        assertEquals(student.getId(), persisted.getUser().getId());
        assertEquals(courseId, persisted.getCourse().getId());
        assertEquals(1, freeCourse.getEnrollmentsCount());
    }

    // G. Duplicate guard still applies on the paid-order path (idempotent owner grant).
    @Test
    void enrollFromPaidOrder_alreadyEnrolled_rejected() {
        UUID courseId = UUID.randomUUID();
        User student = student();
        Course freeCourse = course(courseId, true, true, "0");

        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), courseId))
                .thenReturn(Optional.of(Enrollment.builder().id(UUID.randomUUID()).build()));

        assertThrows(IllegalStateException.class, () -> service.enrollFromPaidOrder(student, freeCourse));
        verify(enrollmentRepository, never()).save(any(Enrollment.class));
    }
}
