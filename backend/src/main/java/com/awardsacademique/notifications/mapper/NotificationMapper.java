package com.awardsacademique.notifications.mapper;

import com.awardsacademique.notifications.dto.response.NotificationResponse;
import com.awardsacademique.notifications.entity.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/**
 * Mapper for converting between Notification entities and DTOs.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface NotificationMapper {

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "isRead", expression = "java(notification.isRead())")
    @Mapping(target = "createdAt", source = "createdAt", qualifiedByName = "localToOffset")
    NotificationResponse toResponse(Notification notification);

    @Named("localToOffset")
    default OffsetDateTime localToOffset(LocalDateTime localDateTime) {
        if (localDateTime == null) {
            return null;
        }
        return localDateTime.atOffset(ZoneOffset.UTC);
    }
}
