package com.awardsacademique.instructorapplication.service.impl;

import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.dto.request.UpdateInstructorApplicationRequest;
import com.awardsacademique.authentification.dto.response.InstructorApplicationResponse;
import com.awardsacademique.authentification.entity.InstructorStatusEnum;
import com.awardsacademique.authentification.entity.RoleName;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.exception.UserNotFoundException;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.instructorapplication.service.interfaces.InstructorApplicationService;
import com.awardsacademique.notifications.dto.request.CreateNotificationRequest;
import com.awardsacademique.notifications.entity.NotificationTypeEnum;
import com.awardsacademique.notifications.service.interfaces.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InstructorApplicationServiceImpl implements InstructorApplicationService {

    private static final String APPROVAL_TITLE = "Candidature de formateur approuvée";
    private static final String APPROVAL_CONTENT = "Votre candidature de formateur a été approuvée. Vous pouvez maintenant créer et gérer vos cours.";
    private static final String REJECTION_TITLE = "Candidature de formateur refusée";
    private static final String REJECTION_CONTENT_PREFIX = "Votre candidature de formateur a été refusée. Motif : ";

    private final UserRepository userRepository;
    private final AuthorizationService authorizationService;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public InstructorApplicationResponse getMine() {
        User currentUser = authorizationService.requireCurrentUser();
        return toResponse(currentUser);
    }

    @Override
    @Transactional
    public InstructorApplicationResponse updateMine(UpdateInstructorApplicationRequest request) {
        User currentUser = authorizationService.requireCurrentUser();
        requireInstructorRole(currentUser);

        currentUser.setProfessionalTitle(request.getProfessionalTitle() != null ? request.getProfessionalTitle().trim() : null);
        currentUser.setInstitution(request.getInstitution() != null ? request.getInstitution().trim() : null);
        currentUser.setExpertise(request.getExpertise() != null ? request.getExpertise().trim() : null);
        currentUser.setLinkedinUrl(request.getLinkedinUrl() != null ? request.getLinkedinUrl().trim() : null);
        currentUser.setUpdatedAt(LocalDateTime.now());

        return toResponse(userRepository.save(currentUser));
    }

    @Override
    @Transactional
    public InstructorApplicationResponse resubmit() {
        User currentUser = authorizationService.requireCurrentUser();
        requireInstructorRole(currentUser);

        if (currentUser.getInstructorStatus() != InstructorStatusEnum.REJECTED) {
            throw new IllegalStateException("Only rejected applications can be resubmitted");
        }

        currentUser.setInstructorStatus(InstructorStatusEnum.PENDING);
        currentUser.setInstructorRejectionReason(null);
        currentUser.setInstructorSubmittedAt(LocalDateTime.now());
        currentUser.setInstructorReviewedAt(null);
        currentUser.setUpdatedAt(LocalDateTime.now());

        User saved = userRepository.save(currentUser);
        notifyInstructor(
                saved.getId(),
                "Candidature de formateur soumise",
                "Votre candidature de formateur a été soumise à nouveau pour examen."
        );
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InstructorApplicationResponse> listAll(InstructorStatusEnum status) {
        authorizationService.requireAdministrator();
        List<User> users = status == null
                ? userRepository.findByRole_NameAndDeletedAtIsNull(RoleName.instructor)
                : userRepository.findByRole_NameAndInstructorStatusAndDeletedAtIsNull(RoleName.instructor, status);
        return users.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public InstructorApplicationResponse approve(UUID userId) {
        authorizationService.requireAdministrator();

        User user = findInstructor(userId);
        if (user.getInstructorStatus() != InstructorStatusEnum.PENDING) {
            throw new IllegalStateException("Only pending applications can be approved");
        }

        user.setInstructorStatus(InstructorStatusEnum.APPROVED);
        user.setInstructorRejectionReason(null);
        user.setInstructorReviewedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        User saved = userRepository.save(user);
        notifyInstructor(saved.getId(), APPROVAL_TITLE, APPROVAL_CONTENT);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public InstructorApplicationResponse reject(UUID userId, String reason) {
        authorizationService.requireAdministrator();

        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("Rejection reason is required");
        }
        String trimmedReason = reason.trim();

        User user = findInstructor(userId);
        if (user.getInstructorStatus() != InstructorStatusEnum.PENDING) {
            throw new IllegalStateException("Only pending applications can be rejected");
        }

        user.setInstructorStatus(InstructorStatusEnum.REJECTED);
        user.setInstructorRejectionReason(trimmedReason);
        user.setInstructorReviewedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        User saved = userRepository.save(user);
        notifyInstructor(saved.getId(), REJECTION_TITLE, REJECTION_CONTENT_PREFIX + trimmedReason);
        return toResponse(saved);
    }

    private User findInstructor(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId.toString()));
        requireInstructorRole(user);
        return user;
    }

    private void requireInstructorRole(User user) {
        if (user.getRole() == null || user.getRole().getName() != RoleName.instructor) {
            throw new IllegalArgumentException("The user is not an instructor");
        }
    }

    private void notifyInstructor(UUID userId, String title, String content) {
        notificationService.createSystemNotification(CreateNotificationRequest.builder()
                .userId(userId)
                .type(NotificationTypeEnum.system)
                .title(title)
                .content(content)
                .build());
    }

    private InstructorApplicationResponse toResponse(User user) {
        return InstructorApplicationResponse.builder()
                .userId(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .status(user.getInstructorStatus())
                .rejectionReason(user.getInstructorRejectionReason())
                .professionalTitle(user.getProfessionalTitle())
                .institution(user.getInstitution())
                .expertise(user.getExpertise())
                .linkedinUrl(user.getLinkedinUrl())
                .submittedAt(user.getInstructorSubmittedAt())
                .reviewedAt(user.getInstructorReviewedAt())
                .build();
    }
}