package com.awardsacademique.instructorapplication;

import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.dto.request.UpdateInstructorApplicationRequest;
import com.awardsacademique.authentification.dto.response.InstructorApplicationResponse;
import com.awardsacademique.authentification.entity.InstructorStatusEnum;
import com.awardsacademique.authentification.entity.Role;
import com.awardsacademique.authentification.entity.RoleName;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.instructorapplication.service.impl.InstructorApplicationServiceImpl;
import com.awardsacademique.notifications.dto.request.CreateNotificationRequest;
import com.awardsacademique.notifications.service.interfaces.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the instructor application state machine: an application can
 * only move PENDING -> APPROVED, PENDING -> REJECTED (with a mandatory reason)
 * and REJECTED -> PENDING (resubmission). Approval and rejection both notify
 * the instructor, and only instructors may hold an application.
 */
@ExtendWith(MockitoExtension.class)
class InstructorApplicationServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuthorizationService authorizationService;

    @Mock
    private NotificationService notificationService;

    private InstructorApplicationServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new InstructorApplicationServiceImpl(userRepository, authorizationService, notificationService);
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

    // ------------------------------------------------------------------
    // Self-service
    // ------------------------------------------------------------------

    @Test
    void getMine_returnsMappedApplication() {
        User instructor = user(RoleName.instructor, InstructorStatusEnum.PENDING);
        when(authorizationService.requireCurrentUser()).thenReturn(instructor);

        InstructorApplicationResponse response = service.getMine();

        assertEquals(instructor.getId(), response.getUserId());
        assertEquals(InstructorStatusEnum.PENDING, response.getStatus());
        assertEquals("john@example.com", response.getEmail());
    }

    @Test
    void updateMine_trimsAndSavesProfessionalFields() {
        User instructor = user(RoleName.instructor, InstructorStatusEnum.PENDING);
        when(authorizationService.requireCurrentUser()).thenReturn(instructor);
        when(userRepository.save(instructor)).thenReturn(instructor);

        UpdateInstructorApplicationRequest request = UpdateInstructorApplicationRequest.builder()
                .professionalTitle("  Expert  ")
                .institution("  Université  ")
                .expertise("Java, Spring")
                .linkedinUrl(" linkedin.com/in/john ")
                .build();

        InstructorApplicationResponse response = service.updateMine(request);

        assertEquals("Expert", response.getProfessionalTitle());
        assertEquals("Université", response.getInstitution());
        assertEquals("Java, Spring", response.getExpertise());
        assertEquals("linkedin.com/in/john", response.getLinkedinUrl());
        verify(userRepository).save(instructor);
    }

    // ------------------------------------------------------------------
    // Resubmission
    // ------------------------------------------------------------------

    @Test
    void resubmit_rejected_movesBackToPendingAndClearsReason() {
        User instructor = user(RoleName.instructor, InstructorStatusEnum.REJECTED);
        instructor.setInstructorRejectionReason("Pièces manquantes");
        when(authorizationService.requireCurrentUser()).thenReturn(instructor);
        when(userRepository.save(instructor)).thenReturn(instructor);

        InstructorApplicationResponse response = service.resubmit();

        assertEquals(InstructorStatusEnum.PENDING, response.getStatus());
        assertNull(response.getRejectionReason());
        assertNull(response.getReviewedAt());
        ArgumentCaptor<CreateNotificationRequest> captor =
                ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notificationService).createSystemNotification(captor.capture());
        assertEquals(instructor.getId(), captor.getValue().getUserId());
    }

    @Test
    void resubmit_whenNotRejected_throws() {
        User instructor = user(RoleName.instructor, InstructorStatusEnum.PENDING);
        when(authorizationService.requireCurrentUser()).thenReturn(instructor);

        assertThrows(IllegalStateException.class, () -> service.resubmit());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void resubmit_whenApproved_throws() {
        User instructor = user(RoleName.instructor, InstructorStatusEnum.APPROVED);
        when(authorizationService.requireCurrentUser()).thenReturn(instructor);

        assertThrows(IllegalStateException.class, () -> service.resubmit());
    }

    // ------------------------------------------------------------------
    // Admin approval
    // ------------------------------------------------------------------

    @Test
    void approve_pending_setsApprovedClearsReasonAndNotifies() {
        User instructor = user(RoleName.instructor, InstructorStatusEnum.PENDING);
        UUID userId = instructor.getId();
        when(userRepository.findById(userId)).thenReturn(Optional.of(instructor));
        when(userRepository.save(instructor)).thenReturn(instructor);

        InstructorApplicationResponse response = service.approve(userId);

        assertEquals(InstructorStatusEnum.APPROVED, response.getStatus());
        assertNull(response.getRejectionReason());
        ArgumentCaptor<CreateNotificationRequest> captor =
                ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notificationService).createSystemNotification(captor.capture());
        assertEquals(instructor.getId(), captor.getValue().getUserId());
    }

    @Test
    void approve_whenAlreadyApproved_throws() {
        User instructor = user(RoleName.instructor, InstructorStatusEnum.APPROVED);
        UUID userId = instructor.getId();
        when(userRepository.findById(userId)).thenReturn(Optional.of(instructor));

        assertThrows(IllegalStateException.class, () -> service.approve(userId));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void approve_whenRejected_throws() {
        User instructor = user(RoleName.instructor, InstructorStatusEnum.REJECTED);
        UUID userId = instructor.getId();
        when(userRepository.findById(userId)).thenReturn(Optional.of(instructor));

        assertThrows(IllegalStateException.class, () -> service.approve(userId));
    }

    @Test
    void approve_whenNotInstructor_throws() {
        User student = user(RoleName.student, null);
        UUID userId = student.getId();
        when(userRepository.findById(userId)).thenReturn(Optional.of(student));

        assertThrows(IllegalArgumentException.class, () -> service.approve(userId));
        verify(notificationService, never()).createSystemNotification(any());
    }

    // ------------------------------------------------------------------
    // Admin rejection
    // ------------------------------------------------------------------

    @Test
    void reject_blankReason_throwsAndNeverSaves() {
        assertThrows(IllegalArgumentException.class, () -> service.reject(UUID.randomUUID(), "   "));
        assertThrows(IllegalArgumentException.class, () -> service.reject(UUID.randomUUID(), null));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void reject_pending_storesTrimmedReasonAndNotifies() {
        User instructor = user(RoleName.instructor, InstructorStatusEnum.PENDING);
        UUID userId = instructor.getId();
        when(userRepository.findById(userId)).thenReturn(Optional.of(instructor));
        when(userRepository.save(instructor)).thenReturn(instructor);

        InstructorApplicationResponse response = service.reject(userId, "  Pièces manquantes  ");

        assertEquals(InstructorStatusEnum.REJECTED, response.getStatus());
        assertEquals("Pièces manquantes", response.getRejectionReason());
        ArgumentCaptor<CreateNotificationRequest> captor =
                ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notificationService).createSystemNotification(captor.capture());
        assertTrue(captor.getValue().getContent().endsWith("Motif : Pièces manquantes"));
    }

    @Test
    void reject_whenNotPending_throws() {
        User instructor = user(RoleName.instructor, InstructorStatusEnum.REJECTED);
        UUID userId = instructor.getId();
        when(userRepository.findById(userId)).thenReturn(Optional.of(instructor));

        assertThrows(IllegalStateException.class, () -> service.reject(userId, "raison"));
        verify(userRepository, never()).save(any(User.class));
    }

    // ------------------------------------------------------------------
    // Admin listing
    // ------------------------------------------------------------------

    @Test
    void listAll_withStatus_delegatesToFilteredRepositoryQuery() {
        User pending = user(RoleName.instructor, InstructorStatusEnum.PENDING);
        when(userRepository.findByRole_NameAndInstructorStatusAndDeletedAtIsNull(
                RoleName.instructor, InstructorStatusEnum.PENDING))
                .thenReturn(List.of(pending));

        List<InstructorApplicationResponse> responses = service.listAll(InstructorStatusEnum.PENDING);

        assertEquals(1, responses.size());
        assertEquals(pending.getId(), responses.get(0).getUserId());
        assertEquals(InstructorStatusEnum.PENDING, responses.get(0).getStatus());
    }

    @Test
    void listAll_withoutStatus_listsAllInstructors() {
        User approved = user(RoleName.instructor, InstructorStatusEnum.APPROVED);
        when(userRepository.findByRole_NameAndDeletedAtIsNull(RoleName.instructor))
                .thenReturn(List.of(approved));

        List<InstructorApplicationResponse> responses = service.listAll(null);

        assertEquals(1, responses.size());
        assertEquals(InstructorStatusEnum.APPROVED, responses.get(0).getStatus());
    }
}