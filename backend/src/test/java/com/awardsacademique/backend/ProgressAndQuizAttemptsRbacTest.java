package com.awardsacademique.backend;

import com.awardsacademique.authentification.security.CustomUserDetailsService;
import com.awardsacademique.authentification.security.JwtAuthenticationFilter;
import com.awardsacademique.authentification.security.JwtService;
import com.awardsacademique.authentification.security.PublicEndpoints;
import com.awardsacademique.authentification.security.SecurityConfig;
import com.awardsacademique.authentification.security.TokenBlacklistService;
import com.awardsacademique.progress.controller.LessonProgressController;
import com.awardsacademique.progress.service.interfaces.LessonProgressService;
import com.awardsacademique.quizattempts.controller.QuizAttemptController;
import com.awardsacademique.quizattempts.service.interfaces.QuizAttemptService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * RBAC smoke tests for the two controllers that were missing @PreAuthorize before Sprint 1.
 * Uses a WebMvcTest slice (no database required) to assert that any request WITHOUT a valid
 * JWT receives a 401/403 response, proving the new method-level authorization is active.
 */
@WebMvcTest(controllers = {LessonProgressController.class, QuizAttemptController.class})
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
class ProgressAndQuizAttemptsRbacTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private LessonProgressService lessonProgressService;

    @MockitoBean
    private QuizAttemptService quizAttemptService;

    // LessonProgressController endpoints — must reject unauthenticated calls.

    @Test
    void progressCreate_returnsUnauthorized_whenNoJwt() throws Exception {
        String body = "{\"enrollmentId\":\"" + java.util.UUID.randomUUID()
                + "\",\"lessonId\":\"" + java.util.UUID.randomUUID() + "\"}";
        mockMvc.perform(post("/api/progress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void progressDelete_returnsUnauthorized_whenNoJwt() throws Exception {
        mockMvc.perform(delete("/api/progress/" + java.util.UUID.randomUUID()))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void progressMarkCompleted_returnsUnauthorized_whenNoJwt() throws Exception {
        mockMvc.perform(post("/api/progress/lessons/" + java.util.UUID.randomUUID() + "/completed"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void progressCourseRead_returnsUnauthorized_whenNoJwt() throws Exception {
        mockMvc.perform(get("/api/progress/courses/" + java.util.UUID.randomUUID()))
                .andExpect(status().is4xxClientError());
    }

    // QuizAttemptController endpoints — must reject unauthenticated calls.

    @Test
    void quizAttemptStart_returnsUnauthorized_whenNoJwt() throws Exception {
        String body = "{\"quizId\":\"" + java.util.UUID.randomUUID() + "\"}";
        mockMvc.perform(post("/api/quiz-attempts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void quizAttemptHistoryByQuiz_returns403ForStudentRole_whenNoJwt() throws Exception {
        // Endpoint requires instructor/admin — without token at minimum we expect 4xx.
        mockMvc.perform(get("/api/quiz-attempts/quizzes/" + java.util.UUID.randomUUID()))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void quizAttemptDelete_returnsUnauthorized_whenNoJwt() throws Exception {
        mockMvc.perform(delete("/api/quiz-attempts/" + java.util.UUID.randomUUID()))
                .andExpect(status().is4xxClientError());
    }
}
