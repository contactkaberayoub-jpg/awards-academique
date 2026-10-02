package com.awardsacademique.enrollments.Repository;

import com.awardsacademique.enrollments.entity.Enrollment;
import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {

    @EntityGraph(attributePaths = {"user", "course", "course.instructor"})
    Optional<Enrollment> findById(UUID id);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Enrollment> findByUserIdOrderByEnrolledAtDesc(UUID userId);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Enrollment> findByCourseIdOrderByEnrolledAtDesc(UUID courseId);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Enrollment> findByCourseIdInOrderByEnrolledAtDesc(Collection<UUID> courseIds);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Enrollment> findByUserIdAndCourseIdInOrderByEnrolledAtDesc(
            UUID userId, Collection<UUID> courseIds);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Enrollment> findAllByOrderByEnrolledAtDesc();

    Optional<Enrollment> findByUserIdAndCourseId(UUID userId, UUID courseId);

    long countByCourseId(UUID courseId);

    boolean existsByUserIdAndCourseId(UUID userId, UUID courseId);

    long countByCourseIdAndStatus(UUID courseId, EnrollmentStatusEnum status);
}
