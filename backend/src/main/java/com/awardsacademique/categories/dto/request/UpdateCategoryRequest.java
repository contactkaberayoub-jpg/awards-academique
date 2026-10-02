package com.awardsacademique.categories.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Payload for updating an existing category.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCategoryRequest {

    private UUID parentId;

    private Boolean clearParent;

    @Size(max = 150, message = "Name must not exceed 150 characters")
    @Pattern(regexp = ".*\\S.*", message = "Name must not be blank")
    private String name;

    @Size(max = 150, message = "Slug must not exceed 150 characters")
    private String slug;

    private String iconUrl;

    private Integer displayOrder;

    private Boolean isActive;
}