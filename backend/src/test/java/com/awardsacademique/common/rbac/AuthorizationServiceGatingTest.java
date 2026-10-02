package com.awardsacademique.common.rbac;

import com.awardsacademique.authentification.entity.InstructorStatusEnum;
import com.awardsacademique.authentification.entity.Role;
import com.awardsacademique.authentification.entity.RoleName;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * The instructor-approval gating rules enforced by the service layer. Only
 * instructors with {@code instructorStatus == APPROVED} may create or modify
 * courses and access instructor-only financial flows; administrators keep
 * full access but are never treated as instructors.
 */
@ExtendWith(MockitoExtension.class)
class AuthorizationServiceGatingTest {

    @Mock
    private CurrentUserProvider currentUserProvider;

    private AuthorizationService service;

    @BeforeEach
    void setUp() {
        service = new AuthorizationService(currentUserProvider);
    }

    private User user(RoleName role, InstructorStatusEnum status) {
        return User.builder()
                .id(UUID.randomUUID())
                .firstName("John")
                .lastName("Doe")
                .email("john@example.com")
                .role(Role.builder().name(role).build())
                .instructorStatus(status)
                .build();
    }

    @Test
    void isApprovedInstructor_trueOnlyForApprovedInstructorRole() {
        User approved = user(RoleName.instructor, InstructorStatusEnum.APPROVED);
        User pending = user(RoleName.instructor, InstructorStatusEnum.PENDING);
        when(currentUserProvider.isInstructor(approved)).thenReturn(true);
        when(currentUserProvider.isInstructor(pending)).thenReturn(true);

        assertTrue(service.isApprovedInstructor(approved));
        assertTrue(!service.isApprovedInstructor(pending));
    }

    @Test
    void requireApprovedInstructor_approved_returnsUser() {
        User approved = user(RoleName.instructor, InstructorStatusEnum.APPROVED);
        when(currentUserProvider.requireCurrentUser()).thenReturn(approved);
        when(currentUserProvider.isInstructor(approved)).thenReturn(true);

        assertEquals(approved, service.requireApprovedInstructor());
    }

    @Test
    void requireApprovedInstructor_pending_denied() {
        User pending = user(RoleName.instructor, InstructorStatusEnum.PENDING);
        when(currentUserProvider.requireCurrentUser()).thenReturn(pending);
        when(currentUserProvider.isInstructor(pending)).thenReturn(true);
        when(currentUserProvider.isAdministrator(pending)).thenReturn(false);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.requireApprovedInstructor());
        assertTrue(ex.getMessage().contains("application has been approved"));
    }

    @Test
    void requireApprovedInstructor_administrator_denied() {
        User admin = user(RoleName.administrator, null);
        when(currentUserProvider.requireCurrentUser()).thenReturn(admin);
        when(currentUserProvider.isInstructor(admin)).thenReturn(false);
        when(currentUserProvider.isAdministrator(admin)).thenReturn(true);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.requireApprovedInstructor());
        assertTrue(ex.getMessage().contains("Administrators"));
    }

    @Test
    void requireApprovedInstructor_explicitRejected_denied() {
        User rejected = user(RoleName.instructor, InstructorStatusEnum.REJECTED);
        when(currentUserProvider.isInstructor(rejected)).thenReturn(true);
        when(currentUserProvider.isAdministrator(rejected)).thenReturn(false);

        assertThrows(AccessDeniedException.class, () -> service.requireApprovedInstructor(rejected));
    }

    @Test
    void requireCanModifyCourse_approvedOwnerPendingStatus_allows() {
        User owner = user(RoleName.instructor, InstructorStatusEnum.APPROVED);
        Course course = Course.builder()
                .id(UUID.randomUUID())
                .instructor(owner)
                .status(CourseStatusEnum.pending)
                .build();
        when(currentUserProvider.isAdministrator(owner)).thenReturn(false);

        assertDoesNotThrow(() -> service.requireCanModifyCourse(course, owner));
    }

    @Test
    void requireCanModifyCourse_pendingInstructor_denied() {
        User owner = user(RoleName.instructor, InstructorStatusEnum.PENDING);
        Course course = Course.builder()
                .id(UUID.randomUUID())
                .instructor(owner)
                .status(CourseStatusEnum.pending)
                .build();
        when(currentUserProvider.isAdministrator(owner)).thenReturn(false);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.requireCanModifyCourse(course, owner));
        assertTrue(ex.getMessage().contains("application has been approved"));
    }

    @Test
    void requireCanModifyCourse_notOwner_denied() {
        User owner = user(RoleName.instructor, InstructorStatusEnum.APPROVED);
        User otherInstructor = user(RoleName.instructor, InstructorStatusEnum.APPROVED);
        Course course = Course.builder()
                .id(UUID.randomUUID())
                .instructor(owner)
                .status(CourseStatusEnum.pending)
                .build();
        when(currentUserProvider.isAdministrator(otherInstructor)).thenReturn(false);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> service.requireCanModifyCourse(course, otherInstructor));
        assertTrue(ex.getMessage().contains("own courses"));
    }

    @Test
    void requireCanModifyCourse_publishedCourse_denied() {
        User owner = user(RoleName.instructor, InstructorStatusEnum.APPROVED);
        Course course = Course.builder()
                .id(UUID.randomUUID())
                .instructor(owner)
                .status(CourseStatusEnum.published)
                .build();
        when(currentUserProvider.isAdministrator(owner)).thenReturn(false);

        assertThrows(AccessDeniedException.class, () -> service.requireCanModifyCourse(course, owner));
    }

    @Test
    void requireCanModifyCourse_administrator_anyCourse_allowed() {
        User admin = user(RoleName.administrator, null);
        User owner = user(RoleName.instructor, InstructorStatusEnum.PENDING);
        Course course = Course.builder()
                .id(UUID.randomUUID())
                .instructor(owner)
                .status(CourseStatusEnum.published)
                .build();
        when(currentUserProvider.isAdministrator(admin)).thenReturn(true);

        assertDoesNotThrow(() -> service.requireCanModifyCourse(course, admin));
    }
}