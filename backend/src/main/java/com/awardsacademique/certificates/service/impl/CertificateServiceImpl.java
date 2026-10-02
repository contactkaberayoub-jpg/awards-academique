package com.awardsacademique.certificates.service.impl;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.certificates.Repository.CertificateRepository;
import com.awardsacademique.certificates.dto.request.CreateCertificateRequest;
import com.awardsacademique.certificates.dto.request.UpdateCertificateRequest;
import com.awardsacademique.certificates.dto.response.CertificateResponse;
import com.awardsacademique.certificates.dto.response.CertificateVerificationResponse;
import com.awardsacademique.certificates.entity.Certificate;
import com.awardsacademique.certificates.exception.CertificateNotFoundException;
import com.awardsacademique.certificates.mapper.CertificateMapper;
import com.awardsacademique.certificates.service.interfaces.CertificateService;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.exception.CourseNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CertificateServiceImpl implements CertificateService {

    private static final String CODE_PREFIX = "CERT-";

    private final CertificateRepository certificateRepository;
    private final CertificateMapper certificateMapper;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final AuthorizationService authorizationService;

    @Override
    @Transactional(readOnly = true)
    public List<CertificateResponse> getMine() {
        User currentUser = authorizationService.requireCurrentUser();
        return certificateRepository.findByUserIdOrderByIssuedAtDesc(currentUser.getId()).stream()
                .map(certificateMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CertificateResponse> getByCourse(UUID courseId) {
        Course course = courseRepository.findByIdAndDeletedAtIsNull(courseId)
                .orElseThrow(() -> new CourseNotFoundException(courseId));

        User currentUser = authorizationService.requireCurrentUser();
        if (!authorizationService.isAdministrator(currentUser)
                && !authorizationService.ownsCourse(course, currentUser)) {
            throw new AccessDeniedException("You can only view certificates for your own courses");
        }

        return certificateRepository.findByCourseIdOrderByIssuedAtDesc(courseId).stream()
                .map(certificateMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CertificateResponse> getAll() {
        authorizationService.requireAdministrator();
        return certificateRepository.findAllByOrderByIssuedAtDesc().stream()
                .map(certificateMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CertificateResponse create(CreateCertificateRequest request) {
        authorizationService.requireAdministrator();
        return buildAndSave(request.getUserId(), request.getCourseId(), request.getFileUrl());
    }

    @Override
    @Transactional
    public CertificateResponse issue(UUID userId, UUID courseId) {
        authorizationService.requireAdministrator();
        return buildAndSave(userId, courseId, null);
    }

    @Override
    @Transactional
    public CertificateResponse issueForCompletion(UUID userId, UUID courseId) {
        // Called from pipeline (progress + quiz passed → auto issue). No admin guard because the
        // caller has already validated 100% course completion + certificate eligibility. If a
        // certificate already exists we return the existing one instead of throwing.
        if (certificateRepository.existsByUserIdAndCourseId(userId, courseId)) {
            return certificateRepository.findByUserIdAndCourseId(userId, courseId)
                    .map(certificateMapper::toResponse)
                    .orElseGet(() -> buildAndSave(userId, courseId, null));
        }
        return buildAndSave(userId, courseId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateResponse verify(String certificateCode) {
        Certificate certificate = certificateRepository.findByCertificateCode(certificateCode)
                .orElseThrow(() -> new CertificateNotFoundException(certificateCode));
        return certificateMapper.toResponse(certificate);
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateVerificationResponse verifyByCode(String certificateCode) {
        if (certificateCode == null || certificateCode.isBlank()) {
            return new CertificateVerificationResponse(false, null, null, null, null);
        }
        String trimmed = certificateCode.trim();
        return certificateRepository.findByCertificateCode(trimmed)
                .map(certificateMapper::toVerificationResponse)
                .orElseGet(() -> new CertificateVerificationResponse(false, trimmed, null, null, null));
    }

    @Override
    @Transactional
    public CertificateResponse update(UUID id, UpdateCertificateRequest request) {
        authorizationService.requireAdministrator();
        Certificate certificate = certificateRepository.findById(id)
                .orElseThrow(() -> new CertificateNotFoundException(id));
        if (request.getCertificateCode() != null) {
            certificate.setCertificateCode(request.getCertificateCode());
        }
        if (request.getFileUrl() != null) {
            certificate.setFileUrl(request.getFileUrl());
        }
        return certificateMapper.toResponse(certificateRepository.save(certificate));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        authorizationService.requireAdministrator();
        Certificate certificate = certificateRepository.findById(id)
                .orElseThrow(() -> new CertificateNotFoundException(id));
        certificateRepository.delete(certificate);
    }

    private CertificateResponse buildAndSave(UUID userId, UUID courseId, String fileUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        Course course = courseRepository.findByIdAndDeletedAtIsNull(courseId)
                .orElseThrow(() -> new CourseNotFoundException(courseId));

        if (certificateRepository.existsByUserIdAndCourseId(userId, courseId)) {
            throw new IllegalArgumentException("A certificate already exists for this user and course");
        }

        Certificate certificate = Certificate.builder()
                .user(user)
                .course(course)
                .certificateCode(generateCode())
                .fileUrl(fileUrl)
                .build();

        return certificateMapper.toResponse(certificateRepository.save(certificate));
    }

    private String generateCode() {
        return CODE_PREFIX + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }
}
