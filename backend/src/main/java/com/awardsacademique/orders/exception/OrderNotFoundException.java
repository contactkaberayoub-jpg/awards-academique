package com.awardsacademique.orders.exception;

import java.util.UUID;

/**
 * Thrown when an order cannot be found.
 */
public class OrderNotFoundException extends RuntimeException {

    public OrderNotFoundException(UUID id) {
        super("Order not found with id: " + id);
    }
}
