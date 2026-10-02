package com.awardsacademique.authentification.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

/**
 * Response payload returned after successful authentication or registration.
 */
@Getter
@Setter
@Builder
@AllArgsConstructor
public class AuthResponse {

    private String token;

    @Builder.Default
    private String tokenType = "Bearer";

    private UUID userId;

    private String firstName;

    private String lastName;

    private String email;

    private String role;

    private String instructorStatus;

    private Boolean emailVerified;

    private String oauthProvider;

    public AuthResponse() {
        this.tokenType = "Bearer";
    }
}