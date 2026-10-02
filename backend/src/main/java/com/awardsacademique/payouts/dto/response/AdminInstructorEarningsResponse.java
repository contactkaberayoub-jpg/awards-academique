package com.awardsacademique.payouts.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Per-instructor earnings breakdown for the admin view. The amounts are the
 * same derived values shown to the instructor, grouped by currency.
 */
public record AdminInstructorEarningsResponse(
        UUID instructorId,
        String instructorName,
        String instructorEmail,
        String currency,
        BigDecimal grossRevenue,
        long orderCount,
        BigDecimal earningsAmount,
        BigDecimal paidOutAmount,
        BigDecimal pendingAmount,
        BigDecimal availableAmount
) {
}