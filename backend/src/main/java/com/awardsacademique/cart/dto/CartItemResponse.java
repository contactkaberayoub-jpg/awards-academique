package com.awardsacademique.cart.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemResponse {
    private UUID id;
    private UUID courseId;
    private String courseTitle;
    private String courseThumbnailUrl;
    private BigDecimal price;
    private String currency;
    private LocalDateTime createdAt;
}
