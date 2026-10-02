package com.awardsacademique.notifications.service.interfaces;

import com.awardsacademique.notifications.dto.request.CreateNotificationRequest;
import com.awardsacademique.notifications.dto.request.UpdateNotificationRequest;
import com.awardsacademique.notifications.dto.response.NotificationResponse;

import java.util.List;
import java.util.UUID;

public interface NotificationService {

    List<NotificationResponse> getMine();

    long getUnreadCount();

    NotificationResponse markRead(UUID id);

    void markAllRead();

    NotificationResponse create(CreateNotificationRequest request);

    /**
     * Creates a notification without an authorization check. Used by internal
     * system processes (e.g. instructor application approval notifications)
     * where the acting principal is not necessarily an administrator.
     */
    NotificationResponse createSystemNotification(CreateNotificationRequest request);

    List<NotificationResponse> getAll();

    void delete(UUID id);
}
