package com.awardsacademique.payments.paypal;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "paypal")
public class PayPalProperties {
    private String clientId;
    private String clientSecret;
    private String baseUrl = "https://api-m.sandbox.paypal.com";
    private String mode = "sandbox";
    private int timeoutSeconds = 30;

    /**
     * MAD → USD exchange rate used to re-denominate MAD-priced orders before
     * they are sent to PayPal (which does not support MAD). Expressed as USD per
     * 1 MAD, e.g. {@code 0.1} means 1 MAD = $0.10. This is the single rate used
     * both when creating the PayPal order and when verifying the captured amount,
     * so the comparison stays deterministic. Must be strictly positive whenever
     * any course is priced in MAD; the service fails loudly otherwise.
     */
    private BigDecimal madToUsdRate;
}
