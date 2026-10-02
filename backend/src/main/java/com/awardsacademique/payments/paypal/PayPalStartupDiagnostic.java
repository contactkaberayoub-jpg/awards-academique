package com.awardsacademique.payments.paypal;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Startup-only diagnostic for the shared PayPal configuration. Logs a single,
 * safe summary once at boot. Prints only:
 *
 * <pre>
 * PayPal configured: true|false
 * PayPal mode: &lt;mode&gt;
 * PayPal client ID: &lt;masked&gt;
 * PayPal client secret present: true|false
 * PayPal base URL: &lt;base-url&gt;
 * </pre>
 *
 * <p>Never prints the full client ID, never prints the client secret (only
 * whether it is present), and never writes them to any API response or log.
 * The same {@link PayPalProperties} bean consumed by the student
 * ({@code PayPalOrderService}) checkout flow is reused here — there is no
 * second configuration system.</p>
 */
@Component
@Slf4j
public class PayPalStartupDiagnostic implements ApplicationRunner {

    private final PayPalProperties properties;

    public PayPalStartupDiagnostic(PayPalProperties properties) {
        this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean clientIdPresent = isPresent(properties.getClientId());
        boolean clientSecretPresent = isPresent(properties.getClientSecret());
        log.info("PayPal configured: {} | mode: {} | client ID: {} | client secret present: {} | base URL: {}",
                clientIdPresent && clientSecretPresent,
                properties.getMode(),
                mask(properties.getClientId()),
                clientSecretPresent,
                properties.getBaseUrl());
    }

    private static boolean isPresent(String value) {
        return value != null && !value.isBlank() && !value.contains("${");
    }

    /** Masks a client id: first 4 + last 4 chars. Never applied to the secret. */
    private static String mask(String value) {
        if (value == null || value.isBlank()) {
            return "<absent>";
        }
        if (value.length() <= 8) {
            return value.charAt(0) + "***";
        }
        return value.substring(0, 4) + "****" + value.substring(value.length() - 4);
    }
}
