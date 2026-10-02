package com.awardsacademique.reviews.dto.response;

import com.awardsacademique.reviews.entity.ReviewStatusEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response payload for review data.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewResponse {

    private UUID id;
    private UUID userId;
    private String userName;
    private String userEmail;
    private UUID courseId;
    private String courseTitle;
    private Integer rating;
    private String comment;
    private ReviewStatusEnum status;
    private OffsetDateTime createdAt;
}
