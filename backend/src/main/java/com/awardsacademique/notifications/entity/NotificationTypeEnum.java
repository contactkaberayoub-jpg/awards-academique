package com.awardsacademique.notifications.entity;

/**
 * Category of a platform notification.
 * Values must match the PostgreSQL enum {@code notification_type_enum}.
 */
public enum NotificationTypeEnum {
    payment,
    course,
    certificate,
    ai,
    system
}
