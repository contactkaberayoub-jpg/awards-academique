package com.awardsacademique.payouts.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectPayoutRequest(
        @NotBlank(message = "Le motif du rejet est obligatoire")
        @Size(max = 2000)
        String rejectionReason
) {
}