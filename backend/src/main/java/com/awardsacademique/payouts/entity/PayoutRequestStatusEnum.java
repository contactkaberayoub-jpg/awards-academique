package com.awardsacademique.payouts.entity;

/**
 * Lifecycle states for an instructor payout request.
 * Values must match the PostgreSQL enum {@code payout_request_status_enum}.
 */
public enum PayoutRequestStatusEnum {
    PENDING,
    PAID,
    REJECTED
}