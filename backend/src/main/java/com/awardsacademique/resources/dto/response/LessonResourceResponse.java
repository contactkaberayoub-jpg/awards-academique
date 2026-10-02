package com.awardsacademique.resources.dto.response;

import com.awardsacademique.resources.entity.LessonResourceTypeEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response payload for lesson resource data.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonResourceResponse {

    private UUID id;
    private UUID lessonId;
    private String lessonTitle;
    private UUID courseId;
    private String courseTitle;
    private String title;
    private LessonResourceTypeEnum resourceType;
    private String fileUrl;
    private Long fileSizeBytes;
    private OffsetDateTime createdAt;
}
