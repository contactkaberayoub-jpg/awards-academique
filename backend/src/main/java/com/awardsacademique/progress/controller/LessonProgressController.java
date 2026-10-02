package com.awardsacademique.progress.controller;

import com.awardsacademique.progress.dto.request.CreateLessonProgressRequest;
import com.awardsacademique.progress.dto.request.UpdateLessonProgressRequest;
import com.awardsacademique.progress.dto.response.CourseProgressResponse;
import com.awardsacademique.progress.dto.response.LessonProgressResponse;
import com.awardsacademique.progress.service.interfaces.LessonProgressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class LessonProgressController {

    private final LessonProgressService lessonProgressService;

    @PostMapping
    @PreAuthorize("hasAnyRole('student','administrator')")
    public ResponseEntity<LessonProgressResponse> create(
            @Valid @RequestBody CreateLessonProgressRequest request) {
        LessonProgressResponse response = lessonProgressService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/lessons/{lessonId}/completed")
    @PreAuthorize("hasAnyRole('student','administrator')")
    public ResponseEntity<LessonProgressResponse> markCompleted(@PathVariable UUID lessonId) {
        return ResponseEntity.ok(lessonProgressService.markLessonCompleted(lessonId));
    }

    @PostMapping("/lessons/{lessonId}/started")
    @PreAuthorize("hasAnyRole('student','administrator')")
    public ResponseEntity<LessonProgressResponse> markStarted(@PathVariable UUID lessonId) {
        return ResponseEntity.ok(lessonProgressService.markLessonStarted(lessonId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('student','administrator')")
    public ResponseEntity<LessonProgressResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateLessonProgressRequest request) {
        return ResponseEntity.ok(lessonProgressService.update(id, request));
    }

    @GetMapping("/lessons/{lessonId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<LessonProgressResponse> getByLesson(@PathVariable UUID lessonId) {
        return ResponseEntity.ok(lessonProgressService.getByLesson(lessonId));
    }

    @GetMapping("/enrollments/{enrollmentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<LessonProgressResponse>> getByEnrollment(
            @PathVariable UUID enrollmentId) {
        return ResponseEntity.ok(lessonProgressService.getByEnrollment(enrollmentId));
    }

    @GetMapping("/courses/{courseId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CourseProgressResponse> getCourseProgress(
            @PathVariable UUID courseId) {
        return ResponseEntity.ok(lessonProgressService.getCourseProgressByCourse(courseId));
    }

    @GetMapping("/enrollments/{enrollmentId}/course")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CourseProgressResponse> getCourseProgressByEnrollment(
            @PathVariable UUID enrollmentId) {
        return ResponseEntity.ok(lessonProgressService.getCourseProgressByEnrollment(enrollmentId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        lessonProgressService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
