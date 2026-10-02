package com.awardsacademique.admin.controller;

import com.awardsacademique.admin.dto.AdminStatsResponse;
import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.entity.InstructorStatusEnum;
import com.awardsacademique.authentification.entity.RoleName;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.payouts.dto.response.RevenueSummaryResponse;
import com.awardsacademique.payouts.service.interfaces.EarningsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
public class AdminStatsController {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final EarningsService earningsService;
    private final AuthorizationService authorizationService;

    @GetMapping
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<AdminStatsResponse> getStats() {
        authorizationService.requireAdministrator();
        long totalStudents = userRepository.countByRole_NameAndDeletedAtIsNull(RoleName.student);
        long totalInstructors = userRepository.countByRole_NameAndDeletedAtIsNull(RoleName.instructor);
        long totalCourses = courseRepository.countByDeletedAtIsNull();
        long activeCourses = courseRepository.countByStatusAndDeletedAtIsNull(CourseStatusEnum.published);
        long pendingCourses = courseRepository.countByStatusAndDeletedAtIsNull(CourseStatusEnum.pending);
        long pendingInstructors = userRepository.countByRole_NameAndInstructorStatusAndDeletedAtIsNull(RoleName.instructor, InstructorStatusEnum.PENDING);
        long totalEnrollments = enrollmentRepository.count();

        List<RevenueSummaryResponse> summaries = earningsService.getRevenueSummary();
        BigDecimal totalRevenue = summaries != null
                ? summaries.stream().map(RevenueSummaryResponse::totalAmount).reduce(BigDecimal.ZERO, BigDecimal::add)
                : BigDecimal.ZERO;

        return ResponseEntity.ok(new AdminStatsResponse(
                totalStudents,
                totalInstructors,
                totalCourses,
                activeCourses,
                pendingCourses,
                pendingInstructors,
                totalEnrollments,
                totalRevenue
        ));
    }
}
