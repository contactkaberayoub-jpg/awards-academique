package com.awardsacademique.reviews.controller;

import com.awardsacademique.reviews.dto.request.CreateReviewRequest;
import com.awardsacademique.reviews.dto.request.UpdateReviewRequest;
import com.awardsacademique.reviews.dto.response.ReviewResponse;
import com.awardsacademique.reviews.service.interfaces.ReviewService;
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
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private static final String UUID_ID = "/{id:[0-9a-fA-F\\-]{36}}";

    private final ReviewService reviewService;

    @PostMapping
    @PreAuthorize("hasRole('student')")
    public ResponseEntity<ReviewResponse> create(@Valid @RequestBody CreateReviewRequest request) {
        ReviewResponse created = reviewService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ReviewResponse>> getMine() {
        return ResponseEntity.ok(reviewService.getMine());
    }

    @GetMapping("/course" + UUID_ID)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ReviewResponse>> getByCourse(@PathVariable UUID id) {
        return ResponseEntity.ok(reviewService.getByCourse(id));
    }

    @GetMapping
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<List<ReviewResponse>> getAll() {
        return ResponseEntity.ok(reviewService.getAll());
    }

    @PutMapping(UUID_ID)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReviewResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateReviewRequest request
    ) {
        return ResponseEntity.ok(reviewService.update(id, request));
    }

    @DeleteMapping(UUID_ID)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        reviewService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
