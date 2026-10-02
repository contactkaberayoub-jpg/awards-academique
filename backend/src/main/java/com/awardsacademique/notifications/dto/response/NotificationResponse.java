package com.awardsacademique.notifications.dto.response;

import com.awardsacademique.notifications.entity.NotificationTypeEnum;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response payload for notification data.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {

    private UUID id;
    private UUID userId;
    private NotificationTypeEnum type;
    private String title;
    private String content;
    @Getter(onMethod_ = @JsonProperty("isRead"))
    private boolean isRead;
    private OffsetDateTime createdAt;
}
