package com.awardsacademique.orders.mapper;

import com.awardsacademique.orders.dto.response.OrderResponse;
import com.awardsacademique.orders.entity.Order;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * Mapper for converting between Order entities and DTOs.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface OrderMapper {

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "userName", expression = "java(order.getUser() != null ? order.getUser().getFirstName() + \" \" + order.getUser().getLastName() : null)")
    @Mapping(target = "userEmail", source = "user.email")
    @Mapping(target = "courseId", source = "course.id")
    @Mapping(target = "courseTitle", source = "course.title")
    @Mapping(target = "courseThumbnailUrl", source = "course.thumbnailUrl")
    @Mapping(target = "createdAt", source = "createdAt", qualifiedByName = "localToOffset")
    @Mapping(target = "updatedAt", source = "updatedAt", qualifiedByName = "localToOffset")
    OrderResponse toResponse(Order order);

    @Named("localToOffset")
    default OffsetDateTime localToOffset(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            return null;
        }
        return localDateTime.atOffset(ZoneOffset.UTC);
    }
}
