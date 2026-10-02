package com.awardsacademique.payouts.dto.request;

import com.awardsacademique.payouts.entity.PayoutMethodEnum;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpsertPayoutAccountRequest(
        @NotBlank(message = "Le nom complet est obligatoire")
        @Size(max = 255)
        String fullName,

        @NotBlank(message = "Le pays est obligatoire")
        @Size(max = 100)
        String country,

        @NotNull(message = "La méthode de paiement est obligatoire")
        PayoutMethodEnum method,

        @Email(message = "L'e-mail PayPal n'est pas valide")
        @Size(max = 255)
        String paypalEmail,

        @Size(max = 255)
        String bankName,

        @Size(max = 255)
        String bankAccountName,

        @Size(max = 64)
        String iban,

        @Size(max = 32)
        String swift,

        @NotBlank(message = "La devise est obligatoire")
        @Size(min = 3, max = 3, message = "La devise doit être un code à 3 lettres (MAD, EUR, USD)")
        String currency
) {
}