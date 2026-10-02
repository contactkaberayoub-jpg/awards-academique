package com.awardsacademique.authentification.service.impl;

import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.dto.response.UserSearchResponse;
import com.awardsacademique.authentification.entity.RoleName;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.service.interfaces.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    @Override
    public List<UserSearchResponse> search(String q, String role) {
        RoleName roleName = null;
        if (role != null && !role.isBlank()) {
            try {
                roleName = RoleName.valueOf(role.trim().toLowerCase());
            } catch (IllegalArgumentException ignored) {
                // invalid role value — return empty
                return List.of();
            }
        }

        String searchTerm = (q != null && !q.isBlank()) ? q.trim() : null;
        String roleNameValue = roleName != null ? roleName.name() : null;

        return userRepository.searchByName(searchTerm, roleNameValue).stream()
                .map(this::toResponse)
                .toList();
    }

    private UserSearchResponse toResponse(User user) {
        return UserSearchResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }
}
