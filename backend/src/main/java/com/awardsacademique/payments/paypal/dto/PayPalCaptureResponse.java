package com.awardsacademique.payments.paypal.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class PayPalCaptureResponse {
    private String paypalOrderId;
    private String status;
    private UUID internalOrderId;
    private String captureId;
    private BigDecimal capturedAmount;
    private String currency;
}
