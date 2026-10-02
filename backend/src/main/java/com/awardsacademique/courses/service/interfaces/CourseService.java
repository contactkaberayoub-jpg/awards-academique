package com.awardsacademique.courses.service.interfaces;

import com.awardsacademique.courses.dto.request.CreateCourseRequest;
import com.awardsacademique.courses.dto.request.UpdateCourseRequest;
import com.awardsacademique.courses.dto.response.CourseResponse;
import com.awardsacademique.courses.entity.CourseLevelEnum;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface CourseService {

    CourseResponse create(CreateCourseRequest request);

    CourseResponse update(UUID id, UpdateCourseRequest request);

    CourseResponse getById(UUID id);

    List<CourseResponse> getAll();

    List<CourseResponse> getMine();

    List<CourseResponse> getPublished();

    Page<CourseResponse> search(UUID categoryId, CourseLevelEnum level, BigDecimal minPrice, BigDecimal maxPrice, Boolean isFree, String title, Pageable pageable);

    CourseResponse publish(UUID id);

    CourseResponse reject(UUID id);

    CourseResponse archive(UUID id);

    CourseResponse restore(UUID id);

    void delete(UUID id);
}
