package com.awardsacademique.payouts.entity;

/**
 * Where the instructor wants a payout routed.
 * Values must match the PostgreSQL enum {@code payout_method_enum}.
 */
public enum PayoutMethodEnum {
    PAYPAL,
    BANK
}