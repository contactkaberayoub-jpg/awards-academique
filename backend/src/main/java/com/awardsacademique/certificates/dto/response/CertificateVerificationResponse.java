package com.awardsacademique.certificates.dto.response;

import java.time.OffsetDateTime;

/**
 * Response for the PUBLIC certificate verification endpoint. Intentionally
 * exposes only what an external employer must be able to check: that the code
 * is genuine, who it was issued to, and for which course. It deliberately omits
 * all sensitive/private data — no email address, no internal user id, no file
 * URL, no audit timestamps.
 */
public record CertificateVerificationResponse(
        boolean valid,
        String certificateCode,
        String holderName,
        String courseTitle,
        OffsetDateTime issuedAt
) {
}