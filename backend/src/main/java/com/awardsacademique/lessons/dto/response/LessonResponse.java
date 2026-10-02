package com.awardsacademique.lessons.dto.response;

import com.awardsacademique.lessons.entity.LessonTypeEnum;
import com.awardsacademique.lessons.entity.LessonStatusEnum;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonResponse {

    private UUID id;
    private UUID sectionId;
    private String sectionTitle;
    private UUID courseId;
    private String courseTitle;
    private String title;
    private String content;
    private LessonTypeEnum lessonType;
    private String videoUrl;
    @Getter(onMethod_ = @JsonProperty("isFreePreview"))
    private boolean isFreePreview;
    private LessonStatusEnum status;
    private Integer displayOrder;
    private Integer durationMinutes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    /**
     * Whether the current student may open this lesson in sequential order. Always true for
     * privileged viewers (admin/instructor/owner) and ignored when the course has no progression.
     */
    private Boolean unlocked;
    /**
     * The id of the PUBLISHED quiz linked to this lesson (the mandatory gate that must be passed
     * before the NEXT lesson opens), or null when the lesson has no published linked quiz.
     */
    private UUID mandatoryQuizId;
    /**
     * Whether the current student has marked this lesson as completed. Per-user, populated from the
     * existing lesson_progress data; distinct from {@link #unlocked}.
     */
    private Boolean completed;
}
