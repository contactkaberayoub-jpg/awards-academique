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
public class PayPalOrderResponse {
    private String paypalOrderId;
    private String status;
    private UUID internalOrderId;
    private BigDecimal amount;
    private String currency;
}
