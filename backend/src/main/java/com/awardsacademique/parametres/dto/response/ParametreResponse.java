package com.awardsacademique.parametres.dto.response;

import java.time.LocalDateTime;

public record ParametreResponse(
        Long id,
        String key,
        String value,
        String description,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}