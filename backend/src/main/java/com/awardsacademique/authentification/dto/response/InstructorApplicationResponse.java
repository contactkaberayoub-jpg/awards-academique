package com.awardsacademique.authentification.dto.response;

import com.awardsacademique.authentification.entity.InstructorStatusEnum;
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
public class InstructorApplicationResponse {

    private UUID userId;
    private String firstName;
    private String lastName;
    private String email;
    private InstructorStatusEnum status;
    private String rejectionReason;
    private String professionalTitle;
    private String institution;
    private String expertise;
    private String linkedinUrl;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
}
