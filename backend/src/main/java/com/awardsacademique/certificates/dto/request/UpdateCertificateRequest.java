package com.awardsacademique.certificates.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Payload for updating a certificate. Only provided fields are changed.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCertificateRequest {

    private String certificateCode;
    private String fileUrl;
}
