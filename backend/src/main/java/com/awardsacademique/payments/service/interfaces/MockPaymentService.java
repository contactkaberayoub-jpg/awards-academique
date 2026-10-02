package com.awardsacademique.payments.service.interfaces;

import com.awardsacademique.payments.entity.PaymentResultEnum;
import java.math.BigDecimal;

public interface MockPaymentService {
    PaymentResultEnum processPayment(String cardNumber, String expiryDate, String cvv, BigDecimal expectedAmount);
}
