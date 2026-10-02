package com.awardsacademique.payouts.dto.request;

import com.awardsacademique.payouts.entity.PayoutMethodEnum;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreatePayoutRequest(
        @NotNull(message = "Le montant est obligatoire")
        @DecimalMin(value = "0.01", message = "Le montant doit être supérieur à zéro")
        BigDecimal requestedAmount,

        @NotBlank(message = "La devise est obligatoire")
        @Size(min = 3, max = 3, message = "La devise doit être un code à 3 lettres (MAD, EUR, USD)")
        String currency,

        PayoutMethodEnum method,

        @Size(max = 500)
        String notes
) {
}