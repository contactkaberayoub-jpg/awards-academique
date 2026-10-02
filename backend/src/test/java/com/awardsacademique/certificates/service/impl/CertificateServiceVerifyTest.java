package com.awardsacademique.certificates.service.impl;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.certificates.Repository.CertificateRepository;
import com.awardsacademique.certificates.dto.response.CertificateVerificationResponse;
import com.awardsacademique.certificates.entity.Certificate;
import com.awardsacademique.certificates.mapper.CertificateMapperImpl;
import com.awardsacademique.courses.entity.Course;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests for the PUBLIC certificate verification endpoint (R2): a genuine lookup
 * returns only the safe display fields, while missing/blank codes return
 * {@code valid=false} instead of raising an exception.
 */
class CertificateServiceVerifyTest {

    private final CertificateRepository repository = mock(CertificateRepository.class);
    private final CertificateServiceImpl service =
            new CertificateServiceImpl(repository, new CertificateMapperImpl(), null, null, null);

    private Certificate certificate(String code, User user, Course course) {
        return Certificate.builder()
                .certificateCode(code)
                .user(user)
                .course(course)
                .issuedAt(LocalDateTime.of(2026, 5, 1, 10, 30))
                .createdAt(LocalDateTime.now())
                .build();
    }

    private User student() {
        return User.builder()
                .firstName("Amina")
                .lastName("Ziani")
                .email("amina.ziani@example.com")
                .build();
    }

    private Course course() {
        return Course.builder().title("Java Avancé").build();
    }

    @Test
    void validCode_returnsValidResponse_withSafeDisplayFieldsOnly() {
        Certificate cert = certificate("CERT-ABC123", student(), course());
        when(repository.findByCertificateCode("CERT-ABC123")).thenReturn(Optional.of(cert));

        CertificateVerificationResponse result = service.verifyByCode("CERT-ABC123");

        assertTrue(result.valid());
        assertEquals("CERT-ABC123", result.certificateCode());
        assertEquals("Amina Ziani", result.holderName());
        assertEquals("Java Avancé", result.courseTitle());
        assertNotNull(result.issuedAt());
    }

    @Test
    void unknownCode_returnsValidFalse_withoutThrowing() {
        when(repository.findByCertificateCode("CERT-NOPE")).thenReturn(Optional.empty());

        CertificateVerificationResponse result = service.verifyByCode("CERT-NOPE");

        assertFalse(result.valid());
        assertEquals("CERT-NOPE", result.certificateCode());
        assertNull(result.holderName());
        assertNull(result.courseTitle());
        assertNull(result.issuedAt());
    }

    @Test
    void nullOrBlankCode_returnsValidFalse_withoutQueryingRepository() {
        assertFalse(service.verifyByCode(null).valid());
        assertFalse(service.verifyByCode("   ").valid());
        assertNull(service.verifyByCode(null).certificateCode());
        verify(repository, never()).findByCertificateCode(anyString());
    }

    @Test
    void codeIsTrimmedBeforeLookup() {
        when(repository.findByCertificateCode("CERT-TRIM")).thenReturn(Optional.empty());

        service.verifyByCode("  CERT-TRIM  ");

        verify(repository).findByCertificateCode("CERT-TRIM");
    }
}