package com.awardsacademique.instructorapplication;

import com.awardsacademique.authentification.security.CustomUserDetailsService;
import com.awardsacademique.authentification.security.JwtAuthenticationFilter;
import com.awardsacademique.authentification.security.JwtService;
import com.awardsacademique.authentification.security.PublicEndpoints;
import com.awardsacademique.authentification.security.SecurityConfig;
import com.awardsacademique.authentification.security.TokenBlacklistService;
import com.awardsacademique.instructorapplication.controller.InstructorApplicationAdminController;
import com.awardsacademique.instructorapplication.controller.InstructorApplicationController;
import com.awardsacademique.instructorapplication.service.interfaces.InstructorApplicationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * RBAC smoke tests for the instructor-application workflow: the instructor
 * self-service endpoints require the instructor role and the admin review
 * endpoints require the administrator role. Every call WITHOUT a valid JWT
 * must be rejected with a 4xx, proving the {@code @PreAuthorize} guards are
 * active against anonymous access.
 */
@WebMvcTest(controllers = {InstructorApplicationController.class, InstructorApplicationAdminController.class})
@Import({
        SecurityConfig.class,
        JwtAuthenticationFilter.class,
        JwtService.class,
        TokenBlacklistService.class,
        PublicEndpoints.class
})
@TestPropertySource(properties = {
        "jwt.secret=test-secret-min-256-bit!!abcdefghijklmnopqrstuvwxyz012345",
        "jwt.expiration=3600000",
        "cors.allowed-origins=http://localhost:5173"
})
class InstructorApplicationRbacTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private InstructorApplicationService instructorApplicationService;

    // Self-service endpoints

    @Test
    void getMine_returns4xx_whenNoJwt() throws Exception {
        mockMvc.perform(get("/api/instructor/application/me"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void updateMine_returns4xx_whenNoJwt() throws Exception {
        mockMvc.perform(put("/api/instructor/application/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void resubmit_returns4xx_whenNoJwt() throws Exception {
        mockMvc.perform(post("/api/instructor/application/resubmit"))
                .andExpect(status().is4xxClientError());
    }

    // Admin endpoints

    @Test
    void listAll_returns4xx_whenNoJwt() throws Exception {
        mockMvc.perform(get("/api/admin/instructor-applications"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void approve_returns4xx_whenNoJwt() throws Exception {
        mockMvc.perform(patch("/api/admin/instructor-applications/" + UUID.randomUUID() + "/approve"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void reject_returns4xx_whenNoJwt() throws Exception {
        mockMvc.perform(patch("/api/admin/instructor-applications/" + UUID.randomUUID() + "/reject")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Pièces manquantes\"}"))
                .andExpect(status().is4xxClientError());
    }
}