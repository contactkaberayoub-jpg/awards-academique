package com.awardsacademique.enrollments.dto.response;

import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response payload for enrollment data.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentResponse {

    private UUID id;
    private UUID userId;
    private String studentName;
    private String studentEmail;
    private UUID courseId;
    private String courseTitle;
    private String courseThumbnailUrl;
    private EnrollmentStatusEnum status;
    private BigDecimal completionPercentage;
    private OffsetDateTime enrolledAt;
    private OffsetDateTime lastActivityAt;
    private OffsetDateTime completedAt;
}
