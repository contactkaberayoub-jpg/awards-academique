package com.awardsacademique.authentification.security;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Loads user-specific data for Spring Security authentication,
 * backed by {@link UserRepository}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private static final String ROLE_PREFIX = "ROLE_";

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("No user found with email: {}", email);
                    return new UsernameNotFoundException("No user found with email: " + email);
                });

        if (user.getPasswordHash() == null) {
            log.error("User has no password hash: {}", email);
            throw new DisabledException("This account does not have a password. Please use OAuth login.");
        }

        List<GrantedAuthority> authorities = buildAuthorities(user);

        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .authorities(authorities)
                .accountLocked(!user.isActive())
                .disabled(user.getDeletedAt() != null)
                .build();

        return userDetails;
    }

    private List<GrantedAuthority> buildAuthorities(User user) {
        String roleName = ROLE_PREFIX + user.getRole().getName();
        return List.of(new SimpleGrantedAuthority(roleName));
    }
}