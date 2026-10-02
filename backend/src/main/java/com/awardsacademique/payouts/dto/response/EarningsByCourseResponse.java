package com.awardsacademique.payouts.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record EarningsByCourseResponse(
        UUID courseId,
        String title,
        String currency,
        long orderCount,
        BigDecimal grossRevenue,
        BigDecimal earningsAmount
) {
}