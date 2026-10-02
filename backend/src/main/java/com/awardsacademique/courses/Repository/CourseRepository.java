package com.awardsacademique.courses.Repository;

import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseLevelEnum;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseRepository extends JpaRepository<Course, UUID>, JpaSpecificationExecutor<Course> {

    @EntityGraph(attributePaths = {"instructor", "category"})
    Optional<Course> findByIdAndDeletedAtIsNull(UUID id);

    @EntityGraph(attributePaths = {"instructor", "category"})
    List<Course> findByIsActiveTrueAndDeletedAtIsNullOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"instructor", "category"})
    List<Course> findByIsActiveTrueAndDeletedAtIsNullAndStatusOrderByCreatedAtDesc(CourseStatusEnum status);

    @EntityGraph(attributePaths = {"instructor", "category"})
    List<Course> findByInstructorIdAndDeletedAtIsNullAndIsActiveTrueOrderByCreatedAtDesc(UUID instructorId);

    long countByDeletedAtIsNull();

    long countByStatusAndDeletedAtIsNull(CourseStatusEnum status);

    boolean existsByCategoryId(UUID categoryId);

    @EntityGraph(attributePaths = {"instructor", "category"})
    @Query("""
            SELECT course FROM Course course
            WHERE course.deletedAt IS NULL
              AND course.isActive = true
              AND course.status = :status
              AND (:title IS NULL OR LOWER(course.title) LIKE :title)
              AND (:categoryId IS NULL OR course.category.id = :categoryId)
              AND (:level IS NULL OR course.level = :level)
              AND (:minPrice IS NULL OR course.price >= :minPrice)
              AND (:maxPrice IS NULL OR course.price <= :maxPrice)
              AND (:isFree IS NULL OR course.isFree = :isFree)
            """)
    Page<Course> findSearch(
            @Param("title") String title,
            @Param("categoryId") UUID categoryId,
            @Param("level") CourseLevelEnum level,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("isFree") Boolean isFree,
            @Param("status") CourseStatusEnum status,
            Pageable pageable
    );
}
