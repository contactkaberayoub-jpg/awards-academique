package com.awardsacademique.courses.dto.request;

import com.awardsacademique.courses.entity.CourseLevelEnum;
import com.awardsacademique.courses.entity.CurrencyEnum;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Payload for updating an existing course.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCourseRequest {

    private UUID categoryId;

    @Size(max = 255, message = "Title must not exceed 255 characters")
    @Pattern(regexp = ".*\\S.*", message = "Title must not be blank")
    private String title;

    @Size(max = 255, message = "Subtitle must not exceed 255 characters")
    private String subtitle;

    private String description;

    private List<String> learningObjectives;

    private CourseLevelEnum level;

    private Boolean isFree;

    @DecimalMin(value = "0.0", message = "Price must be positive")
    private BigDecimal price;

    private CurrencyEnum currency;

    private String thumbnailUrl;

    private String logoUrl;

    private String promoVideoUrl;

    private Integer durationMinutes;

    private Boolean isActive;

    @AssertTrue(message = "A free course must have a price of 0. Set the price to 0 or uncheck the free flag.")
    public boolean isFreePriceConsistent() {
        return !Boolean.TRUE.equals(isFree) || price == null || price.signum() == 0;
    }
}
