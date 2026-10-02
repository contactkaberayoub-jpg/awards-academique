package com.awardsacademique.notifications.exception;

import java.util.UUID;

/**
 * Thrown when a notification cannot be found.
 */
public class NotificationNotFoundException extends RuntimeException {

    public NotificationNotFoundException(UUID id) {
        super("Notification not found with id: " + id);
    }
}
