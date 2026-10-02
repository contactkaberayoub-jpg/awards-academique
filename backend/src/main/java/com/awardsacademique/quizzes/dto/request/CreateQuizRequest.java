package com.awardsacademique.quizzes.dto.request;

import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Payload for creating a quiz.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateQuizRequest {

    @NotNull(message = "Course ID is required")
    private UUID courseId;

    private UUID lessonId;

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @DecimalMin(value = "0", message = "Passing score must be between 0 and 100")
    @DecimalMax(value = "100", message = "Passing score must be between 0 and 100")
    private Integer passingScore;

    @Min(value = 1, message = "Max attempts must be at least 1")
    private Integer maxAttempts;

    private QuizStatusEnum status;
}
