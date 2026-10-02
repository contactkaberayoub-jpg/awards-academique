package com.awardsacademique.instructorapplication.controller;

import com.awardsacademique.authentification.dto.request.UpdateInstructorApplicationRequest;
import com.awardsacademique.authentification.dto.response.InstructorApplicationResponse;
import com.awardsacademique.instructorapplication.service.interfaces.InstructorApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/instructor/application")
@RequiredArgsConstructor
public class InstructorApplicationController {

    private final InstructorApplicationService instructorApplicationService;

    @GetMapping("/me")
    @PreAuthorize("hasRole('instructor')")
    public ResponseEntity<InstructorApplicationResponse> getMine() {
        return ResponseEntity.ok(instructorApplicationService.getMine());
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('instructor')")
    public ResponseEntity<InstructorApplicationResponse> updateMine(
            @Valid @RequestBody UpdateInstructorApplicationRequest request) {
        return ResponseEntity.ok(instructorApplicationService.updateMine(request));
    }

    @PostMapping("/resubmit")
    @PreAuthorize("hasRole('instructor')")
    public ResponseEntity<InstructorApplicationResponse> resubmit() {
        return ResponseEntity.ok(instructorApplicationService.resubmit());
    }
}