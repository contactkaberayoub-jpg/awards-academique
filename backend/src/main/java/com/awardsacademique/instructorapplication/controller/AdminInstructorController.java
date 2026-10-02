package com.awardsacademique.instructorapplication.controller;

import com.awardsacademique.authentification.dto.response.AdminInstructorDetailResponse;
import com.awardsacademique.authentification.dto.response.AdminInstructorResponse;
import com.awardsacademique.authentification.entity.InstructorStatusEnum;
import com.awardsacademique.authentification.entity.RoleName;
import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.authentification.Repository.UserRepository;
import com.awardsacademique.authentification.exception.UserNotFoundException;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.dto.response.CourseResponse;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.mapper.CourseMapper;
import com.awardsacademique.payouts.dto.response.AdminInstructorEarningsResponse;
import com.awardsacademique.payouts.service.interfaces.EarningsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/instructors")
@RequiredArgsConstructor
public class AdminInstructorController {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EarningsService earningsService;
    private final CourseMapper courseMapper;
    private final AuthorizationService authorizationService;

    private static final String UUID_ID = "/{id:[0-9a-fA-F\\-]{36}}";

    @GetMapping
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<List<AdminInstructorResponse>> listInstructors(
            @RequestParam(required = false) InstructorStatusEnum status,
            @RequestParam(required = false) String q
    ) {
        authorizationService.requireAdministrator();
        List<User> users = userRepository.findByRole_NameAndDeletedAtIsNull(RoleName.instructor);

        List<AdminInstructorResponse> responses = users.stream()
                .filter(u -> status == null || u.getInstructorStatus() == status)
                .filter(u -> {
                    if (q == null || q.isBlank()) return true;
                    String term = q.trim().toLowerCase();
                    String fullName = (u.getFirstName() + " " + u.getLastName()).toLowerCase();
                    return fullName.contains(term) || u.getEmail().toLowerCase().contains(term);
                })
                .map(this::toAdminInstructorResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    @GetMapping(UUID_ID)
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<AdminInstructorDetailResponse> getInstructorDetail(@PathVariable UUID id) {
        authorizationService.requireAdministrator();
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(id.toString()));
        if (user.getRole() == null || user.getRole().getName() != RoleName.instructor) {
            throw new IllegalArgumentException("User is not an instructor");
        }
        return ResponseEntity.ok(toAdminInstructorDetailResponse(user));
    }

    @GetMapping(UUID_ID + "/courses")
    @PreAuthorize("hasRole('administrator')")
    public ResponseEntity<List<CourseResponse>> getInstructorCourses(@PathVariable UUID id) {
        authorizationService.requireAdministrator();
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(id.toString()));
        if (user.getRole() == null || user.getRole().getName() != RoleName.instructor) {
            throw new IllegalArgumentException("User is not an instructor");
        }
        List<Course> courses = courseRepository.findByInstructorIdAndDeletedAtIsNullAndIsActiveTrueOrderByCreatedAtDesc(id);
        List<CourseResponse> dtos = courses.stream()
                .map(courseMapper::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    private AdminInstructorResponse toAdminInstructorResponse(User user) {
        List<Course> courses = courseRepository.findByInstructorIdAndDeletedAtIsNullAndIsActiveTrueOrderByCreatedAtDesc(user.getId());
        long courseCount = courses.size();
        long totalStudents = courses.stream().mapToInt(Course::getEnrollmentsCount).sum();
        
        List<AdminInstructorEarningsResponse> earnings = earningsService.getAdminInstructorEarnings(user.getId());
        BigDecimal totalRevenue = earnings.stream()
                .map(AdminInstructorEarningsResponse::grossRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return AdminInstructorResponse.builder()
                .userId(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .status(user.getInstructorStatus())
                .professionalTitle(user.getProfessionalTitle())
                .institution(user.getInstitution())
                .courseCount(courseCount)
                .totalStudents(totalStudents)
                .totalRevenue(totalRevenue)
                .createdAt(user.getCreatedAt())
                .submittedAt(user.getInstructorSubmittedAt())
                .build();
    }

    private AdminInstructorDetailResponse toAdminInstructorDetailResponse(User user) {
        List<Course> courses = courseRepository.findByInstructorIdAndDeletedAtIsNullAndIsActiveTrueOrderByCreatedAtDesc(user.getId());
        long courseCount = courses.size();
        long totalStudents = courses.stream().mapToInt(Course::getEnrollmentsCount).sum();

        List<AdminInstructorEarningsResponse> earnings = earningsService.getAdminInstructorEarnings(user.getId());
        BigDecimal totalRevenue = earnings.stream()
                .map(AdminInstructorEarningsResponse::grossRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return AdminInstructorDetailResponse.builder()
                .userId(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .status(user.getInstructorStatus())
                .rejectionReason(user.getInstructorRejectionReason())
                .professionalTitle(user.getProfessionalTitle())
                .institution(user.getInstitution())
                .expertise(user.getExpertise())
                .linkedinUrl(user.getLinkedinUrl())
                .courseCount(courseCount)
                .totalStudents(totalStudents)
                .totalRevenue(totalRevenue)
                .createdAt(user.getCreatedAt())
                .submittedAt(user.getInstructorSubmittedAt())
                .reviewedAt(user.getInstructorReviewedAt())
                .build();
    }
}
