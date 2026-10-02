package com.awardsacademique.parametres.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateParametreRequest(
        @NotBlank(message = "La valeur du paramètre est obligatoire.")
        String parametreValue,
        String description
) {
}