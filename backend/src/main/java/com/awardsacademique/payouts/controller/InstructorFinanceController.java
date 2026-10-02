package com.awardsacademique.payouts.controller;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.payouts.dto.request.CreatePayoutRequest;
import com.awardsacademique.payouts.dto.request.UpsertPayoutAccountRequest;
import com.awardsacademique.payouts.dto.response.EarningsByCourseResponse;
import com.awardsacademique.payouts.dto.response.EarningsSummaryResponse;
import com.awardsacademique.payouts.dto.response.PayoutAccountResponse;
import com.awardsacademique.payouts.dto.response.PayoutRequestResponse;
import com.awardsacademique.payouts.service.interfaces.EarningsService;
import com.awardsacademique.payouts.service.interfaces.PayoutService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/instructor")
@RequiredArgsConstructor
public class InstructorFinanceController {

    private final EarningsService earningsService;
    private final PayoutService payoutService;
    private final AuthorizationService authorizationService;

    private UUID currentInstructorId() {
        // Instructors are the only ones allowed past the @PreAuthorize guard, so
        // the resource owner is always the authenticated principal. Never trust a
        // client-supplied id for ownership. Pending/rejected instructors are
        // blocked here until their application is approved.
        User instructor = authorizationService.requireApprovedInstructor();
        return instructor.getId();
    }

    @GetMapping("/earnings")
    @PreAuthorize("hasRole('instructor')")
    public ResponseEntity<List<EarningsSummaryResponse>> getMyEarnings() {
        return ResponseEntity.ok(earningsService.getInstructorEarnings(currentInstructorId()));
    }

    @GetMapping("/earnings/courses")
    @PreAuthorize("hasRole('instructor')")
    public ResponseEntity<List<EarningsByCourseResponse>> getMyCourseEarnings() {
        return ResponseEntity.ok(earningsService.getInstructorCourseEarnings(currentInstructorId()));
    }

    @GetMapping("/payout-account")
    @PreAuthorize("hasRole('instructor')")
    public ResponseEntity<PayoutAccountResponse> getMyPayoutAccount() {
        return ResponseEntity.of(payoutService.getPayoutAccount(currentInstructorId()));
    }

    @PutMapping("/payout-account")
    @PreAuthorize("hasRole('instructor')")
    public ResponseEntity<PayoutAccountResponse> upsertMyPayoutAccount(
            @Valid @RequestBody UpsertPayoutAccountRequest request) {
        return ResponseEntity.ok(payoutService.upsertPayoutAccount(currentInstructorId(), request));
    }

    @GetMapping("/payouts")
    @PreAuthorize("hasRole('instructor')")
    public ResponseEntity<List<PayoutRequestResponse>> getMyPayoutRequests() {
        return ResponseEntity.ok(payoutService.getInstructorPayoutRequests(currentInstructorId()));
    }

    @PostMapping("/payouts")
    @PreAuthorize("hasRole('instructor')")
    public ResponseEntity<PayoutRequestResponse> requestPayout(
            @Valid @RequestBody CreatePayoutRequest request) {
        User instructor = authorizationService.requireCurrentUser();
        PayoutRequestResponse created = payoutService.requestPayout(instructor.getId(), request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }
}