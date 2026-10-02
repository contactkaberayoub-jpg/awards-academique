package com.awardsacademique.notifications.service.impl;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.notifications.Repository.NotificationRepository;
import com.awardsacademique.notifications.dto.request.CreateNotificationRequest;
import com.awardsacademique.notifications.dto.request.UpdateNotificationRequest;
import com.awardsacademique.notifications.dto.response.NotificationResponse;
import com.awardsacademique.notifications.entity.Notification;
import com.awardsacademique.notifications.exception.NotificationNotFoundException;
import com.awardsacademique.notifications.mapper.NotificationMapper;
import com.awardsacademique.notifications.service.interfaces.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final UserRepository userRepository;
    private final AuthorizationService authorizationService;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getMine() {
        User currentUser = authorizationService.requireCurrentUser();
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId()).stream()
                .map(notificationMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount() {
        User currentUser = authorizationService.requireCurrentUser();
        return notificationRepository.countByUserIdAndIsReadFalse(currentUser.getId());
    }

    @Override
    @Transactional
    public NotificationResponse markRead(UUID id) {
        User currentUser = authorizationService.requireCurrentUser();
        Notification notification = notificationRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new NotificationNotFoundException(id));
        notification.setRead(true);
        return notificationMapper.toResponse(notificationRepository.save(notification));
    }

    @Override
    @Transactional
    public void markAllRead() {
        User currentUser = authorizationService.requireCurrentUser();
        List<Notification> unread = notificationRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId()).stream()
                .filter(notification -> !notification.isRead())
                .collect(Collectors.toList());
        unread.forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(unread);
    }

    @Override
    @Transactional
    public NotificationResponse create(CreateNotificationRequest request) {
        authorizationService.requireAdministrator();
        User recipient = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Notification notification = Notification.builder()
                .user(recipient)
                .type(request.getType())
                .title(request.getTitle())
                .content(request.getContent())
                .build();

        return notificationMapper.toResponse(notificationRepository.save(notification));
    }

    @Override
    @Transactional
    public NotificationResponse createSystemNotification(CreateNotificationRequest request) {
        User recipient = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Notification notification = Notification.builder()
                .user(recipient)
                .type(request.getType())
                .title(request.getTitle())
                .content(request.getContent())
                .build();

        return notificationMapper.toResponse(notificationRepository.save(notification));
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getAll() {
        authorizationService.requireAdministrator();
        return notificationRepository.findAll().stream()
                .map(notificationMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        User currentUser = authorizationService.requireCurrentUser();
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new NotificationNotFoundException(id));
        if (!authorizationService.isAdministrator(currentUser)
                && !notification.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You can only delete your own notifications");
        }
        notificationRepository.delete(notification);
    }
}
