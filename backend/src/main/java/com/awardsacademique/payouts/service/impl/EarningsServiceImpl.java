package com.awardsacademique.payouts.service.impl;

import com.awardsacademique.orders.Repository.OrderRepository;
import com.awardsacademique.orders.entity.OrderStatusEnum;
import com.awardsacademique.parametres.service.interfaces.ParametreService;
import com.awardsacademique.parametres.service.interfaces.ParametreService.RevenueSplit;
import com.awardsacademique.payouts.Repository.PayoutRequestRepository;
import com.awardsacademique.payouts.dto.response.AdminInstructorEarningsResponse;
import com.awardsacademique.payouts.dto.response.EarningsByCourseResponse;
import com.awardsacademique.payouts.dto.response.EarningsSummaryResponse;
import com.awardsacademique.payouts.dto.response.RevenueSummaryResponse;
import com.awardsacademique.payouts.entity.PayoutRequestStatusEnum;
import com.awardsacademique.payouts.service.interfaces.EarningsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EarningsServiceImpl implements EarningsService {

    private static final int SCALE = 2;

    private final OrderRepository orderRepository;
    private final PayoutRequestRepository payoutRequestRepository;
    private final ParametreService parametreService;

    @Override
    @Transactional(readOnly = true)
    public List<EarningsSummaryResponse> getInstructorEarnings(UUID instructorId) {
        RevenueSplit split = parametreService.getRevenueSplit();
        return orderRepository.aggregatePaidByInstructor(instructorId, OrderStatusEnum.paid).stream()
                .map(agg -> {
                    BigDecimal gross = agg.getTotalAmount();
                    BigDecimal earned = commissionOf(gross, split);
                    BigDecimal paidOut = payoutRequestRepository
                            .sumByInstructorAndCurrency(instructorId, agg.getCurrency().name(), PayoutRequestStatusEnum.PAID);
                    BigDecimal pending = payoutRequestRepository
                            .sumByInstructorAndCurrency(instructorId, agg.getCurrency().name(), PayoutRequestStatusEnum.PENDING);
                    return new EarningsSummaryResponse(
                            agg.getCurrency().name(),
                            gross,
                            agg.getOrderCount() == null ? 0L : agg.getOrderCount(),
                            split.instructorPercentage(),
                            earned,
                            paidOut,
                            pending,
                            availableOf(earned, paidOut, pending)
                    );
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EarningsByCourseResponse> getInstructorCourseEarnings(UUID instructorId) {
        RevenueSplit split = parametreService.getRevenueSplit();
        return orderRepository.aggregatePaidByCourseAndInstructor(instructorId, OrderStatusEnum.paid).stream()
                .map(agg -> new EarningsByCourseResponse(
                        agg.getCourseId(),
                        agg.getCourseTitle(),
                        agg.getCurrency().name(),
                        agg.getOrderCount() == null ? 0L : agg.getOrderCount(),
                        agg.getTotalAmount(),
                        commissionOf(agg.getTotalAmount(), split)
                ))
                .collect(Collectors.toList());
    }

    @Override
    public BigDecimal earningsAmount(UUID instructorId, String currency) {
        BigDecimal gross = orderRepository.aggregatePaidByInstructor(instructorId, OrderStatusEnum.paid).stream()
                .filter(agg -> agg.getCurrency().name().equals(currency))
                .map(OrderRepository.PaidRevenueAggregate::getTotalAmount)
                .findFirst()
                .orElse(BigDecimal.ZERO);
        return commissionOf(gross, parametreService.getRevenueSplit());
    }

    @Override
    public BigDecimal availableAmount(UUID instructorId, String currency) {
        BigDecimal earned = earningsAmount(instructorId, currency);
        BigDecimal paidOut = payoutRequestRepository
                .sumByInstructorAndCurrency(instructorId, currency, PayoutRequestStatusEnum.PAID);
        BigDecimal pending = payoutRequestRepository
                .sumByInstructorAndCurrency(instructorId, currency, PayoutRequestStatusEnum.PENDING);
        return availableOf(earned, paidOut, pending);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RevenueSummaryResponse> getRevenueSummary() {
        return orderRepository.aggregateRevenueByCurrency(OrderStatusEnum.paid, OrderStatusEnum.pending,
                OrderStatusEnum.cancelled, OrderStatusEnum.refunded).stream()
                .map(agg -> new RevenueSummaryResponse(
                        agg.getCurrency().name(),
                        agg.getOrderCount() == null ? 0L : agg.getOrderCount(),
                        agg.getTotalAmount(),
                        agg.getPaidCount() == null ? 0L : agg.getPaidCount(),
                        agg.getPaidAmount(),
                        agg.getPendingCount() == null ? 0L : agg.getPendingCount(),
                        agg.getFailedCount() == null ? 0L : agg.getFailedCount()
                ))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminInstructorEarningsResponse> getAdminInstructorEarnings() {
        RevenueSplit split = parametreService.getRevenueSplit();
        List<AdminInstructorEarningsResponse> all = orderRepository.aggregatePaidForAllInstructors(OrderStatusEnum.paid).stream()
                .map(agg -> new AdminInstructorEarningsResponse(
                        agg.getInstructorId(),
                        agg.getInstructorFirstName() + " " + agg.getInstructorLastName(),
                        agg.getInstructorEmail(),
                        agg.getCurrency().name(),
                        agg.getTotalAmount(),
                        agg.getOrderCount() == null ? 0L : agg.getOrderCount(),
                        commissionOf(agg.getTotalAmount(), split),
                        payoutRequestRepository
                                .sumByInstructorAndCurrency(agg.getInstructorId(), agg.getCurrency().name(), PayoutRequestStatusEnum.PAID),
                        payoutRequestRepository
                                .sumByInstructorAndCurrency(agg.getInstructorId(), agg.getCurrency().name(), PayoutRequestStatusEnum.PENDING),
                        BigDecimal.ZERO
                ))
                .collect(Collectors.toList());

        return all.stream()
                .map(row -> new AdminInstructorEarningsResponse(
                        row.instructorId(),
                        row.instructorName(),
                        row.instructorEmail(),
                        row.currency(),
                        row.grossRevenue(),
                        row.orderCount(),
                        row.earningsAmount(),
                        row.paidOutAmount(),
                        row.pendingAmount(),
                        availableOf(row.earningsAmount(), row.paidOutAmount(), row.pendingAmount())
                ))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminInstructorEarningsResponse> getAdminInstructorEarnings(UUID instructorId) {
        return getAdminInstructorEarnings().stream()
                .filter(row -> row.instructorId().equals(instructorId))
                .collect(Collectors.toList());
    }

    /**
     * Instructor share of a PAID gross, using the validated revenue split read
     * from the {@code parametres} table (never hard-coded in the application).
     * The platform share is kept as the residual of the gross so that
     * {@code platformAmount + instructorAmount == totalAmount} always holds
     * exactly — no money is created or lost by decimal rounding.
     */
    private BigDecimal commissionOf(BigDecimal gross, RevenueSplit split) {
        return splitAmounts(gross, split).instructorAmount();
    }

    /** Result of dividing a gross between platform and instructor. */
    record SplitAmounts(BigDecimal platformAmount, BigDecimal instructorAmount) {
    }

    /** Package-visible for tests. */
    SplitAmounts splitAmounts(BigDecimal gross, RevenueSplit split) {
        BigDecimal total = gross == null ? BigDecimal.ZERO : gross;
        BigDecimal instructor = total.multiply(split.instructorPercentage())
                .divide(BigDecimal.valueOf(100), SCALE, RoundingMode.HALF_UP);
        BigDecimal platform = total.subtract(instructor);
        return new SplitAmounts(platform, instructor);
    }

    private BigDecimal availableOf(BigDecimal earned, BigDecimal paidOut, BigDecimal pending) {
        return earned.subtract(nvl(paidOut)).subtract(nvl(pending)).max(BigDecimal.ZERO);
    }

    private BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}