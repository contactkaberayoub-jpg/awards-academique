package com.awardsacademique.payments.paypal;

import com.awardsacademique.payments.paypal.exception.PayPalApiException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit tests for the deterministic MAD→USD server-side amount conversion used
 * by the PayPal checkout. The conversion is a pure function of the stored order
 * amount, the stored currency and the configured rate — the client never
 * contributes any of these values.
 */
class PayPalAmountConverterTest {

    private static final BigDecimal RATE_0_1 = new BigDecimal("0.1"); // 1 MAD = $0.10

    @Test
    void convertsMad250ToExactly25Usd() {
        PayPalAmountConverter.ConvertedAmount result =
                new PayPalAmountConverter(RATE_0_1).toPayPalAmount(new BigDecimal("250.00"), "MAD");

        assertEquals(0, new BigDecimal("25.00").compareTo(result.amount()));
        assertEquals("USD", result.payPalCurrency());
    }

    @Test
    void convertsDecimalMadWithHalfUpRounding() {
        // 49.99 * 0.1 = 4.999 -> 5.00
        PayPalAmountConverter.ConvertedAmount result =
                new PayPalAmountConverter(RATE_0_1).toPayPalAmount(new BigDecimal("49.99"), "MAD");

        assertEquals(0, new BigDecimal("5.00").compareTo(result.amount()));
        assertEquals("USD", result.payPalCurrency());
    }

    @Test
    void passesEurAndUsdThroughUnchanged() {
        PayPalAmountConverter converter = new PayPalAmountConverter(RATE_0_1);

        PayPalAmountConverter.ConvertedAmount eur =
                converter.toPayPalAmount(new BigDecimal("79.00"), "EUR");
        assertEquals(0, new BigDecimal("79.00").compareTo(eur.amount()));
        assertEquals("EUR", eur.payPalCurrency());

        PayPalAmountConverter.ConvertedAmount usd =
                converter.toPayPalAmount(new BigDecimal("12.34"), "usd");
        assertEquals(0, new BigDecimal("12.34").compareTo(usd.amount()));
        assertEquals("USD", usd.payPalCurrency());
    }

    @Test
    void rejectsZeroNegativeOrNullAmount() {
        PayPalAmountConverter converter = new PayPalAmountConverter(RATE_0_1);

        assertThrows(PayPalApiException.class, () -> converter.toPayPalAmount(null, "MAD"));
        assertThrows(PayPalApiException.class, () -> converter.toPayPalAmount(BigDecimal.ZERO, "MAD"));
        assertThrows(PayPalApiException.class, () -> converter.toPayPalAmount(new BigDecimal("-10"), "MAD"));
    }

    @Test
    void rejectsMissingMADRateWithClearMessage() {
        PayPalAmountConverter converter = new PayPalAmountConverter(null);

        PayPalApiException ex = assertThrows(PayPalApiException.class,
                () -> converter.toPayPalAmount(new BigDecimal("50.00"), "MAD"));
        assertTrue(ex.getMessage().contains("PAYPAL_MAD_TO_USD_RATE"));
    }

    @Test
    void rejectsNonPositiveMADRate() {
        PayPalAmountConverter zero = new PayPalAmountConverter(BigDecimal.ZERO);
        PayPalAmountConverter negative = new PayPalAmountConverter(new BigDecimal("-0.1"));

        PayPalApiException ex = assertThrows(PayPalApiException.class,
                () -> zero.toPayPalAmount(new BigDecimal("50.00"), "MAD"));
        assertTrue(ex.getMessage().contains("PAYPAL_MAD_TO_USD_RATE"));
        assertThrows(PayPalApiException.class,
                () -> negative.toPayPalAmount(new BigDecimal("50.00"), "MAD"));
    }

    @Test
    void rejectsUnsupportedCurrencyInsteadOfMislabeling() {
        PayPalAmountConverter converter = new PayPalAmountConverter(RATE_0_1);

        PayPalApiException ex = assertThrows(PayPalApiException.class,
                () -> converter.toPayPalAmount(new BigDecimal("10.00"), "JPY"));
        assertTrue(ex.getMessage().contains("JPY"));
    }
}