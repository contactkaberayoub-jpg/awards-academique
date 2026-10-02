package com.awardsacademique.instructorstudent;

import com.awardsacademique.authentification.security.CustomUserDetailsService;
import com.awardsacademique.authentification.security.JwtAuthenticationFilter;
import com.awardsacademique.authentification.security.JwtService;
import com.awardsacademique.authentification.security.PublicEndpoints;
import com.awardsacademique.authentification.security.SecurityConfig;
import com.awardsacademique.authentification.security.TokenBlacklistService;
import com.awardsacademique.instructorstudent.controller.InstructorCourseStudentsController;
import com.awardsacademique.instructorstudent.service.interfaces.InstructorCourseStudentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * RBAC smoke test for the instructor students endpoints: both routes are annotated with
 * {@code @PreAuthorize("hasAnyRole('instructor','administrator')")}. Any request without a
 * valid JWT must be rejected with a 4xx, exactly like the other protected endpoints.
 */
@WebMvcTest(controllers = InstructorCourseStudentsController.class)
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
class InstructorCourseStudentsRbacTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private InstructorCourseStudentService studentService;

    @Test
    void getCourseStudents_returns4xx_whenNoJwt() throws Exception {
        mockMvc.perform(get("/api/instructor/courses/" + UUID.randomUUID() + "/students"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void getCourseStudentDetail_returns4xx_whenNoJwt() throws Exception {
        mockMvc.perform(get("/api/instructor/courses/" + UUID.randomUUID()
                        + "/students/" + UUID.randomUUID()))
                .andExpect(status().is4xxClientError());
    }
}