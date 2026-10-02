package com.awardsacademique.instructorstudent.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * Certificate state for a student on a given course. Always reads the stored certificate row;
 * when absent the UI shows "not issued".
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentCertificateResponse {

    private String certificateCode;
    private OffsetDateTime issuedAt;
}