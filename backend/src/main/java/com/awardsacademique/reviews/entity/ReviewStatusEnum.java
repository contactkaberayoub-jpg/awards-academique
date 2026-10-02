package com.awardsacademique.reviews.entity;

/**
 * Moderation states for a review.
 * Values must match the PostgreSQL enum {@code review_status_enum}.
 */
public enum ReviewStatusEnum {
    visible,
    hidden,
    flagged
}
