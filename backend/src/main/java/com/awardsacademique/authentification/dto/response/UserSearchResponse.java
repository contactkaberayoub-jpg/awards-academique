package com.awardsacademique.authentification.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Response payload for user search results.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSearchResponse {

    private UUID id;
    private String firstName;
    private String lastName;
    private String avatarUrl;
}
