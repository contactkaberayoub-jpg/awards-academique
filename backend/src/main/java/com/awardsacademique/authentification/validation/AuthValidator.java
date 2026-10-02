package com.awardsacademique.authentification.validation;

import com.awardsacademique.authentification.Repository.RoleRepository;
import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.dto.request.ChangePasswordRequest;
import com.awardsacademique.authentification.dto.request.RegisterRequest;
import com.awardsacademique.authentification.entity.Role;
import com.awardsacademique.authentification.entity.RoleName;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.exception.DuplicateEmailException;
import com.awardsacademique.authentification.exception.UserNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuthValidator {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public User resolveUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(email));
    }

    public Role resolveDefaultStudentRole() {
        return roleRepository.findByName(RoleName.student)
                .orElseThrow(() -> new IllegalStateException("Default role STUDENT is not configured in the database"));
    }

    public Role resolveInstructorRole() {
        return roleRepository.findByName(RoleName.instructor)
                .orElseThrow(() -> new IllegalStateException("INSTRUCTOR role is not configured in the database"));
    }

    public void validateRegister(RegisterRequest request) {
        //#region debug-point auth-validator-validateRegister
        log.info("[DEBUG request-failed-500] AuthValidator.validateRegister triggered for email={}", request.getEmail());
        //#endregion
        ensureEmailNotAlreadyRegistered(request.getEmail());
        ensurePasswordDistinctFromEmail(request.getPassword(), request.getEmail());
        ensureTrimmedNotBlank("firstName", request.getFirstName());
        ensureTrimmedNotBlank("lastName", request.getLastName());
    }

    public void ensureEmailNotAlreadyRegistered(String email) {
        if (userRepository.existsByEmail(email)) {
            //#region debug-point auth-validator-duplicate-email
            log.warn("[DEBUG request-failed-500] AuthValidator.ensureEmailNotAlreadyRegistered throwing DuplicateEmailException for email={}", email);
            //#endregion
            throw new DuplicateEmailException(email);
        }
    }

    public void validateChangePassword(String currentPasswordHash,
                                       boolean passwordEncoderMatchesCurrent,
                                       boolean passwordEncoderMatchesNew) {
        if (currentPasswordHash == null || !passwordEncoderMatchesCurrent) {
            throw new org.springframework.security.authentication.BadCredentialsException("Current password is incorrect");
        }
        if (passwordEncoderMatchesNew) {
            throw new IllegalArgumentException("New password must be different from the current password");
        }
    }

    private static void ensurePasswordDistinctFromEmail(String password, String email) {
        if (password == null || email == null) return;
        if (password.equalsIgnoreCase(email)) {
            throw new IllegalArgumentException("Password must not be the same as your email");
        }
    }

    private static void ensureTrimmedNotBlank(String field, String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
    }
}
