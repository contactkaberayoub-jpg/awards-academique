package com.awardsacademique.courses.controller;

import com.awardsacademique.courses.dto.request.CreateCourseRequest;
import com.awardsacademique.courses.dto.request.UpdateCourseRequest;
import com.awardsacademique.courses.dto.response.CourseResponse;
import com.awardsacademique.courses.entity.CourseLevelEnum;
import com.awardsacademique.courses.service.interfaces.CourseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.math.BigDecimal;
import java.net.URI;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private static final String UUID_ID = "/{id:[0-9a-fA-F\\-]{36}}";

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "title", "price", "averageRating", "enrollmentsCount", "durationMinutes", "createdAt", "updatedAt"
    );

    private final CourseService courseService;

    @PostMapping
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<CourseResponse> create(@Valid @RequestBody CreateCourseRequest request) {
        CourseResponse created = courseService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping(UUID_ID)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CourseResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateCourseRequest request) {
        return ResponseEntity.ok(courseService.update(id, request));
    }

    @GetMapping(UUID_ID)
    public ResponseEntity<CourseResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(courseService.getById(id));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CourseResponse>> getAll() {
        return ResponseEntity.ok(courseService.getAll());
    }

    @GetMapping("/search")
    public ResponseEntity<Page<CourseResponse>> search(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) CourseLevelEnum level,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Boolean isFree,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction
    ) {
        if (page < 0) {
            throw new IllegalArgumentException("Page must not be negative");
        }
        if (size < 1 || size > 100) {
            throw new IllegalArgumentException("Page size must be between 1 and 100");
        }
        if (!ALLOWED_SORT_FIELDS.contains(sortBy)) {
            throw new IllegalArgumentException("Unsupported course sort field: " + sortBy);
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return ResponseEntity.ok(courseService.search(categoryId, level, minPrice, maxPrice, isFree, title, pageable));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('instructor', 'administrator')")
    public ResponseEntity<List<CourseResponse>> getMine() {
        return ResponseEntity.ok(courseService.getMine());
    }

    @GetMapping("/published")
    public ResponseEntity<List<CourseResponse>> getPublished() {
        return ResponseEntity.ok(courseService.getPublished());
    }

    @PostMapping(UUID_ID + "/publish")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<CourseResponse> publish(@PathVariable UUID id) {
        return ResponseEntity.ok(courseService.publish(id));
    }

    @PostMapping(UUID_ID + "/reject")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<CourseResponse> reject(@PathVariable UUID id) {
        return ResponseEntity.ok(courseService.reject(id));
    }

    @PostMapping(UUID_ID + "/archive")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<CourseResponse> archive(@PathVariable UUID id) {
        return ResponseEntity.ok(courseService.archive(id));
    }

    @PostMapping(UUID_ID + "/restore")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<CourseResponse> restore(@PathVariable UUID id) {
        return ResponseEntity.ok(courseService.restore(id));
    }

    @DeleteMapping(UUID_ID)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        courseService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
