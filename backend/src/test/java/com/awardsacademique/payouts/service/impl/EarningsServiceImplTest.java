package com.awardsacademique.payouts.service.impl;

import com.awardsacademique.courses.entity.CurrencyEnum;
import com.awardsacademique.orders.Repository.OrderRepository;
import com.awardsacademique.orders.entity.OrderStatusEnum;
import com.awardsacademique.parametres.exception.ParametreException;
import com.awardsacademique.parametres.service.interfaces.ParametreService;
import com.awardsacademique.parametres.service.interfaces.ParametreService.RevenueSplit;
import com.awardsacademique.payouts.Repository.PayoutRequestRepository;
import com.awardsacademique.payouts.dto.response.AdminInstructorEarningsResponse;
import com.awardsacademique.payouts.dto.response.EarningsByCourseResponse;
import com.awardsacademique.payouts.dto.response.EarningsSummaryResponse;
import com.awardsacademique.payouts.dto.response.RevenueSummaryResponse;
import com.awardsacademique.payouts.entity.PayoutRequestStatusEnum;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * Earnings math is derived from PAID orders at the revenue split read from the
 * {@code parametres} table (via {@link ParametreService}) minus payout requests,
 * with currency kept strictly separated. No percentage is ever hard-coded.
 */
@ExtendWith(MockitoExtension.class)
class EarningsServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PayoutRequestRepository payoutRequestRepository;

    @Mock
    private ParametreService parametreService;

    private EarningsServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new EarningsServiceImpl(orderRepository, payoutRequestRepository, parametreService);
    }

    private static RevenueSplit split(String platform, String instructor) {
        return new RevenueSplit(new BigDecimal(platform), new BigDecimal(instructor));
    }

    private OrderRepository.PaidRevenueAggregate paid(String currency, long count, String amount) {
        return new OrderRepository.PaidRevenueAggregate() {
            @Override public CurrencyEnum getCurrency() { return CurrencyEnum.valueOf(currency); }
            @Override public Long getOrderCount() { return count; }
            @Override public BigDecimal getTotalAmount() { return new BigDecimal(amount); }
        };
    }

    @Test
    void earnings_useConfiguredSplit_ofPaidGross_minusPaidOutAndPending() {
        UUID instructorId = UUID.randomUUID();
        when(parametreService.getRevenueSplit()).thenReturn(split("20", "80"));
        when(orderRepository.aggregatePaidByInstructor(instructorId, OrderStatusEnum.paid))
                .thenReturn(List.of(paid("MAD", 3, "100.00")));
        when(payoutRequestRepository.sumByInstructorAndCurrency(instructorId, "MAD", PayoutRequestStatusEnum.PAID))
                .thenReturn(new BigDecimal("0.50"));
        when(payoutRequestRepository.sumByInstructorAndCurrency(instructorId, "MAD", PayoutRequestStatusEnum.PENDING))
                .thenReturn(new BigDecimal("0.25"));

        List<EarningsSummaryResponse> result = service.getInstructorEarnings(instructorId);

        assertEquals(1, result.size());
        EarningsSummaryResponse row = result.get(0);
        assertEquals("MAD", row.currency());
        assertEquals(0, new BigDecimal("100.00").compareTo(row.grossRevenue()));
        assertEquals(3, row.orderCount());
        assertEquals(0, new BigDecimal("80").compareTo(row.commissionRatePercent()));
        // 80% of 100 = 80.00
        assertEquals(0, new BigDecimal("80.00").compareTo(row.earningsAmount()));
        assertEquals(0, new BigDecimal("0.50").compareTo(row.paidOutAmount()));
        assertEquals(0, new BigDecimal("0.25").compareTo(row.pendingAmount()));
        // 80.00 - 0.50 - 0.25 = 79.25
        assertEquals(0, new BigDecimal("79.25").compareTo(row.availableAmount()));
    }

    @Test
    void available_neverGoesNegative_whenOverPaidOut() {
        UUID instructorId = UUID.randomUUID();
        when(parametreService.getRevenueSplit()).thenReturn(split("20", "80"));
        when(orderRepository.aggregatePaidByInstructor(instructorId, OrderStatusEnum.paid))
                .thenReturn(List.of(paid("USD", 1, "100.00")));
        when(payoutRequestRepository.sumByInstructorAndCurrency(instructorId, "USD", PayoutRequestStatusEnum.PAID))
                .thenReturn(new BigDecimal("90.00"));
        when(payoutRequestRepository.sumByInstructorAndCurrency(instructorId, "USD", PayoutRequestStatusEnum.PENDING))
                .thenReturn(new BigDecimal("0.00"));

        EarningsSummaryResponse row = service.getInstructorEarnings(instructorId).get(0);
        // earned = 80.00, already paid out 90.00 -> available floored at 0
        assertEquals(0, new BigDecimal("0.00").compareTo(row.availableAmount()));
    }

    @Test
    void commission_roundsHalfUpToTwoDecimals() {
        UUID instructorId = UUID.randomUUID();
        when(parametreService.getRevenueSplit()).thenReturn(split("20", "80"));
        when(orderRepository.aggregatePaidByInstructor(instructorId, OrderStatusEnum.paid))
                .thenReturn(List.of(paid("EUR", 1, "12.34")));
        when(payoutRequestRepository.sumByInstructorAndCurrency(instructorId, "EUR", PayoutRequestStatusEnum.PAID))
                .thenReturn(new BigDecimal("0.00"));
        when(payoutRequestRepository.sumByInstructorAndCurrency(instructorId, "EUR", PayoutRequestStatusEnum.PENDING))
                .thenReturn(new BigDecimal("0.00"));

        EarningsSummaryResponse row = service.getInstructorEarnings(instructorId).get(0);
        // 12.34 * 80% = 9.872 -> 9.87
        assertEquals(0, new BigDecimal("9.87").compareTo(row.earningsAmount()));
    }

    @Test
    void splitAmounts_applyEveryConfiguredSplitAndAlwaysSumToGross() {
        Object[][] cases = {
                {"20", "80"},
                {"30", "70"},
                {"25", "75"},
                {"15", "85"},
        };
        String gross = "100.00";

        for (Object[] c : cases) {
            RevenueSplit split = split((String) c[0], (String) c[1]);
            EarningsServiceImpl.SplitAmounts amounts = service.splitAmounts(new BigDecimal(gross), split);

            assertEquals(0, new BigDecimal((String) c[0]).compareTo(amounts.platformAmount()),
                    "platform share for " + c[0] + "/" + c[1]);
            assertEquals(0, new BigDecimal((String) c[1]).compareTo(amounts.instructorAmount()),
                    "instructor share for " + c[0] + "/" + c[1]);
            // platform + instructor must equal the total exactly (no lost/created money)
            assertEquals(0, new BigDecimal(gross).compareTo(
                    amounts.platformAmount().add(amounts.instructorAmount())),
                    "sum invariant for " + c[0] + "/" + c[1]);
        }
    }

    @Test
    void splitAmounts_roundingNeverLosesMoney_onDecimalTotals() {
        RevenueSplit split = split("30", "70");
        EarningsServiceImpl.SplitAmounts amounts = service.splitAmounts(new BigDecimal("99.99"), split);

        // 99.99 * 70% = 69.993 -> 69.99 (HALF_UP); platform takes the remainder
        assertEquals(0, new BigDecimal("69.99").compareTo(amounts.instructorAmount()));
        assertEquals(0, new BigDecimal("30.00").compareTo(amounts.platformAmount()));
        assertEquals(0, new BigDecimal("99.99").compareTo(
                amounts.platformAmount().add(amounts.instructorAmount())));
    }

    @Test
    void invalidConfiguration_failsSafely_whenSplitIsMisconfigured() {
        UUID instructorId = UUID.randomUUID();
        when(parametreService.getRevenueSplit())
                .thenThrow(new ParametreException("Configuration de revenus invalide", 500));

        assertThrows(ParametreException.class, () -> service.getInstructorEarnings(instructorId));
    }

    @Test
    void currencies_areKeptSeparate() {
        UUID instructorId = UUID.randomUUID();
        when(parametreService.getRevenueSplit()).thenReturn(split("20", "80"));
        when(orderRepository.aggregatePaidByInstructor(instructorId, OrderStatusEnum.paid))
                .thenReturn(List.of(paid("USD", 2, "50.00"), paid("MAD", 1, "200.00")));
        when(payoutRequestRepository.sumByInstructorAndCurrency(instructorId, "USD", PayoutRequestStatusEnum.PAID))
                .thenReturn(new BigDecimal("0.40"));
        when(payoutRequestRepository.sumByInstructorAndCurrency(instructorId, "USD", PayoutRequestStatusEnum.PENDING))
                .thenReturn(new BigDecimal("0.10"));
        when(payoutRequestRepository.sumByInstructorAndCurrency(instructorId, "MAD", PayoutRequestStatusEnum.PAID))
                .thenReturn(new BigDecimal("0.00"));
        when(payoutRequestRepository.sumByInstructorAndCurrency(instructorId, "MAD", PayoutRequestStatusEnum.PENDING))
                .thenReturn(new BigDecimal("0.00"));

        List<EarningsSummaryResponse> result = service.getInstructorEarnings(instructorId);

        assertEquals(2, result.size());
        EarningsSummaryResponse usd = result.stream().filter(r -> r.currency().equals("USD")).findFirst().orElseThrow();
        EarningsSummaryResponse mad = result.stream().filter(r -> r.currency().equals("MAD")).findFirst().orElseThrow();
        // 80% of 50 = 40.00; minus paid-out 0.40 and pending 0.10 -> 39.50 (only USD payouts deducted)
        assertEquals(0, new BigDecimal("39.50").compareTo(usd.availableAmount()));
        // 80% of 200 = 160.00 -> 160.00
        assertEquals(0, new BigDecimal("160.00").compareTo(mad.availableAmount()));
    }

    @Test
    void courseEarnings_appliesSplitPerCourse() {
        UUID instructorId = UUID.randomUUID();
        UUID courseId = UUID.randomUUID();
        when(parametreService.getRevenueSplit()).thenReturn(split("20", "80"));
        when(orderRepository.aggregatePaidByCourseAndInstructor(instructorId, OrderStatusEnum.paid))
                .thenReturn(List.of(new OrderRepository.CourseRevenueAggregate() {
                    @Override public UUID getCourseId() { return courseId; }
                    @Override public String getCourseTitle() { return "Intro Java"; }
                    @Override public CurrencyEnum getCurrency() { return CurrencyEnum.EUR; }
                    @Override public Long getOrderCount() { return 4L; }
                    @Override public BigDecimal getTotalAmount() { return new BigDecimal("80.00"); }
                }));

        List<EarningsByCourseResponse> result = service.getInstructorCourseEarnings(instructorId);

        assertEquals(1, result.size());
        assertEquals(0, new BigDecimal("64.00").compareTo(result.get(0).earningsAmount()));
        assertEquals("Intro Java", result.get(0).title());
    }

    @Test
    void revenueSummary_separatesPaidPendingAndFailed() {
        when(orderRepository.aggregateRevenueByCurrency(OrderStatusEnum.paid, OrderStatusEnum.pending,
                OrderStatusEnum.cancelled, OrderStatusEnum.refunded))
                .thenReturn(List.of(new OrderRepository.RevenueAggregate() {
                    @Override public CurrencyEnum getCurrency() { return CurrencyEnum.MAD; }
                    @Override public Long getOrderCount() { return 10L; }
                    @Override public BigDecimal getTotalAmount() { return new BigDecimal("1000.00"); }
                    @Override public Long getPaidCount() { return 6L; }
                    @Override public BigDecimal getPaidAmount() { return new BigDecimal("700.00"); }
                    @Override public Long getPendingCount() { return 2L; }
                    @Override public Long getFailedCount() { return 2L; }
                }));

        List<RevenueSummaryResponse> result = service.getRevenueSummary();

        assertEquals(1, result.size());
        RevenueSummaryResponse row = result.get(0);
        assertEquals(10, row.totalCount());
        assertEquals(6, row.paidCount());
        assertEquals(2, row.pendingCount());
        assertEquals(2, row.failedCount());
        assertEquals(0, new BigDecimal("700.00").compareTo(row.paidAmount()));
    }

    @Test
    void adminInstructorEarnings_computesAvailablePerInstructor() {
        UUID instructorId = UUID.randomUUID();
        when(parametreService.getRevenueSplit()).thenReturn(split("20", "80"));
        when(orderRepository.aggregatePaidForAllInstructors(OrderStatusEnum.paid))
                .thenReturn(List.of(new OrderRepository.InstructorRevenueAggregate() {
                    @Override public UUID getInstructorId() { return instructorId; }
                    @Override public String getInstructorFirstName() { return "Jane"; }
                    @Override public String getInstructorLastName() { return "Smith"; }
                    @Override public String getInstructorEmail() { return "jane@example.com"; }
                    @Override public CurrencyEnum getCurrency() { return CurrencyEnum.MAD; }
                    @Override public Long getOrderCount() { return 5L; }
                    @Override public BigDecimal getTotalAmount() { return new BigDecimal("150.00"); }
                }));
        when(payoutRequestRepository.sumByInstructorAndCurrency(instructorId, "MAD", PayoutRequestStatusEnum.PAID))
                .thenReturn(new BigDecimal("1.00"));
        when(payoutRequestRepository.sumByInstructorAndCurrency(instructorId, "MAD", PayoutRequestStatusEnum.PENDING))
                .thenReturn(new BigDecimal("0.50"));

        List<AdminInstructorEarningsResponse> result = service.getAdminInstructorEarnings();

        assertEquals(1, result.size());
        AdminInstructorEarningsResponse row = result.get(0);
        assertEquals("Jane Smith", row.instructorName());
        // 80% of 150 = 120.00 - 1.00 - 0.50 = 118.50
        assertEquals(0, new BigDecimal("118.50").compareTo(row.availableAmount()));
        assertTrue(row.earningsAmount().compareTo(BigDecimal.ZERO) > 0);
    }
}