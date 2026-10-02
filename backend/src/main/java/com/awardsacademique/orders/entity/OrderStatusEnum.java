package com.awardsacademique.orders.entity;

/**
 * Lifecycle states for an order.
 * Values must match the PostgreSQL enum {@code order_status_enum}.
 */
public enum OrderStatusEnum {
    pending,
    paid,
    cancelled,
    refunded
}
