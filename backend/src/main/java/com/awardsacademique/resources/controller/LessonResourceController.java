package com.awardsacademique.resources.controller;

import com.awardsacademique.resources.dto.request.CreateLessonResourceRequest;
import com.awardsacademique.resources.dto.request.UpdateLessonResourceRequest;
import com.awardsacademique.resources.dto.response.LessonResourceResponse;
import com.awardsacademique.resources.service.interfaces.LessonResourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/lesson-resources")
@RequiredArgsConstructor
public class LessonResourceController {

    private static final String UUID_ID = "/{id:[0-9a-fA-F\\-]{36}}";

    private final LessonResourceService lessonResourceService;

    @PostMapping
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<LessonResourceResponse> create(@Valid @RequestBody CreateLessonResourceRequest request) {
        LessonResourceResponse created = lessonResourceService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/lesson-resources/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<LessonResourceResponse> upload(
            @RequestParam("lessonId") UUID lessonId,
            @RequestParam("title") String title,
            @RequestParam("file") MultipartFile file
    ) {
        LessonResourceResponse created = lessonResourceService.upload(lessonId, title, file);
        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/lesson-resources/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping("/lesson" + UUID_ID)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<LessonResourceResponse>> getByLesson(@PathVariable UUID id) {
        return ResponseEntity.ok(lessonResourceService.getByLesson(id));
    }

    @GetMapping("/course" + UUID_ID)
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<List<LessonResourceResponse>> getByCourse(@PathVariable UUID id) {
        return ResponseEntity.ok(lessonResourceService.getByCourse(id));
    }

    @GetMapping("/files/{filename:.+}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Resource> getFile(@PathVariable String filename) {
        Resource file = lessonResourceService.getFile(filename);
        MediaType mediaType = MediaTypeFactory.getMediaType(file)
                .orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok().contentType(mediaType).body(file);
    }

    @PutMapping(UUID_ID)
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<LessonResourceResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateLessonResourceRequest request
    ) {
        return ResponseEntity.ok(lessonResourceService.update(id, request));
    }

    @DeleteMapping(UUID_ID)
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        lessonResourceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
