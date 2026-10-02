package com.awardsacademique.payouts.service.interfaces;

import com.awardsacademique.payouts.dto.response.AdminInstructorEarningsResponse;
import com.awardsacademique.payouts.dto.response.EarningsByCourseResponse;
import com.awardsacademique.payouts.dto.response.EarningsSummaryResponse;
import com.awardsacademique.payouts.dto.response.RevenueSummaryResponse;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Earnings are never a stored ledger: they are DERIVED from PAID orders
 * (commission rate applied to the order amount) minus payout requests.
 */
public interface EarningsService {

    List<EarningsSummaryResponse> getInstructorEarnings(UUID instructorId);

    List<EarningsByCourseResponse> getInstructorCourseEarnings(UUID instructorId);

    /** Commission earned from PAID orders for one instructor+currency (server-computed). */
    BigDecimal earningsAmount(UUID instructorId, String currency);

    /**
     * What the instructor may still request: earned - paidOut - pending.
     * Must be read while holding the instructor's payout-row locks to be safe
     * against concurrent requests (see PayoutServiceImpl#requestPayout).
     */
    BigDecimal availableAmount(UUID instructorId, String currency);

    /** Platform-wide order revenue per currency (administrators only). */
    List<RevenueSummaryResponse> getRevenueSummary();

    List<AdminInstructorEarningsResponse> getAdminInstructorEarnings();

    List<AdminInstructorEarningsResponse> getAdminInstructorEarnings(UUID instructorId);
}