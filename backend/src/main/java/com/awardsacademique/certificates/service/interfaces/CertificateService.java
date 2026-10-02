package com.awardsacademique.certificates.service.interfaces;

import com.awardsacademique.certificates.dto.request.CreateCertificateRequest;
import com.awardsacademique.certificates.dto.request.UpdateCertificateRequest;
import com.awardsacademique.certificates.dto.response.CertificateResponse;
import com.awardsacademique.certificates.dto.response.CertificateVerificationResponse;

import java.util.List;
import java.util.UUID;

public interface CertificateService {

    List<CertificateResponse> getMine();

    List<CertificateResponse> getByCourse(UUID courseId);

    List<CertificateResponse> getAll();

    CertificateResponse create(CreateCertificateRequest request);

    CertificateResponse issue(UUID userId, UUID courseId);

    CertificateResponse issueForCompletion(UUID userId, UUID courseId);

    CertificateResponse verify(String certificateCode);

    /**
     * Public, unauthenticated lookup used by external employers. Never throws
     * for a missing/blank code: it returns {@code valid=false} so the endpoint
     * behaves as a simple check rather than an information oracle.
     */
    CertificateVerificationResponse verifyByCode(String certificateCode);

    CertificateResponse update(UUID id, UpdateCertificateRequest request);

    void delete(UUID id);
}

