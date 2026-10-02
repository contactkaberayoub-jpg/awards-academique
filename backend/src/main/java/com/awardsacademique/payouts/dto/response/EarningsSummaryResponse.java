package com.awardsacademique.payouts.dto.response;

import java.math.BigDecimal;

/**
 * Instructor earnings for a single currency. All amounts are DERIVED
 * server-side:
 * <ul>
 *   <li>grossRevenue = sum of PAID orders (100% of the sale price)</li>
 *   <li>earningsAmount = grossRevenue * commissionRate (the instructor's share)</li>
 *   <li>paidOutAmount = sum of PAID payout requests</li>
 *   <li>pendingAmount = sum of PENDING payout requests</li>
 *   <li>availableAmount = earningsAmount - paidOutAmount - pendingAmount</li>
 * </ul>
 */
public record EarningsSummaryResponse(
        String currency,
        BigDecimal grossRevenue,
        long orderCount,
        BigDecimal commissionRatePercent,
        BigDecimal earningsAmount,
        BigDecimal paidOutAmount,
        BigDecimal pendingAmount,
        BigDecimal availableAmount
) {
}