package com.awardsacademique.certificates.exception;

import java.util.UUID;

/**
 * Thrown when a certificate cannot be found.
 */
public class CertificateNotFoundException extends RuntimeException {

    public CertificateNotFoundException(UUID id) {
        super("Certificate not found with id: " + id);
    }

    public CertificateNotFoundException(String certificateCode) {
        super("Certificate not found with code: " + certificateCode);
    }
}
