package com.awardsacademique.progress.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateLessonProgressRequest {

    @Builder.Default
    private boolean completed = false;
}
