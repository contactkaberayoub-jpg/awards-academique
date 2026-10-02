package com.awardsacademique.progress.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateLessonProgressRequest {

    @NotNull(message = "Lesson ID is required")
    private UUID lessonId;

    private UUID enrollmentId;

    @Builder.Default
    private boolean completed = false;
}
