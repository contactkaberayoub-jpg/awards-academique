package com.awardsacademique.certificates.controller;

import com.awardsacademique.certificates.dto.request.CreateCertificateRequest;
import com.awardsacademique.certificates.dto.request.UpdateCertificateRequest;
import com.awardsacademique.certificates.dto.response.CertificateResponse;
import com.awardsacademique.certificates.dto.response.CertificateVerificationResponse;
import com.awardsacademique.certificates.service.interfaces.CertificateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/certificates")
@RequiredArgsConstructor
public class CertificateController {

    private static final String UUID_ID = "/{id:[0-9a-fA-F\\-]{36}}";

    private final CertificateService certificateService;

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CertificateResponse>> getMine() {
        return ResponseEntity.ok(certificateService.getMine());
    }

    @GetMapping("/course" + UUID_ID)
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<List<CertificateResponse>> getByCourse(@PathVariable UUID id) {
        return ResponseEntity.ok(certificateService.getByCourse(id));
    }

    @GetMapping
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<List<CertificateResponse>> getAll() {
        return ResponseEntity.ok(certificateService.getAll());
    }

    @GetMapping("/verify/{code}")
    public ResponseEntity<CertificateVerificationResponse> verify(@PathVariable String code) {
        return ResponseEntity.ok(certificateService.verifyByCode(code));
    }

    @PostMapping
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<CertificateResponse> create(@Valid @RequestBody CreateCertificateRequest request) {
        CertificateResponse created = certificateService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PostMapping("/issue")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<CertificateResponse> issue(@Valid @RequestBody CreateCertificateRequest request) {
        CertificateResponse created = certificateService.issue(request.getUserId(), request.getCourseId());
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping(UUID_ID)
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<CertificateResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCertificateRequest request
    ) {
        return ResponseEntity.ok(certificateService.update(id, request));
    }

    @DeleteMapping(UUID_ID)
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        certificateService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
