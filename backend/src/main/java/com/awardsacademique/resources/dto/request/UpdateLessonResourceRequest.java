package com.awardsacademique.resources.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Payload for updating a lesson resource.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateLessonResourceRequest {

    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    private String url;
}
