package com.awardsacademique.enrollments.mapper;

import com.awardsacademique.enrollments.dto.response.EnrollmentResponse;
import com.awardsacademique.enrollments.entity.Enrollment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * Mapper for converting between Enrollment entities and DTOs.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface EnrollmentMapper {

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "studentName", expression = "java(enrollment.getUser() != null ? enrollment.getUser().getFirstName() + \" \" + enrollment.getUser().getLastName() : null)")
    @Mapping(target = "studentEmail", source = "user.email")
    @Mapping(target = "courseId", source = "course.id")
    @Mapping(target = "courseTitle", source = "course.title")
    @Mapping(target = "courseThumbnailUrl", source = "course.thumbnailUrl")
    @Mapping(target = "enrolledAt", source = "enrolledAt", qualifiedByName = "localToOffset")
    @Mapping(target = "lastActivityAt", source = "lastActivityAt", qualifiedByName = "localToOffset")
    @Mapping(target = "completedAt", source = "completedAt", qualifiedByName = "localToOffset")
    EnrollmentResponse toResponse(Enrollment enrollment);

    @Named("localToOffset")
    default OffsetDateTime localToOffset(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            return null;
        }
        return localDateTime.atOffset(ZoneOffset.UTC);
    }
}
