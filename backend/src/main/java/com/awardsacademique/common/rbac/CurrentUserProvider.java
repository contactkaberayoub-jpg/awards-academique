package com.awardsacademique.common.rbac;

import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.entity.RoleName;
import com.awardsacademique.authentification.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Central access to the currently authenticated user for service-layer
 * authorization checks. All feature services should resolve the current user
 * through this provider instead of reading the SecurityContext themselves.
 */
@Component
@RequiredArgsConstructor
public class CurrentUserProvider {

    private static final String ANONYMOUS_PRINCIPAL = "anonymousUser";

    private final UserRepository userRepository;

    public Optional<User> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getPrincipal() == null
                || ANONYMOUS_PRINCIPAL.equals(authentication.getPrincipal())) {
            return Optional.empty();
        }

        String email = authentication.getName();
        return userRepository.findByEmail(email);
    }

    public User requireCurrentUser() {
        return getCurrentUser()
                .orElseThrow(() -> new AuthenticationServiceException("No authenticated user found"));
    }

    public boolean isAdministrator(User user) {
        return user != null && user.getRole() != null && RoleName.administrator == user.getRole().getName();
    }

    public boolean isInstructor(User user) {
        return user != null && user.getRole() != null && RoleName.instructor == user.getRole().getName();
    }
}
