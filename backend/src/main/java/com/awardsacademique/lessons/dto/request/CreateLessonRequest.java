package com.awardsacademique.lessons.dto.request;

import com.awardsacademique.lessons.entity.LessonTypeEnum;
import com.awardsacademique.lessons.entity.LessonStatusEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateLessonRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    private String content;

    @NotNull(message = "Lesson type is required")
    private LessonTypeEnum lessonType;

    private String videoUrl;

    private Boolean isFreePreview;

    @NotNull(message = "Status is required")
    private LessonStatusEnum status;

    @PositiveOrZero(message = "Display order must be zero or positive")
    private Integer displayOrder;

    @PositiveOrZero(message = "Duration in minutes must be zero or positive")
    private Integer durationMinutes;
}
