package com.awardsacademique.payouts.dto.response;

import java.math.BigDecimal;

/**
 * Platform-wide revenue summary for one currency, across ALL orders
 * (pending / paid / cancelled+refunded). Administrators only.
 */
public record RevenueSummaryResponse(
        String currency,
        long totalCount,
        BigDecimal totalAmount,
        long paidCount,
        BigDecimal paidAmount,
        long pendingCount,
        long failedCount
) {
}