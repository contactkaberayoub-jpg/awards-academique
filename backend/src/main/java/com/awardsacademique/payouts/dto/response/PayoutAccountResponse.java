package com.awardsacademique.payouts.dto.response;

import com.awardsacademique.payouts.entity.PayoutMethodEnum;

import java.util.UUID;

public record PayoutAccountResponse(
        UUID id,
        String fullName,
        String country,
        PayoutMethodEnum method,
        String paypalEmail,
        String bankName,
        String bankAccountName,
        String iban,
        String swift,
        String currency
) {
}