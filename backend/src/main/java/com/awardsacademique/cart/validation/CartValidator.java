package com.awardsacademique.cart.validation;

import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.courses.exception.CourseNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CartValidator {

    private final CourseRepository courseRepository;

    public Course resolveCourse(UUID courseId) {
        return courseRepository.findByIdAndDeletedAtIsNull(courseId)
                .orElseThrow(() -> new CourseNotFoundException(courseId));
    }

    public void validateAddable(Course course) {
        if (course.getStatus() != CourseStatusEnum.published || !course.isPublished()) {
            throw new IllegalArgumentException("You can only add published courses to your cart");
        }
        if (!course.isActive()) {
            throw new IllegalArgumentException("This course is no longer active");
        }
    }
}
