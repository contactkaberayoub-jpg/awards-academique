package com.awardsacademique.payments.paypal.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class PayPalCaptureRequest {
    @NotNull(message = "Internal Order ID is required")
    private UUID internalOrderId;
}
