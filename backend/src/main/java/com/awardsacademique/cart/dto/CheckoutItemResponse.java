package com.awardsacademique.cart.dto;

import com.awardsacademique.courses.entity.CurrencyEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutItemResponse {
    private UUID courseId;
    private String courseTitle;
    private String courseThumbnailUrl;
    private BigDecimal price;
    private CurrencyEnum currency;
    private boolean free;
}
