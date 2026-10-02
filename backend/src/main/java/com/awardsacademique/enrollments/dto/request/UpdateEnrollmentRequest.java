package com.awardsacademique.enrollments.dto.request;

import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Payload for updating an enrollment (status / completion progress).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEnrollmentRequest {

    private EnrollmentStatusEnum status;

    @DecimalMin(value = "0.0", message = "Completion percentage must be between 0 and 100")
    @DecimalMax(value = "100.0", message = "Completion percentage must be between 0 and 100")
    private BigDecimal completionPercentage;
}
