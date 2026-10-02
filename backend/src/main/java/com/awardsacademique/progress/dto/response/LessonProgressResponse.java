package com.awardsacademique.progress.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonProgressResponse {

    private UUID id;
    private UUID enrollmentId;
    private UUID userId;
    private UUID courseId;
    private UUID lessonId;
    private UUID sectionId;
    private String lessonTitle;

    @JsonProperty("isCompleted")
    private boolean completed;

    private OffsetDateTime completedAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
