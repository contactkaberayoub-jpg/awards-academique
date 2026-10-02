package com.awardsacademique.payouts.service.interfaces;

import com.awardsacademique.payouts.entity.InstructorPayoutAccount;
import com.awardsacademique.payouts.entity.PayoutMethodEnum;
import com.awardsacademique.payouts.entity.PayoutRequest;

/**
 * Abstraction over whatever executes a real money transfer to an instructor
 * (PayPal Payouts, SEPA transfer, ...). Spring wires a single implementation
 * — do NOT depend on two.
 */
public interface PayoutExecutionService {

    boolean supports(PayoutMethodEnum method);

    PayoutExecutionResult execute(InstructorPayoutAccount account, PayoutRequest request);

    record PayoutExecutionResult(String reference, String provider, String description) {
    }
}