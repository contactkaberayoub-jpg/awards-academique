package com.awardsacademique.enrollments.service.interfaces;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.enrollments.dto.request.CreateEnrollmentRequest;
import com.awardsacademique.enrollments.dto.request.UpdateEnrollmentRequest;
import com.awardsacademique.enrollments.dto.response.EnrollmentResponse;

import java.util.List;
import java.util.UUID;

public interface EnrollmentService {

    EnrollmentResponse enroll(CreateEnrollmentRequest request);

    EnrollmentResponse enrollAs(UUID userId, CreateEnrollmentRequest request);

    /**
     * Creates an ACTIVE enrollment for a course that has just been paid for via its order.
     *
     * <p>Sprinter 3 payment gateway: the caller (OrderServiceImpl.pay) MUST have already
     * validated ownership, that the course is still published+active, and that the order is
     * PENDING — the price paywall in {@link com.awardsacademique.enrollments.validation.EnrollmentValidator#validateEnrollable}
     * is intentionally bypassed here because payment has been processed. The already-enrolled
     * guard is still applied so a paid order cannot grant a duplicate enrollment.
     */
    EnrollmentResponse enrollFromPaidOrder(User student, Course course);

    List<EnrollmentResponse> getMine();

    List<EnrollmentResponse> getByCourse(UUID courseId);

    List<EnrollmentResponse> getAll();

    EnrollmentResponse update(UUID id, UpdateEnrollmentRequest request);

    void delete(UUID id);
}

