package com.awardsacademique.sections.mapper;

import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.sections.dto.request.CreateSectionRequest;
import com.awardsacademique.sections.dto.response.SectionResponse;
import com.awardsacademique.sections.entity.Section;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

import java.util.UUID;

/**
 * Mapper for converting between Section entities and DTOs.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface SectionMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "course", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    Section toEntity(CreateSectionRequest request);

    @Mapping(target = "courseId", source = "course", qualifiedByName = "courseToId")
    SectionResponse toResponse(Section section);

    @Named("courseToId")
    default UUID courseToId(Course course) {
        return course == null ? null : course.getId();
    }
}
