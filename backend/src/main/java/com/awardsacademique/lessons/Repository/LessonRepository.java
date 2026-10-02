package com.awardsacademique.lessons.Repository;

import com.awardsacademique.lessons.entity.Lesson;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, UUID> {

    @EntityGraph(attributePaths = {"section", "section.course", "section.course.instructor"})
    Optional<Lesson> findByIdAndDeletedAtIsNull(UUID id);

    @EntityGraph(attributePaths = {"section", "section.course"})
    List<Lesson> findByDeletedAtIsNullOrderByDisplayOrderAsc();

    @EntityGraph(attributePaths = {"section", "section.course", "section.course.instructor"})
    java.util.Optional<Lesson> findByVideoUrlAndDeletedAtIsNull(String videoUrl);

    @EntityGraph(attributePaths = {"section", "section.course"})
    List<Lesson> findBySectionIdAndDeletedAtIsNullOrderByDisplayOrderAsc(UUID sectionId);

    @EntityGraph(attributePaths = {"section", "section.course"})
    List<Lesson> findBySectionCourseIdAndDeletedAtIsNull(UUID courseId);

    @EntityGraph(attributePaths = {"section", "section.course"})
    @Query("""
            SELECT lesson FROM Lesson lesson
            WHERE lesson.deletedAt IS NULL
              AND (:courseId IS NULL OR lesson.section.course.id = :courseId)
              AND (:sectionId IS NULL OR lesson.section.id = :sectionId)
              AND (:status IS NULL OR lesson.status = :status)
              AND (:search IS NULL OR LOWER(lesson.title) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:instructorId IS NULL OR lesson.section.course.instructor.id = :instructorId)
              AND (:publishedOnly = false OR lesson.status = 'published')
            """)
    Page<Lesson> findPage(
            @Param("courseId") UUID courseId,
            @Param("sectionId") UUID sectionId,
            @Param("status") com.awardsacademique.lessons.entity.LessonStatusEnum status,
            @Param("search") String search,
            Pageable pageable,
            @Param("instructorId") UUID instructorId,
            @Param("publishedOnly") boolean publishedOnly
    );

    @EntityGraph(attributePaths = {"section", "section.course"})
    @Query("""
            SELECT lesson FROM Lesson lesson
            WHERE lesson.deletedAt IS NULL
              AND (:instructorId IS NULL OR lesson.section.course.instructor.id = :instructorId)
              AND (:publishedOnly = false OR lesson.status = 'published')
            """)
    List<Lesson> findAllScoped(
            @Param("instructorId") UUID instructorId,
            @Param("publishedOnly") boolean publishedOnly
    );
}
