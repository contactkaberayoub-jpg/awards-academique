package com.awardsacademique.authentification.security;

import java.util.List;
import java.util.regex.Pattern;

public final class PublicEndpoints {

    private PublicEndpoints() {}

    public static final List<String> EXACT_OR_PREFIX = List.of(
            "/api/auth/register",
            "/api/auth/register-instructor",
            "/api/auth/login",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/verify-email",
            "/api/auth/resend-verification",
            "/api/auth/google",
            "/api/auth/google/callback",
            "/api/auth/google/exchange",
            "/api/courses/published"
    );

    private static final Pattern UUID_PATTERN =
            Pattern.compile("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");

    public static boolean isPublic(String requestURI, String method) {
        boolean isExactOrPrefix = EXACT_OR_PREFIX.stream()
                .anyMatch(ep -> requestURI.equals(ep) || requestURI.startsWith(ep + "/"));

        if (isExactOrPrefix) return true;

        if ("GET".equalsIgnoreCase(method)) {
            if (requestURI.startsWith("/api/categories")) return true;
            if (requestURI.startsWith("/api/courses/published")) return true;
            if (requestURI.matches("/api/courses/" + UUID_PATTERN.pattern())) return true;
            if (requestURI.startsWith("/api/users/search")) return true;
        }

        return false;
    }
}
