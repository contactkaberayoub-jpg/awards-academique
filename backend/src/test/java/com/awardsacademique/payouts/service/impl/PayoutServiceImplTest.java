package com.awardsacademique.payouts.service.impl;

import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.entity.InstructorStatusEnum;
import com.awardsacademique.authentification.entity.Role;
import com.awardsacademique.authentification.entity.RoleName;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.payouts.Repository.InstructorPayoutAccountRepository;
import com.awardsacademique.payouts.Repository.PayoutRequestRepository;
import com.awardsacademique.payouts.dto.request.CreatePayoutRequest;
import com.awardsacademique.payouts.dto.request.UpsertPayoutAccountRequest;
import com.awardsacademique.payouts.dto.response.PayoutRequestResponse;
import com.awardsacademique.payouts.entity.InstructorPayoutAccount;
import com.awardsacademique.payouts.entity.PayoutMethodEnum;
import com.awardsacademique.payouts.entity.PayoutRequest;
import com.awardsacademique.payouts.entity.PayoutRequestStatusEnum;
import com.awardsacademique.payouts.exception.PayoutException;
import com.awardsacademique.payouts.service.interfaces.EarningsService;
import com.awardsacademique.payouts.service.interfaces.PayoutExecutionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Service-level tests for the earnings -> payout request -> admin review flow.
 *
 * <p>Focus: the instructor can only request what is actually available, the
 * balance is recomputed while holding the instructor's payout rows locked,
 * confirmation is idempotent (no double pay-out) and rejection returns the
 * funds to the balance. All persistence, earnings and execution are mocked.
 */
@ExtendWith(MockitoExtension.class)
class PayoutServiceImplTest {

    @Mock
    private PayoutRequestRepository payoutRequestRepository;

    @Mock
    private InstructorPayoutAccountRepository payoutAccountRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EarningsService earningsService;

    @Mock
    private PayoutExecutionService payoutExecutionService;

    private PayoutServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PayoutServiceImpl(
                payoutRequestRepository,
                payoutAccountRepository,
                userRepository,
                earningsService,
                payoutExecutionService);
    }

    private User instructor() {
        return User.builder()
                .id(UUID.randomUUID())
                .firstName("John")
                .lastName("Doe")
                .email("john@example.com")
                .role(Role.builder().name(RoleName.instructor).build())
                .instructorStatus(InstructorStatusEnum.APPROVED)
                .build();
    }

    private User admin() {
        return User.builder()
                .id(UUID.randomUUID())
                .email("admin@example.com")
                .role(Role.builder().name(RoleName.administrator).build())
                .build();
    }

    private User student() {
        return User.builder()
                .id(UUID.randomUUID())
                .role(Role.builder().name(RoleName.student).build())
                .build();
    }

    private InstructorPayoutAccount paypalAccount(User instructor) {
        return InstructorPayoutAccount.builder()
                .id(UUID.randomUUID())
                .instructor(instructor)
                .fullName("John Doe")
                .country("Maroc")
                .method(PayoutMethodEnum.PAYPAL)
                .paypalEmail("john@paypal.com")
                .currency("MAD")
                .build();
    }

    private PayoutRequest pendingRequest(User instructor, String amount, String currency) {
        return PayoutRequest.builder()
                .id(UUID.randomUUID())
                .instructor(instructor)
                .requestedAmount(new BigDecimal(amount))
                .currency(currency)
                .method(PayoutMethodEnum.PAYPAL)
                .destinationRef("john@paypal.com")
                .status(PayoutRequestStatusEnum.PENDING)
                .build();
    }

    // ----------------------------------------------------------------------------------
    // Account management
    // ----------------------------------------------------------------------------------

    @Test
    void upsertPayoutAccount_studentUser_throwsForbidden() {
        User student = student();
        when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));

        UpsertPayoutAccountRequest request = new UpsertPayoutAccountRequest(
                "Jane", "MA", PayoutMethodEnum.PAYPAL, "jane@paypal.com", null, null, null, null, "MAD");

        PayoutException ex = assertThrows(PayoutException.class,
                () -> service.upsertPayoutAccount(student.getId(), request));
        assertEquals(403, ex.getStatus());
    }

    @Test
    void upsertPayoutAccount_paypalMissingEmail_throws() {
        User instructor = instructor();
        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));

        UpsertPayoutAccountRequest request = new UpsertPayoutAccountRequest(
                "John", "MA", PayoutMethodEnum.PAYPAL, null, null, null, null, null, "MAD");

        assertThrows(PayoutException.class,
                () -> service.upsertPayoutAccount(instructor.getId(), request));
    }

    // ----------------------------------------------------------------------------------
    // Request payout
    // ----------------------------------------------------------------------------------

    @Test
    void requestPayout_withinAvailable_createsPendingRequest() {
        User instructor = instructor();
        InstructorPayoutAccount account = paypalAccount(instructor);

        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));
        when(payoutAccountRepository.findByInstructorId(instructor.getId())).thenReturn(Optional.of(account));
        when(payoutExecutionService.supports(PayoutMethodEnum.PAYPAL)).thenReturn(true);
        when(payoutRequestRepository.lockAllByInstructor(instructor.getId())).thenReturn(List.of());
        when(earningsService.availableAmount(instructor.getId(), "MAD")).thenReturn(new BigDecimal("100.00"));
        when(payoutRequestRepository.save(any(PayoutRequest.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        PayoutRequestResponse response = service.requestPayout(
                instructor.getId(),
                new CreatePayoutRequest(new BigDecimal("50.00"), "MAD", PayoutMethodEnum.PAYPAL, null));

        assertEquals(PayoutRequestStatusEnum.PENDING, response.status());
        assertEquals(0, new BigDecimal("50.00").compareTo(response.requestedAmount()));
        assertEquals("MAD", response.currency());
        assertEquals("john@paypal.com", response.destinationRef());
        verify(payoutRequestRepository).lockAllByInstructor(instructor.getId());
    }

    @Test
    void requestPayout_amountExceedsAvailable_throwsAndNeverSaves() {
        User instructor = instructor();
        InstructorPayoutAccount account = paypalAccount(instructor);

        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));
        when(payoutAccountRepository.findByInstructorId(instructor.getId())).thenReturn(Optional.of(account));
        when(payoutExecutionService.supports(PayoutMethodEnum.PAYPAL)).thenReturn(true);
        when(payoutRequestRepository.lockAllByInstructor(instructor.getId())).thenReturn(List.of());
        when(earningsService.availableAmount(instructor.getId(), "MAD")).thenReturn(new BigDecimal("10.00"));

        PayoutException ex = assertThrows(PayoutException.class,
                () -> service.requestPayout(instructor.getId(),
                        new CreatePayoutRequest(new BigDecimal("50.00"), "MAD", PayoutMethodEnum.PAYPAL, null)));

        assertTrue(ex.getMessage().contains("Solde insuffisant"));
        verify(payoutRequestRepository, never()).save(any(PayoutRequest.class));
    }

    @Test
    void requestPayout_noAccount_throws() {
        User instructor = instructor();
        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));
        when(payoutAccountRepository.findByInstructorId(instructor.getId())).thenReturn(Optional.empty());

        PayoutException ex = assertThrows(PayoutException.class,
                () -> service.requestPayout(instructor.getId(),
                        new CreatePayoutRequest(new BigDecimal("5.00"), "MAD", PayoutMethodEnum.PAYPAL, null)));

        assertTrue(ex.getMessage().contains("coordonnées de paiement"));
    }

    @Test
    void requestPayout_currencyMismatchWithAccount_throws() {
        User instructor = instructor();
        InstructorPayoutAccount account = paypalAccount(instructor);
        account.setCurrency("EUR");

        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));
        when(payoutAccountRepository.findByInstructorId(instructor.getId())).thenReturn(Optional.of(account));

        assertThrows(PayoutException.class,
                () -> service.requestPayout(instructor.getId(),
                        new CreatePayoutRequest(new BigDecimal("5.00"), "MAD", PayoutMethodEnum.PAYPAL, null)));
    }

    @Test
    void requestPayout_unsupportedCurrency_throws() {
        User instructor = instructor();
        InstructorPayoutAccount account = paypalAccount(instructor);

        when(userRepository.findById(instructor.getId())).thenReturn(Optional.of(instructor));
        when(payoutAccountRepository.findByInstructorId(instructor.getId())).thenReturn(Optional.of(account));

        assertThrows(PayoutException.class,
                () -> service.requestPayout(instructor.getId(),
                        new CreatePayoutRequest(new BigDecimal("5.00"), "GBP", PayoutMethodEnum.PAYPAL, null)));
    }

    // ----------------------------------------------------------------------------------
    // Admin confirmation
    // ----------------------------------------------------------------------------------

    @Test
    void confirmPayout_pending_marksPaidWithProviderRefAndReviewer() {
        User instructor = instructor();
        User reviewer = admin();
        PayoutRequest request = pendingRequest(instructor, "50.00", "MAD");

        when(payoutRequestRepository.findByIdForUpdate(request.getId())).thenReturn(Optional.of(request));
        when(payoutAccountRepository.findByInstructorId(instructor.getId()))
                .thenReturn(Optional.of(paypalAccount(instructor)));
        when(payoutExecutionService.execute(any(), any(PayoutRequest.class)))
                .thenReturn(new PayoutExecutionService.PayoutExecutionResult(
                        "MANUAL-ABCD1234", "MANUAL", "sandbox"));
        when(payoutRequestRepository.save(any(PayoutRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        PayoutRequestResponse response = service.confirmPayout(request.getId(), reviewer);

        assertEquals(PayoutRequestStatusEnum.PAID, response.status());
        assertEquals("MANUAL-ABCD1234", response.providerRef());
        assertEquals(reviewer.getEmail(), response.reviewedByEmail());
    }

    @Test
    void confirmPayout_alreadyPaid_isRejected_noDoublePay() {
        User instructor = instructor();
        User reviewer = admin();
        PayoutRequest request = pendingRequest(instructor, "50.00", "MAD");
        request.setStatus(PayoutRequestStatusEnum.PAID);

        when(payoutRequestRepository.findByIdForUpdate(request.getId())).thenReturn(Optional.of(request));

        assertThrows(PayoutException.class, () -> service.confirmPayout(request.getId(), reviewer));
        verify(payoutExecutionService, never()).execute(any(), any(PayoutRequest.class));
        verify(payoutRequestRepository, never()).save(any(PayoutRequest.class));
    }

    @Test
    void confirmPayout_alreadyRejected_throws() {
        User instructor = instructor();
        User reviewer = admin();
        PayoutRequest request = pendingRequest(instructor, "50.00", "MAD");
        request.setStatus(PayoutRequestStatusEnum.REJECTED);

        when(payoutRequestRepository.findByIdForUpdate(request.getId())).thenReturn(Optional.of(request));

        assertThrows(PayoutException.class, () -> service.confirmPayout(request.getId(), reviewer));
    }

    // ----------------------------------------------------------------------------------
    // Admin rejection
    // ----------------------------------------------------------------------------------

    @Test
    void rejectPayout_pending_marksRejectedWithReason() {
        User instructor = instructor();
        User reviewer = admin();
        PayoutRequest request = pendingRequest(instructor, "50.00", "MAD");

        when(payoutRequestRepository.findByIdForUpdate(request.getId())).thenReturn(Optional.of(request));
        when(payoutRequestRepository.save(any(PayoutRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        PayoutRequestResponse response = service.rejectPayout(request.getId(), reviewer, "IBAN incorrect");

        assertEquals(PayoutRequestStatusEnum.REJECTED, response.status());
        assertEquals("IBAN incorrect", response.rejectionReason());
        assertEquals(reviewer.getEmail(), response.reviewedByEmail());
    }

    @Test
    void rejectPayout_alreadyPaid_throws() {
        User instructor = instructor();
        User reviewer = admin();
        PayoutRequest request = pendingRequest(instructor, "50.00", "MAD");
        request.setStatus(PayoutRequestStatusEnum.PAID);

        when(payoutRequestRepository.findByIdForUpdate(request.getId())).thenReturn(Optional.of(request));

        assertThrows(PayoutException.class,
                () -> service.rejectPayout(request.getId(), reviewer, "trop tard"));
    }
}