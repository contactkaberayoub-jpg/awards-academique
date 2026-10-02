package com.awardsacademique.progress.mapper;

import com.awardsacademique.progress.dto.response.LessonProgressResponse;
import com.awardsacademique.progress.entity.LessonProgress;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface LessonProgressMapper {

    @Mapping(target = "enrollmentId", source = "enrollment.id")
    @Mapping(target = "userId", expression = "java(progress.getEnrollment() != null && progress.getEnrollment().getUser() != null ? progress.getEnrollment().getUser().getId() : null)")
    @Mapping(target = "courseId", expression = "java(progress.getEnrollment() != null && progress.getEnrollment().getCourse() != null ? progress.getEnrollment().getCourse().getId() : null)")
    @Mapping(target = "lessonId", source = "lesson.id")
    @Mapping(target = "lessonTitle", source = "lesson.title")
    @Mapping(target = "sectionId", expression = "java(progress.getLesson() != null && progress.getLesson().getSection() != null ? progress.getLesson().getSection().getId() : null)")
    @Mapping(target = "completed", source = "completed")
    @Mapping(target = "completedAt", source = "completedAt", qualifiedByName = "localToOffset")
    @Mapping(target = "createdAt", source = "createdAt", qualifiedByName = "localToOffset")
    @Mapping(target = "updatedAt", source = "updatedAt", qualifiedByName = "localToOffset")
    LessonProgressResponse toResponse(LessonProgress progress);

    @Named("localToOffset")
    default OffsetDateTime localToOffset(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            return null;
        }
        return localDateTime.atOffset(ZoneOffset.UTC);
    }
}
