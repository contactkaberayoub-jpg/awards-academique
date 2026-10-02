package com.awardsacademique.certificates.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Payload for manually issuing a certificate to a student for a course.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCertificateRequest {

    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotNull(message = "Course ID is required")
    private UUID courseId;

    private String fileUrl;
}
