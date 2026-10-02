package com.awardsacademique.sections.controller;

import com.awardsacademique.sections.dto.request.CreateSectionRequest;
import com.awardsacademique.sections.dto.request.UpdateSectionRequest;
import com.awardsacademique.sections.dto.response.SectionResponse;
import com.awardsacademique.sections.service.interfaces.SectionService;
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
@RequestMapping("/api/sections")
@RequiredArgsConstructor
public class SectionController {

    private final SectionService sectionService;

    @PostMapping
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<SectionResponse> create(@Valid @RequestBody CreateSectionRequest request) {
        SectionResponse created = sectionService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<SectionResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateSectionRequest request
    ) {
        return ResponseEntity.ok(sectionService.update(id, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SectionResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(sectionService.getById(id));
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<SectionResponse>> getByCourseId(@PathVariable UUID courseId) {
        return ResponseEntity.ok(sectionService.getByCourseId(courseId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        sectionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
