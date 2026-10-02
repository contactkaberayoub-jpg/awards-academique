package com.awardsacademique.authentification.dto.request;

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
public class UpdateInstructorApplicationRequest {

    private String professionalTitle;

    private String institution;

    private String expertise;

    private String linkedinUrl;
}
