package com.awardsacademique.instructorstudent.controller;

import com.awardsacademique.instructorstudent.dto.response.InstructorCourseStudentDetailResponse;
import com.awardsacademique.instructorstudent.dto.response.InstructorCourseStudentsResponse;
import com.awardsacademique.instructorstudent.service.interfaces.InstructorCourseStudentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/instructor/courses/{courseId}/students")
@RequiredArgsConstructor
public class InstructorCourseStudentsController {

    private final InstructorCourseStudentService studentService;

    @GetMapping
    @PreAuthorize("hasAnyRole('instructor','administrator')")
    public ResponseEntity<InstructorCourseStudentsResponse> getCourseStudents(
            @PathVariable UUID courseId) {
        return ResponseEntity.ok(studentService.getCourseStudents(courseId));
    }

    @GetMapping("/{studentId}")
    @PreAuthorize("hasAnyRole('instructor','administrator')")
    public ResponseEntity<InstructorCourseStudentDetailResponse> getCourseStudentDetail(
            @PathVariable UUID courseId,
            @PathVariable UUID studentId) {
        return ResponseEntity.ok(studentService.getCourseStudentDetail(courseId, studentId));
    }
}