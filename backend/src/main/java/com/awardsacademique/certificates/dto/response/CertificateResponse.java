package com.awardsacademique.certificates.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Response payload for certificate data.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificateResponse {

    private UUID id;
    private UUID userId;
    private String userName;
    private String userEmail;
    private UUID courseId;
    private String courseTitle;
    private String certificateCode;
    private String fileUrl;
    private OffsetDateTime issuedAt;
    private OffsetDateTime createdAt;
}
