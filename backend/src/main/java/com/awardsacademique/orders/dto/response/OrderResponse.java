package com.awardsacademique.orders.dto.response;

import com.awardsacademique.courses.entity.CurrencyEnum;
import com.awardsacademique.orders.entity.OrderStatusEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response payload for order data.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {

    private UUID id;
    private UUID userId;
    private String userName;
    private String userEmail;
    private UUID courseId;
    private String courseTitle;
    private String courseThumbnailUrl;
    private OrderStatusEnum status;
    private BigDecimal totalAmount;
    private CurrencyEnum currency;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
