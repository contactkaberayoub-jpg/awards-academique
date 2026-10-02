package com.awardsacademique.lessons.mapper;

import com.awardsacademique.lessons.dto.request.CreateLessonRequest;
import com.awardsacademique.lessons.dto.response.LessonResponse;
import com.awardsacademique.lessons.entity.Lesson;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface LessonMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "section", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    Lesson toEntity(CreateLessonRequest request);

    @Mapping(target = "sectionId", source = "section.id")
    @Mapping(target = "sectionTitle", source = "section.title")
    @Mapping(target = "courseId", source = "section.course.id")
    @Mapping(target = "courseTitle", source = "section.course.title")
    @Mapping(target = "isFreePreview", expression = "java(lesson.isFreePreview())")
    LessonResponse toResponse(Lesson lesson);
}
