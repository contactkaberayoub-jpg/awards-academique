package com.awardsacademique.payments.service.impl;

import com.awardsacademique.payments.entity.PaymentResultEnum;
import com.awardsacademique.payments.service.interfaces.MockPaymentService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@Service
@Slf4j
public class MockPaymentServiceImpl implements MockPaymentService {

    @Override
    public PaymentResultEnum processPayment(String cardNumber, String expiryDate, String cvv, BigDecimal expectedAmount) {
        if (cardNumber == null || expiryDate == null || cvv == null) {
            return PaymentResultEnum.INVALID_CARD;
        }

        String normalizedCard = cardNumber.replaceAll("\\s+", "");

        // Test card numbers
        if ("4111111111111111".equals(normalizedCard)) {
            return PaymentResultEnum.SUCCESS;
        }
        if ("4000000000000002".equals(normalizedCard)) {
            return PaymentResultEnum.INVALID_CARD;
        }
        if ("4000000000009995".equals(normalizedCard)) {
            return PaymentResultEnum.INSUFFICIENT_FUNDS;
        }

        // Validate card number (numeric, 13 to 19 digits)
        if (!normalizedCard.matches("^\\d{13,19}$")) {
            return PaymentResultEnum.INVALID_CARD;
        }

        // Validate CVV (3 or 4 digits)
        String normalizedCvv = cvv.replaceAll("\\s+", "");
        if (!normalizedCvv.matches("^\\d{3,4}$")) {
            return PaymentResultEnum.INVALID_CARD;
        }

        // Validate expiry date (MM/YY)
        try {
            String cleanExpiry = expiryDate.replaceAll("\\s+", "");
            // Parse MM/YY
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/yy");
            YearMonth cardExpiry = YearMonth.parse(cleanExpiry, formatter);
            YearMonth current = YearMonth.now();
            if (cardExpiry.isBefore(current)) {
                return PaymentResultEnum.CARD_EXPIRED;
            }
        } catch (DateTimeParseException e) {
            return PaymentResultEnum.INVALID_CARD;
        }

        // Generic fallback for valid-looking test cards
        return PaymentResultEnum.SUCCESS;
    }
}
