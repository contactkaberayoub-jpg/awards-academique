package com.awardsacademique.payouts.dto.response;

import com.awardsacademique.payouts.entity.PayoutMethodEnum;
import com.awardsacademique.payouts.entity.PayoutRequestStatusEnum;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record PayoutRequestResponse(
        UUID id,
        String instructorId,
        String instructorName,
        BigDecimal requestedAmount,
        String currency,
        PayoutMethodEnum method,
        String destinationRef,
        PayoutRequestStatusEnum status,
        String rejectionReason,
        String providerRef,
        String notes,
        LocalDateTime requestedAt,
        LocalDateTime reviewedAt,
        String reviewedByEmail
) {
}