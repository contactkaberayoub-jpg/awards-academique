package com.awardsacademique.categories.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Response payload for category data.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryResponse {

    private UUID id;
    private UUID parentId;
    private String name;
    private String slug;
    private String iconUrl;
    private int displayOrder;
    @Getter(onMethod_ = @JsonProperty("isActive"))
    private boolean isActive;
}
