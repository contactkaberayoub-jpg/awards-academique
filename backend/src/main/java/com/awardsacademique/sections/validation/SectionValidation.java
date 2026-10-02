package com.awardsacademique.sections.validation;

import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.exception.CourseNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Encapsulates business validation rules for section operations.
 */
@Component
@RequiredArgsConstructor
public class SectionValidation {

    private final CourseRepository courseRepository;

    public Course resolveCourse(UUID courseId) {
        return courseRepository.findByIdAndDeletedAtIsNull(courseId)
                .orElseThrow(() -> new CourseNotFoundException(courseId));
    }
}