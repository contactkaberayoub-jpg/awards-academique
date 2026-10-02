package com.awardsacademique.payments.paypal;

import com.awardsacademique.payments.paypal.exception.PayPalApiException;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Server-side amount converter for PayPal payments.
 *
 * <p>PayPal does not accept MAD, so a MAD-priced order is re-denominated into USD
 * using a single configured rate ({@code paypal.mad-to-usd-rate}). EUR and USD
 * pass through untouched. The exact same conversion is used at order creation
 * time and at capture-time verification, which makes the amount comparison
 * deterministic — the frontend never declares an amount, the server always
 * derives it from the stored order.</p>
 *
 * <p>Failure modes are strict and explicit: null/zero/negative amounts are
 * rejected, an unconfigured or non-positive MAD rate is rejected with a
 * clear message, and an unsupported currency is rejected rather than
 * silently mislabeled.</p>
 */
public class PayPalAmountConverter {

    private final BigDecimal madToUsdRate;

    public PayPalAmountConverter(BigDecimal madToUsdRate) {
        this.madToUsdRate = madToUsdRate;
    }

    /** The amount PayPal is actually charged, in the currency PayPal accepts. */
    public record ConvertedAmount(BigDecimal amount, String payPalCurrency) {
    }

    public ConvertedAmount toPayPalAmount(BigDecimal amount, String internalCurrency) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new PayPalApiException(
                    "Le montant de la commande doit être strictement positif avant d'être envoyé à PayPal.");
        }
        String upper = internalCurrency == null ? "" : internalCurrency.toUpperCase();
        return switch (upper) {
            case "USD", "EUR" -> new ConvertedAmount(amount.setScale(2, RoundingMode.HALF_UP), upper);
            case "MAD" -> convertMAD(amount);
            default -> throw new PayPalApiException(
                    "La devise '" + internalCurrency + "' n'est pas prise en charge par PayPal.");
        };
    }

    private ConvertedAmount convertMAD(BigDecimal amount) {
        BigDecimal rate = madToUsdRate;
        if (rate == null || rate.compareTo(BigDecimal.ZERO) <= 0) {
            throw new PayPalApiException(
                    "PAYPAL_MAD_TO_USD_RATE doit être configuré avec une valeur strictement positive "
                            + "pour facturer un cours en MAD via PayPal.");
        }
        BigDecimal usd = amount.multiply(rate).setScale(2, RoundingMode.HALF_UP);
        if (usd.compareTo(BigDecimal.ZERO) <= 0) {
            throw new PayPalApiException("Le montant converti en USD doit être strictement positif.");
        }
        return new ConvertedAmount(usd, "USD");
    }
}