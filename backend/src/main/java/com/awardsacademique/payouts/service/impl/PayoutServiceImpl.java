package com.awardsacademique.payouts.service.impl;

import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.payouts.Repository.InstructorPayoutAccountRepository;
import com.awardsacademique.payouts.Repository.PayoutRequestRepository;
import com.awardsacademique.payouts.dto.request.CreatePayoutRequest;
import com.awardsacademique.payouts.dto.request.UpsertPayoutAccountRequest;
import com.awardsacademique.payouts.dto.response.PayoutAccountResponse;
import com.awardsacademique.payouts.dto.response.PayoutRequestResponse;
import com.awardsacademique.payouts.entity.InstructorPayoutAccount;
import com.awardsacademique.payouts.entity.PayoutMethodEnum;
import com.awardsacademique.payouts.entity.PayoutRequest;
import com.awardsacademique.payouts.entity.PayoutRequestStatusEnum;
import com.awardsacademique.payouts.exception.PayoutException;
import com.awardsacademique.payouts.service.interfaces.EarningsService;
import com.awardsacademique.payouts.service.interfaces.PayoutExecutionService;
import com.awardsacademique.payouts.service.interfaces.PayoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PayoutServiceImpl implements PayoutService {

    private static final List<String> SUPPORTED_CURRENCIES = List.of("MAD", "EUR", "USD");

    private final PayoutRequestRepository payoutRequestRepository;
    private final InstructorPayoutAccountRepository payoutAccountRepository;
    private final UserRepository userRepository;
    private final EarningsService earningsService;
    private final PayoutExecutionService payoutExecutionService;

    // ------------------------------ payout account ------------------------------

    @Override
    public Optional<PayoutAccountResponse> getPayoutAccount(UUID instructorId) {
        return payoutAccountRepository.findByInstructorId(instructorId)
                .map(PayoutServiceImpl::toResponse);
    }

    @Override
    public boolean hasPayoutAccount(UUID instructorId) {
        return payoutAccountRepository.existsByInstructorId(instructorId);
    }

    @Override
    @Transactional
    public PayoutAccountResponse upsertPayoutAccount(UUID instructorId, UpsertPayoutAccountRequest request) {
        User instructor = requireInstructor(instructorId);
        validateAccountFields(request);

        InstructorPayoutAccount account = payoutAccountRepository.findByInstructorId(instructorId)
                .map(existing -> {
                    existing.setFullName(request.fullName());
                    existing.setCountry(request.country());
                    existing.setMethod(request.method());
                    existing.setPaypalEmail(request.paypalEmail());
                    existing.setBankName(request.bankName());
                    existing.setBankAccountName(request.bankAccountName());
                    existing.setIban(request.iban());
                    existing.setSwift(request.swift());
                    existing.setCurrency(normalizeCurrency(request.currency()));
                    return existing;
                })
                .orElseGet(() -> InstructorPayoutAccount.builder()
                        .instructor(instructor)
                        .fullName(request.fullName())
                        .country(request.country())
                        .method(request.method())
                        .paypalEmail(request.paypalEmail())
                        .bankName(request.bankName())
                        .bankAccountName(request.bankAccountName())
                        .iban(request.iban())
                        .swift(request.swift())
                        .currency(normalizeCurrency(request.currency()))
                        .build());

        return toResponse(payoutAccountRepository.save(account));
    }

    // ------------------------------ requests ------------------------------

    @Override
    @Transactional
    public PayoutRequestResponse requestPayout(UUID instructorId, CreatePayoutRequest request) {
        User instructor = requireInstructor(instructorId);
        InstructorPayoutAccount account = payoutAccountRepository.findByInstructorId(instructorId)
                .orElseThrow(() -> new PayoutException(
                        "Veuillez d'abord enregistrer vos coordonnées de paiement avant de demander un retrait."));

        String currency = normalizeCurrency(request.currency());
        if (!account.getCurrency().equals(currency)) {
            throw new PayoutException("La devise demandée ne correspond pas à votre compte de paiement (" +
                    account.getCurrency() + ").");
        }
        PayoutMethodEnum method = request.method() != null ? request.method() : account.getMethod();
        if (!payoutExecutionService.supports(method)) {
            throw new PayoutException("La méthode de paiement " + method + " n'est pas prise en charge.");
        }

        // Serialize concurrent payout requests from the same instructor: lock every
        // payout row of the instructor, then recompute the available balance so two
        // simultaneous requests cannot double-spend the same funds.
        payoutRequestRepository.lockAllByInstructor(instructorId);
        BigDecimal available = earningsService.availableAmount(instructorId, currency);
        if (request.requestedAmount().compareTo(available) > 0) {
            throw new PayoutException(
                    "Solde insuffisant. Montant disponible : " + available + " " + currency + ".");
        }

        PayoutRequest payoutRequest = PayoutRequest.builder()
                .instructor(instructor)
                .requestedAmount(request.requestedAmount())
                .currency(currency)
                .method(method)
                .destinationRef(destinationRefFor(account, method))
                .status(PayoutRequestStatusEnum.PENDING)
                .notes(request.notes())
                .build();

        return toResponse(payoutRequestRepository.save(payoutRequest));
    }

    @Override
    public List<PayoutRequestResponse> getInstructorPayoutRequests(UUID instructorId) {
        return payoutRequestRepository.findByInstructorIdOrderByRequestedAtDesc(instructorId).stream()
                .map(PayoutServiceImpl::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<PayoutRequestResponse> getAllPayoutRequests() {
        return payoutRequestRepository.findAllByOrderByRequestedAtDesc().stream()
                .map(PayoutServiceImpl::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<PayoutRequestResponse> getPendingPayoutRequests() {
        return payoutRequestRepository.findByStatusOrderByRequestedAtDesc(PayoutRequestStatusEnum.PENDING).stream()
                .map(PayoutServiceImpl::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Idempotent admin confirmation. The row is pessimistically locked so two
     * concurrent "Confirm" clicks cannot both pay the same request; only a
     * PENDING request may be confirmed, and already-PAID requests reject any
     * further confirmation (no double pay-out).
     */
    @Override
    @Transactional
    public PayoutRequestResponse confirmPayout(UUID payoutRequestId, User admin) {
        PayoutRequest request = loadForUpdate(payoutRequestId);

        if (request.getStatus() == PayoutRequestStatusEnum.PAID) {
            throw new PayoutException("Cette demande de paiement a déjà été payée.", 409);
        }
        if (request.getStatus() == PayoutRequestStatusEnum.REJECTED) {
            throw new PayoutException("Cette demande de paiement a été rejetée.", 409);
        }
        if (request.getStatus() != PayoutRequestStatusEnum.PENDING) {
            throw new PayoutException("Seules les demandes en attente peuvent être confirmées.", 409);
        }

        InstructorPayoutAccount account = payoutAccountRepository.findByInstructorId(request.getInstructor().getId())
                .orElse(null);
        PayoutExecutionService.PayoutExecutionResult result =
                payoutExecutionService.execute(account, request);

        request.setStatus(PayoutRequestStatusEnum.PAID);
        request.setProviderRef(result.reference());
        request.setReviewedBy(admin);
        request.setReviewedAt(LocalDateTime.now());
        return toResponse(payoutRequestRepository.save(request));
    }

    /** Rejection simply returns the funds to the instructor's available balance. */
    @Override
    @Transactional
    public PayoutRequestResponse rejectPayout(UUID payoutRequestId, User admin, String rejectionReason) {
        PayoutRequest request = loadForUpdate(payoutRequestId);

        if (request.getStatus() == PayoutRequestStatusEnum.PAID) {
            throw new PayoutException("Cette demande a déjà été payée et ne peut plus être rejetée.", 409);
        }
        if (request.getStatus() == PayoutRequestStatusEnum.REJECTED) {
            throw new PayoutException("Cette demande a déjà été rejetée.", 409);
        }
        if (request.getStatus() != PayoutRequestStatusEnum.PENDING) {
            throw new PayoutException("Seules les demandes en attente peuvent être rejetées.", 409);
        }

        request.setStatus(PayoutRequestStatusEnum.REJECTED);
        request.setRejectionReason(rejectionReason);
        request.setReviewedBy(admin);
        request.setReviewedAt(LocalDateTime.now());
        return toResponse(payoutRequestRepository.save(request));
    }

    // ------------------------------ helpers ------------------------------

    private PayoutRequest loadForUpdate(UUID payoutRequestId) {
        return payoutRequestRepository.findByIdForUpdate(payoutRequestId)
                .orElseThrow(() -> new PayoutException("Demande de paiement introuvable.", 404));
    }

    private User requireInstructor(UUID instructorId) {
        User user = userRepository.findById(instructorId)
                .orElseThrow(() -> new PayoutException("Utilisateur introuvable.", 404));
        if (user.getRole() == null || !"instructor".equals(user.getRole().getName().name())) {
            throw new PayoutException("Le compte de paiement est réservé aux instructeurs.", 403);
        }
        if (user.getInstructorStatus() == null
                || !"APPROVED".equals(user.getInstructorStatus().name())) {
            throw new PayoutException(
                    "Le compte de paiement est réservé aux instructeurs approuvés.", 403);
        }
        return user;
    }

    private String normalizeCurrency(String currency) {
        if (currency == null || !SUPPORTED_CURRENCIES.contains(currency.toUpperCase())) {
            throw new PayoutException("Devise non prise en charge. Devises acceptées : MAD, EUR, USD.");
        }
        return currency.toUpperCase();
    }

    private void validateAccountFields(UpsertPayoutAccountRequest request) {
        if (request.method() == PayoutMethodEnum.PAYPAL && isBlank(request.paypalEmail())) {
            throw new PayoutException("L'e-mail PayPal est obligatoire pour la méthode PayPal.");
        }
        if (request.method() == PayoutMethodEnum.BANK) {
            if (isBlank(request.bankName()) || isBlank(request.bankAccountName())
                    || isBlank(request.iban()) || isBlank(request.swift())) {
                throw new PayoutException(
                        "Les coordonnées bancaires sont incomplètes (nom de banque, titulaire, IBAN, BIC).");
            }
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String destinationRefFor(InstructorPayoutAccount account, PayoutMethodEnum method) {
        if (method == PayoutMethodEnum.BANK && !isBlank(account.getIban())) {
            return account.getBankAccountName() + " · " + account.getIban();
        }
        return account.getPaypalEmail();
    }

    private static PayoutAccountResponse toResponse(InstructorPayoutAccount a) {
        return new PayoutAccountResponse(
                a.getId(),
                a.getFullName(),
                a.getCountry(),
                a.getMethod(),
                a.getPaypalEmail(),
                a.getBankName(),
                a.getBankAccountName(),
                a.getIban(),
                a.getSwift(),
                a.getCurrency()
        );
    }

    private static PayoutRequestResponse toResponse(PayoutRequest r) {
        String instructorName = "—";
        String reviewedByEmail = null;
        if (r.getInstructor() != null) {
            if (r.getInstructor().getFirstName() != null || r.getInstructor().getLastName() != null) {
                instructorName = (r.getInstructor().getFirstName() == null ? "" : r.getInstructor().getFirstName())
                        + " " + (r.getInstructor().getLastName() == null ? "" : r.getInstructor().getLastName());
            }
            reviewedByEmail = r.getInstructor().getEmail();
        }
        if (r.getReviewedBy() != null) {
            reviewedByEmail = r.getReviewedBy().getEmail();
        }
        return new PayoutRequestResponse(
                r.getId(),
                r.getInstructor() == null ? null : r.getInstructor().getId().toString(),
                instructorName.trim(),
                r.getRequestedAmount(),
                r.getCurrency(),
                r.getMethod(),
                r.getDestinationRef(),
                r.getStatus(),
                r.getRejectionReason(),
                r.getProviderRef(),
                r.getNotes(),
                r.getRequestedAt(),
                r.getReviewedAt(),
                reviewedByEmail
        );
    }
}