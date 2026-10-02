package com.awardsacademique.instructorapplication.controller;

import com.awardsacademique.authentification.dto.request.RejectInstructorApplicationRequest;
import com.awardsacademique.authentification.dto.response.InstructorApplicationResponse;
import com.awardsacademique.authentification.entity.InstructorStatusEnum;
import com.awardsacademique.instructorapplication.service.interfaces.InstructorApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Administrator-only management of instructor applications. Instructors and
 * students can never approve, reject or list other users' applications.
 */
@RestController
@RequestMapping("/api/admin/instructor-applications")
@RequiredArgsConstructor
public class InstructorApplicationAdminController {

    private final InstructorApplicationService instructorApplicationService;

    @GetMapping
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<List<InstructorApplicationResponse>> listAll(
            @RequestParam(required = false) InstructorStatusEnum status) {
        return ResponseEntity.ok(instructorApplicationService.listAll(status));
    }

    @PatchMapping("/{userId}/approve")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<InstructorApplicationResponse> approve(@PathVariable UUID userId) {
        return ResponseEntity.ok(instructorApplicationService.approve(userId));
    }

    @PatchMapping("/{userId}/reject")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<InstructorApplicationResponse> reject(
            @PathVariable UUID userId,
            @Valid @RequestBody RejectInstructorApplicationRequest request) {
        return ResponseEntity.ok(instructorApplicationService.reject(userId, request.getReason()));
    }
}