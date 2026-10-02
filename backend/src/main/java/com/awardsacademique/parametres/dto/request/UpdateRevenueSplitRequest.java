package com.awardsacademique.parametres.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Atomic update of the full revenue split. Both halves of the split are sent in
 * one request so the service can persist them in a single database statement —
 * never one percentage at a time.
 */
public record UpdateRevenueSplitRequest(
        @NotNull(message = "Le pourcentage plateforme est obligatoire.")
        @DecimalMin(value = "0", message = "Le pourcentage plateforme doit être positif ou nul.")
        @DecimalMax(value = "100", message = "Le pourcentage plateforme doit être inférieur ou égal à 100.")
        BigDecimal platformPercentage,

        @NotNull(message = "Le pourcentage instructeur est obligatoire.")
        @DecimalMin(value = "0", message = "Le pourcentage instructeur doit être positif ou nul.")
        @DecimalMax(value = "100", message = "Le pourcentage instructeur doit être inférieur ou égal à 100.")
        BigDecimal instructorPercentage
) {
}