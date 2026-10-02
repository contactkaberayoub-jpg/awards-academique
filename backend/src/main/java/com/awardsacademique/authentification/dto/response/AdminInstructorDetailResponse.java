package com.awardsacademique.authentification.dto.response;

import com.awardsacademique.authentification.entity.InstructorStatusEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminInstructorDetailResponse {
    private UUID userId;
    private String firstName;
    private String lastName;
    private String email;
    private String avatarUrl;
    private String bio;
    private InstructorStatusEnum status;
    private String rejectionReason;
    private String professionalTitle;
    private String institution;
    private String expertise;
    private String linkedinUrl;
    private long courseCount;
    private long totalStudents;
    private BigDecimal totalRevenue;
    private LocalDateTime createdAt;
    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
}
