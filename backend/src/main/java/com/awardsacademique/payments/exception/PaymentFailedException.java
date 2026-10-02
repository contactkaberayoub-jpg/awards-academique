package com.awardsacademique.payments.exception;

import com.awardsacademique.payments.entity.PaymentResultEnum;
import lombok.Getter;

@Getter
public class PaymentFailedException extends RuntimeException {
    private final PaymentResultEnum paymentResult;

    public PaymentFailedException(PaymentResultEnum paymentResult, String message) {
        super(message);
        this.paymentResult = paymentResult;
    }
}
