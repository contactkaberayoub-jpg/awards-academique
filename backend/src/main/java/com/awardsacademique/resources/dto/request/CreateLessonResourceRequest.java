package com.awardsacademique.resources.dto.request;

import com.awardsacademique.resources.entity.LessonResourceTypeEnum;
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
 * Payload for creating a lesson resource from a link or a known URL.
 * For file uploads use the multipart endpoint instead.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateLessonResourceRequest {

    @NotNull(message = "Lesson ID is required")
    private UUID lessonId;

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @NotNull(message = "Resource type is required")
    private LessonResourceTypeEnum resourceType;

    @NotBlank(message = "URL is required")
    private String url;
}
