package com.awardsacademique.certificates.Repository;

import com.awardsacademique.certificates.entity.Certificate;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CertificateRepository extends JpaRepository<Certificate, UUID> {

    @EntityGraph(attributePaths = {"user", "course"})
    Optional<Certificate> findById(UUID id);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Certificate> findByUserIdOrderByIssuedAtDesc(UUID userId);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Certificate> findByCourseIdOrderByIssuedAtDesc(UUID courseId);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Certificate> findByCourseIdInOrderByIssuedAtDesc(Collection<UUID> courseIds);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Certificate> findAllByOrderByIssuedAtDesc();

    @EntityGraph(attributePaths = {"user", "course"})
    Optional<Certificate> findByCertificateCode(String certificateCode);

    boolean existsByUserIdAndCourseId(UUID userId, UUID courseId);

    @EntityGraph(attributePaths = {"user", "course"})
    Optional<Certificate> findByUserIdAndCourseId(UUID userId, UUID courseId);
}
