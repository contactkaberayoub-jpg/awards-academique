package com.awardsacademique.payouts.controller;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.payouts.dto.request.RejectPayoutRequest;
import com.awardsacademique.payouts.dto.response.AdminInstructorEarningsResponse;
import com.awardsacademique.payouts.dto.response.PayoutRequestResponse;
import com.awardsacademique.payouts.dto.response.RevenueSummaryResponse;
import com.awardsacademique.payouts.service.interfaces.EarningsService;
import com.awardsacademique.payouts.service.interfaces.PayoutService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminFinanceController {

    private static final String UUID_ID = "/{id:[0-9a-fA-F\\-]{36}}";

    private final EarningsService earningsService;
    private final PayoutService payoutService;
    private final AuthorizationService authorizationService;

    @GetMapping("/revenue")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<List<RevenueSummaryResponse>> getRevenueSummary() {
        return ResponseEntity.ok(earningsService.getRevenueSummary());
    }

    @GetMapping("/instructor-earnings")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<List<AdminInstructorEarningsResponse>> getAllInstructorEarnings() {
        return ResponseEntity.ok(earningsService.getAdminInstructorEarnings());
    }

    @GetMapping("/instructor-earnings" + UUID_ID)
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<List<AdminInstructorEarningsResponse>> getInstructorEarnings(@PathVariable UUID id) {
        return ResponseEntity.ok(earningsService.getAdminInstructorEarnings(id));
    }

    @GetMapping("/payouts")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<List<PayoutRequestResponse>> getAllPayouts() {
        return ResponseEntity.ok(payoutService.getAllPayoutRequests());
    }

    @GetMapping("/payouts/pending")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<List<PayoutRequestResponse>> getPendingPayouts() {
        return ResponseEntity.ok(payoutService.getPendingPayoutRequests());
    }

    @PostMapping("/payouts" + UUID_ID + "/confirm")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<PayoutRequestResponse> confirmPayout(@PathVariable UUID id) {
        User admin = authorizationService.requireAdministratorReturningUser();
        return ResponseEntity.ok(payoutService.confirmPayout(id, admin));
    }

    @PostMapping("/payouts" + UUID_ID + "/reject")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<PayoutRequestResponse> rejectPayout(
            @PathVariable UUID id,
            @Valid @RequestBody RejectPayoutRequest request) {
        User admin = authorizationService.requireAdministratorReturningUser();
        return ResponseEntity.ok(payoutService.rejectPayout(id, admin, request.rejectionReason()));
    }
}