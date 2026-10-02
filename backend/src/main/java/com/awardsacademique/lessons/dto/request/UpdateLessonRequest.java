package com.awardsacademique.lessons.dto.request;

import com.awardsacademique.lessons.entity.LessonTypeEnum;
import com.awardsacademique.lessons.entity.LessonStatusEnum;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateLessonRequest {

    private UUID sectionId;

    @Size(max = 255, message = "Title must not exceed 255 characters")
    @Pattern(regexp = ".*\\S.*", message = "Title must not be blank")
    private String title;

    private String content;

    private LessonTypeEnum lessonType;

    private String videoUrl;

    private Boolean isFreePreview;

    private LessonStatusEnum status;

    @PositiveOrZero(message = "Display order must be zero or positive")
    private Integer displayOrder;

    @PositiveOrZero(message = "Duration in minutes must be zero or positive")
    private Integer durationMinutes;
}
