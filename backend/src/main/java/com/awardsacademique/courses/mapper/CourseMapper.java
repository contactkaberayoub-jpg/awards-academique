package com.awardsacademique.courses.mapper;

import com.awardsacademique.courses.dto.request.CreateCourseRequest;
import com.awardsacademique.courses.dto.response.CourseResponse;
import com.awardsacademique.courses.entity.Course;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;

/**
 * Mapper for converting between Course entities and DTOs.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface CourseMapper {

    String OBJECTIVE_SEPARATOR = "\u0001";

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "instructor", ignore = true)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "averageRating", ignore = true)
    @Mapping(target = "reviewsCount", ignore = true)
    @Mapping(target = "enrollmentsCount", ignore = true)
    @Mapping(target = "publishedAt", ignore = true)
    @Mapping(target = "published", ignore = true)
    @Mapping(target = "isActive", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "learningObjectives", source = "learningObjectives", qualifiedByName = "listToString")
    Course toEntity(CreateCourseRequest request);

    @Mapping(target = "instructorId", source = "instructor.id")
    @Mapping(target = "instructorName", expression = "java(course.getInstructor() != null ? course.getInstructor().getFirstName() + \" \" + course.getInstructor().getLastName() : null)")
    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "isFree", expression = "java(course.isFree())")
    @Mapping(target = "isActive", expression = "java(course.isActive())")
    @Mapping(target = "learningObjectives", source = "learningObjectives", qualifiedByName = "stringToList")
    @Mapping(target = "publishedAt", source = "publishedAt", qualifiedByName = "localToOffset")
    @Mapping(target = "published", expression = "java(course.isPublished())")
    @Mapping(target = "createdAt", source = "createdAt", qualifiedByName = "localToOffset")
    @Mapping(target = "updatedAt", source = "updatedAt", qualifiedByName = "localToOffset")
    CourseResponse toResponse(Course course);

    @Named("listToString")
    default String listToString(List<String> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        return String.join(OBJECTIVE_SEPARATOR, list);
    }

    @Named("stringToList")
    default List<String> stringToList(String str) {
        if (str == null || str.isBlank()) {
            return List.of();
        }
        return Arrays.asList(str.split(OBJECTIVE_SEPARATOR));
    }

    @Named("localToOffset")
    default OffsetDateTime localToOffset(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            return null;
        }
        return localDateTime.atOffset(ZoneOffset.UTC);
    }

    @Named("offsetToLocal")
    default LocalDateTime offsetToLocal(OffsetDateTime offsetDateTime) {
        if (offsetDateTime == null) {
            return null;
        }
        return offsetDateTime.toLocalDateTime();
    }
}
