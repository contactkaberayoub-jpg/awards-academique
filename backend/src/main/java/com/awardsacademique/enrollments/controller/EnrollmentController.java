package com.awardsacademique.enrollments.controller;

import com.awardsacademique.enrollments.dto.request.CreateEnrollmentRequest;
import com.awardsacademique.enrollments.dto.request.UpdateEnrollmentRequest;
import com.awardsacademique.enrollments.dto.response.EnrollmentResponse;
import com.awardsacademique.enrollments.service.interfaces.EnrollmentService;
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
@RequestMapping("/api/enrollments")
@RequiredArgsConstructor
public class EnrollmentController {

    private static final String UUID_ID = "/{id:[0-9a-fA-F\\-]{36}}";

    private final EnrollmentService enrollmentService;

    @PostMapping
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<EnrollmentResponse> enroll(@Valid @RequestBody CreateEnrollmentRequest request) {
        EnrollmentResponse created = enrollmentService.enroll(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<EnrollmentResponse>> getMine() {
        return ResponseEntity.ok(enrollmentService.getMine());
    }

    @GetMapping("/course" + UUID_ID)
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<List<EnrollmentResponse>> getByCourse(@PathVariable UUID id) {
        return ResponseEntity.ok(enrollmentService.getByCourse(id));
    }

    @GetMapping
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<List<EnrollmentResponse>> getAll() {
        return ResponseEntity.ok(enrollmentService.getAll());
    }

    @PutMapping(UUID_ID)
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<EnrollmentResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateEnrollmentRequest request
    ) {
        return ResponseEntity.ok(enrollmentService.update(id, request));
    }

    @DeleteMapping(UUID_ID)
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        enrollmentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
