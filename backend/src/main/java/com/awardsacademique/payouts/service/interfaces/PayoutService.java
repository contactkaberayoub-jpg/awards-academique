package com.awardsacademique.payouts.service.interfaces;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.payouts.dto.request.CreatePayoutRequest;
import com.awardsacademique.payouts.dto.request.UpsertPayoutAccountRequest;
import com.awardsacademique.payouts.dto.response.PayoutAccountResponse;
import com.awardsacademique.payouts.dto.response.PayoutRequestResponse;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PayoutService {

    Optional<PayoutAccountResponse> getPayoutAccount(UUID instructorId);

    PayoutAccountResponse upsertPayoutAccount(UUID instructorId, UpsertPayoutAccountRequest request);

    boolean hasPayoutAccount(UUID instructorId);

    PayoutRequestResponse requestPayout(UUID instructorId, CreatePayoutRequest request);

    List<PayoutRequestResponse> getInstructorPayoutRequests(UUID instructorId);

    List<PayoutRequestResponse> getAllPayoutRequests();

    List<PayoutRequestResponse> getPendingPayoutRequests();

    PayoutRequestResponse confirmPayout(UUID payoutRequestId, User admin);

    PayoutRequestResponse rejectPayout(UUID payoutRequestId, User admin, String rejectionReason);
}