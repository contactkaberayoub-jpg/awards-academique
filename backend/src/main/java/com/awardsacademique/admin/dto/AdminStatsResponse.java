package com.awardsacademique.admin.dto;

import java.math.BigDecimal;

public record AdminStatsResponse(
    long totalStudents,
    long totalInstructors,
    long totalCourses,
    long activeCourses,
    long pendingCourses,
    long pendingInstructorApplications,
    long totalEnrollments,
    BigDecimal totalRevenue
) {}
