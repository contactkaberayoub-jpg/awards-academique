package com.awardsacademique.sections.dto.request;

import jakarta.validation.constraints.Pattern;
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
public class UpdateSectionRequest {

    @Size(max = 255, message = "Title must not exceed 255 characters")
    @Pattern(regexp = ".*\\S.*", message = "Title must not be blank")
    private String title;

    private Integer displayOrder;
}