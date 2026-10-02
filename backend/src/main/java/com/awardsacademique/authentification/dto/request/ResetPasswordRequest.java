package com.awardsacademique.authentification.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ResetPasswordRequest {

    @NotBlank(message = "Le jeton de réinitialisation est obligatoire.")
    private String token;

    @NotBlank(message = "Le nouveau mot de passe est obligatoire.")
    @Size(min = 8, max = 72, message = "Le mot de passe doit contenir entre 8 et 72 caractères.")
    private String newPassword;

    @NotBlank(message = "La confirmation du mot de passe est obligatoire.")
    private String confirmPassword;
}
