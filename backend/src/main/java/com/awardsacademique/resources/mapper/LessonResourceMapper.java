package com.awardsacademique.resources.mapper;

import com.awardsacademique.resources.dto.response.LessonResourceResponse;
import com.awardsacademique.resources.entity.LessonResource;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * Mapper for converting between LessonResource entities and DTOs.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface LessonResourceMapper {

    @Mapping(target = "lessonId", source = "lesson.id")
    @Mapping(target = "lessonTitle", source = "lesson.title")
    @Mapping(target = "courseId", expression = "java(lessonResource.getLesson() != null && lessonResource.getLesson().getSection() != null && lessonResource.getLesson().getSection().getCourse() != null ? lessonResource.getLesson().getSection().getCourse().getId() : null)")
    @Mapping(target = "courseTitle", expression = "java(lessonResource.getLesson() != null && lessonResource.getLesson().getSection() != null && lessonResource.getLesson().getSection().getCourse() != null ? lessonResource.getLesson().getSection().getCourse().getTitle() : null)")
    @Mapping(target = "createdAt", source = "createdAt", qualifiedByName = "localToOffset")
    LessonResourceResponse toResponse(LessonResource lessonResource);

    @Named("localToOffset")
    default OffsetDateTime localToOffset(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            return null;
        }
        return localDateTime.atOffset(ZoneOffset.UTC);
    }
}
