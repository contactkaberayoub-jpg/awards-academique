package com.awardsacademique.payouts.service.impl;

import com.awardsacademique.payouts.entity.InstructorPayoutAccount;
import com.awardsacademique.payouts.entity.PayoutMethodEnum;
import com.awardsacademique.payouts.entity.PayoutRequest;
import com.awardsacademique.payouts.service.interfaces.PayoutExecutionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * SANDBOX / MANUAL payout executor — DOES NOT MOVE REAL MONEY.
 *
 * <p>This adapter only marks a payout request as executed locally (reference
 * {@code MANUAL-...}) and logs loudly. It exists so the full
 * request -> review -> confirm workflow can be exercised end-to-end in the
 * sandbox. Wire a REAL provider (PayPal Payouts API, SEPA, ...) behind
 * {@link PayoutExecutionService} before any production use; nothing in the
 * payout flows depends on this class in particular.
 */
@Slf4j
@Service
public class ManualPayoutExecutionServiceAdapter implements PayoutExecutionService {

    @Override
    public boolean supports(PayoutMethodEnum method) {
        return true;
    }

    @Override
    public PayoutExecutionResult execute(InstructorPayoutAccount account, PayoutRequest request) {
        String reference = "MANUAL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.warn(
                "MANUAL PAYOUT (SANDBOX, NO REAL MONEY MOVED): marking payout request id={} for instructor={} " +
                        "amount={} {} as executed with reference={}. Replace {} with a real provider before production.",
                request.getId(),
                request.getInstructor().getId(),
                request.getRequestedAmount(),
                request.getCurrency(),
                reference,
                ManualPayoutExecutionServiceAdapter.class.getSimpleName()
        );
        return new PayoutExecutionResult(
                reference,
                "MANUAL",
                "Paiement simulé (mode sandbox manuel) — aucun virement réel n'a été effectué."
        );
    }
}