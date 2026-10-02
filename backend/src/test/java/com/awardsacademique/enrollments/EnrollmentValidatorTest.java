package com.awardsacademique.enrollments;

import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.enrollments.entity.Enrollment;
import com.awardsacademique.enrollments.exception.PaymentRequiredException;
import com.awardsacademique.enrollments.validation.EnrollmentValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * Domain-level tests for {@link EnrollmentValidator}.
 *
 * <p>Sprint 1 rule: self-enrollment is allowed for FREE published/active courses
 * and rejected with {@link PaymentRequiredException} for PAID courses. All the
 * pre-existing rules (published, active, duplicate enrollment) must be preserved.
 */
@ExtendWith(MockitoExtension.class)
class EnrollmentValidatorTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    private EnrollmentValidator validator;

    @BeforeEach
    void setUp() {
        validator = new EnrollmentValidator(courseRepository, enrollmentRepository);
    }

    private Course course(boolean published, boolean active, String price) {
        return Course.builder()
                .id(UUID.randomUUID())
                .status(CourseStatusEnum.published)
                .published(published)
                .isActive(active)
                .price(new BigDecimal(price))
                .build();
    }

    // A. Published + active + FREE course -> allowed
    @Test
    void validateEnrollable_allowsPublishedActiveFreeCourse() {
        assertDoesNotThrow(() -> validator.validateEnrollable(course(true, true, "0")));
    }

    // B. Published + active + PAID course -> PaymentRequiredException
    @Test
    void validateEnrollable_rejectsPublishedActivePaidCourse() {
        Course paid = course(true, true, "49.99");
        assertThrows(PaymentRequiredException.class, () -> validator.validateEnrollable(paid));
    }

    // C. Unpublished course -> existing IllegalArgumentException preserved
    @Test
    void validateEnrollable_rejectsUnpublishedCourse() {
        Course unpublished = course(false, true, "0");
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class, () -> validator.validateEnrollable(unpublished));
        assertTrue(ex.getMessage().contains("published"));
    }

    // D. Inactive course -> existing IllegalArgumentException preserved
    @Test
    void validateEnrollable_rejectsInactiveCourse() {
        Course inactive = course(true, false, "0");
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class, () -> validator.validateEnrollable(inactive));
        assertTrue(ex.getMessage().contains("no longer accepting"));
    }

    // E. Duplicate enrollment -> existing IllegalStateException preserved
    @Test
    void ensureNotAlreadyEnrolled_rejectsDuplicateEnrollment() {
        UUID userId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        when(enrollmentRepository.findByUserIdAndCourseId(userId, courseId))
                .thenReturn(Optional.of(Enrollment.builder().id(UUID.randomUUID()).build()));

        assertThrows(IllegalStateException.class,
                () -> validator.ensureNotAlreadyEnrolled(userId, courseId));
    }
}
