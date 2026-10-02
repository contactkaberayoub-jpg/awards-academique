package com.awardsacademique.courses.dto.response;

import com.awardsacademique.courses.entity.CourseLevelEnum;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.courses.entity.CurrencyEnum;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Response payload for course data.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseResponse {

    private UUID id;
    private UUID instructorId;
    private String instructorName;
    private UUID categoryId;
    private String categoryName;
    private String title;
    private String subtitle;
    private String description;
    private List<String> learningObjectives;
    private CourseLevelEnum level;
    private CourseStatusEnum status;
    @Getter(onMethod_ = @JsonProperty("isFree"))
    private boolean isFree;
    private BigDecimal price;
    private CurrencyEnum currency;
    private String thumbnailUrl;
    private String logoUrl;
    private String promoVideoUrl;
    private int durationMinutes;
    private BigDecimal averageRating;
    private int reviewsCount;
    private int enrollmentsCount;
    private OffsetDateTime publishedAt;
    private boolean published;
    @Getter(onMethod_ = @JsonProperty("isActive"))
    private boolean isActive;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
