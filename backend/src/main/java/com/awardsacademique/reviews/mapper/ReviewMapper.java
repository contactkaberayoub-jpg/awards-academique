package com.awardsacademique.reviews.mapper;

import com.awardsacademique.reviews.dto.response.ReviewResponse;
import com.awardsacademique.reviews.entity.Review;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * Mapper for converting between Review entities and DTOs.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ReviewMapper {

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "userName", expression = "java(review.getUser() != null ? review.getUser().getFirstName() + \" \" + review.getUser().getLastName() : null)")
    @Mapping(target = "userEmail", source = "user.email")
    @Mapping(target = "courseId", source = "course.id")
    @Mapping(target = "courseTitle", source = "course.title")
    @Mapping(target = "createdAt", source = "createdAt", qualifiedByName = "localToOffset")
    ReviewResponse toResponse(Review review);

    @Named("localToOffset")
    default OffsetDateTime localToOffset(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            return null;
        }
        return localDateTime.atOffset(ZoneOffset.UTC);
    }
}
