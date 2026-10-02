package com.awardsacademique.reviews.Repository;

import com.awardsacademique.reviews.entity.Review;
import com.awardsacademique.reviews.entity.ReviewStatusEnum;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {

    @EntityGraph(attributePaths = {"user", "course"})
    Optional<Review> findById(UUID id);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Review> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Review> findByCourseIdOrderByCreatedAtDesc(UUID courseId);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Review> findByCourseIdInOrderByCreatedAtDesc(Collection<UUID> courseIds);

    @EntityGraph(attributePaths = {"user", "course"})
    List<Review> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"user", "course"})
    List<Review> findByCourseIdAndStatus(UUID courseId, ReviewStatusEnum status);

    boolean existsByUserIdAndCourseId(UUID userId, UUID courseId);
}
