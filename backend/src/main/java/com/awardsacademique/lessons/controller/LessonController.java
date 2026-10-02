package com.awardsacademique.lessons.controller;

import com.awardsacademique.lessons.dto.request.CreateLessonRequest;
import com.awardsacademique.lessons.dto.request.UpdateLessonRequest;
import com.awardsacademique.lessons.dto.response.LessonResponse;
import com.awardsacademique.lessons.entity.LessonStatusEnum;
import com.awardsacademique.lessons.service.interfaces.LessonService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Validated
public class LessonController {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "title", "displayOrder", "durationMinutes", "status", "createdAt", "updatedAt"
    );

    private final LessonService lessonService;

    @GetMapping("/api/lessons")
    public ResponseEntity<List<LessonResponse>> getAll() {
        return ResponseEntity.ok(lessonService.getAll());
    }

    @GetMapping("/api/lessons/page")
    public ResponseEntity<Page<LessonResponse>> getPage(
            @RequestParam(required = false) UUID sectionId,
            @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) LessonStatusEnum status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "displayOrder") String sortBy,
            @RequestParam(defaultValue = "ASC") Sort.Direction direction
    ) {
        if (page < 0) {
            throw new IllegalArgumentException("Page must not be negative");
        }
        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("Page size must be between 1 and 100");
        }
        if (!ALLOWED_SORT_FIELDS.contains(sortBy)) {
            throw new IllegalArgumentException("Unsupported lesson sort field: " + sortBy);
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return ResponseEntity.ok(lessonService.getPage(courseId, sectionId, status, search, pageable));
    }

    @GetMapping("/api/lessons/{id}")
    public ResponseEntity<LessonResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(lessonService.getById(id));
    }

    @GetMapping("/api/lessons/videos/{filename:.+}")
    public ResponseEntity<Resource> getVideo(@PathVariable String filename) {
        Resource video = lessonService.getVideo(filename);
        MediaType mediaType = MediaTypeFactory.getMediaType(video)
                .orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok().contentType(mediaType).body(video);
    }

    @GetMapping("/api/sections/{sectionId}/lessons")
    public ResponseEntity<List<LessonResponse>> getBySectionId(@PathVariable UUID sectionId) {
        return ResponseEntity.ok(lessonService.getBySectionId(sectionId));
    }

    @PostMapping("/api/sections/{sectionId}/lessons")
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<LessonResponse> create(
            @PathVariable UUID sectionId,
            @Valid @RequestBody CreateLessonRequest request
    ) {
        LessonResponse created = lessonService.create(sectionId, request);
        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/lessons/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/api/lessons/{id}")
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<LessonResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateLessonRequest request
    ) {
        return ResponseEntity.ok(lessonService.update(id, request));
    }

    @PostMapping(value = "/api/lessons/{id}/video", consumes = "multipart/form-data")
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<LessonResponse> uploadVideo(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(lessonService.uploadVideo(id, file));
    }

    @PutMapping(value = "/api/lessons/{id}/video", consumes = "multipart/form-data")
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<LessonResponse> replaceVideo(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(lessonService.uploadVideo(id, file));
    }

    @DeleteMapping("/api/lessons/{id}/video")
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<LessonResponse> deleteVideo(@PathVariable UUID id) {
        return ResponseEntity.ok(lessonService.deleteVideo(id));
    }

    @DeleteMapping("/api/lessons/{id}")
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        lessonService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
