package com.awardsacademique.cart.dto;

import com.awardsacademique.courses.entity.CurrencyEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutResponse {
    private UUID cartId;
    private UUID userId;
    private List<CheckoutItemResponse> items;
    private BigDecimal totalAmount;
    private CurrencyEnum currency;
    private int itemCount;
    private LocalDateTime preparedAt;
}
