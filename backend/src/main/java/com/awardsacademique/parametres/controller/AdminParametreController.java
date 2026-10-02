package com.awardsacademique.parametres.controller;

import com.awardsacademique.parametres.dto.request.UpdateParametreRequest;
import com.awardsacademique.parametres.dto.request.UpdateRevenueSplitRequest;
import com.awardsacademique.parametres.dto.response.ParametreResponse;
import com.awardsacademique.parametres.service.interfaces.ParametreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Administrator-only management of platform parameters. Only administrators
 * may read or modify the revenue configuration — students and instructors can
 * never change these values.
 */
@RestController
@RequestMapping("/api/admin/parametres")
@RequiredArgsConstructor
public class AdminParametreController {

    private final ParametreService parametreService;

    @GetMapping
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<List<ParametreResponse>> getAll() {
        return ResponseEntity.ok(parametreService.getAll());
    }

    @GetMapping("/{key}")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<ParametreResponse> getByKey(@PathVariable String key) {
        return ResponseEntity.ok(parametreService.getByKey(key));
    }

    @PutMapping("/{key}")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<ParametreResponse> update(
            @PathVariable String key,
            @Valid @RequestBody UpdateParametreRequest request) {
        return ResponseEntity.ok(
                parametreService.updateValue(key, request.parametreValue(), request.description()));
    }

    /**
     * Atomic revenue-split update. Both percentages are validated (non-negative,
     * totals exactly 100) and persisted in a single database statement, so the
     * pair can never be left in a torn state by concurrent admin changes.
     */
    @PutMapping("/revenue-split")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<List<ParametreResponse>> updateRevenueSplit(
            @Valid @RequestBody UpdateRevenueSplitRequest request) {
        return ResponseEntity.ok(parametreService.updateRevenueSplit(
                request.platformPercentage(), request.instructorPercentage()));
    }
}