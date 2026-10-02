package com.awardsacademique.enrollments.entity;

/**
 * Lifecycle states for a student enrollment in a course.
 * Values must match the PostgreSQL enum {@code enrollment_status_enum}.
 */
public enum EnrollmentStatusEnum {
    active,
    completed,
    suspended,
    cancelled
}
