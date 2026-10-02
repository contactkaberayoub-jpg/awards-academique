package com.awardsacademique.progress.Repository;

import com.awardsacademique.progress.entity.LessonProgress;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LessonProgressRepository extends JpaRepository<LessonProgress, UUID> {

    @EntityGraph(value = "LessonProgress.withEnrollmentAndLesson")
    Optional<LessonProgress> findById(UUID id);

    @EntityGraph(value = "LessonProgress.withEnrollmentAndLesson")
    Optional<LessonProgress> findByEnrollmentIdAndLessonId(UUID enrollmentId, UUID lessonId);

    @EntityGraph(value = "LessonProgress.withEnrollmentAndLesson")
    @Query("""
            SELECT p FROM LessonProgress p
            WHERE p.enrollment.user.id = :userId
              AND p.lesson.id = :lessonId
            """)
    Optional<LessonProgress> findByUserIdAndLessonId(
            @Param("userId") UUID userId,
            @Param("lessonId") UUID lessonId
    );

    @EntityGraph(value = "LessonProgress.withEnrollmentAndLesson")
    List<LessonProgress> findByEnrollmentIdOrderByLesson_DisplayOrderAsc(UUID enrollmentId);

    @EntityGraph(value = "LessonProgress.withEnrollment")
    List<LessonProgress> findByLessonId(UUID lessonId);

    @Query("""
            SELECT COUNT(p) FROM LessonProgress p
            WHERE p.enrollment.id = :enrollmentId
              AND p.completed = true
            """)
    long countCompletedByEnrollmentId(@Param("enrollmentId") UUID enrollmentId);

    @Query("""
            SELECT COUNT(l) FROM Lesson l
            WHERE l.section.course.id = (SELECT e.course.id FROM Enrollment e WHERE e.id = :enrollmentId)
              AND l.deletedAt IS NULL
            """)
    long countTotalLessonsByEnrollmentId(@Param("enrollmentId") UUID enrollmentId);

    @Query("""
            SELECT COUNT(DISTINCT p.lesson.id) FROM LessonProgress p
            WHERE p.enrollment.user.id = :userId
              AND p.lesson.section.course.id = :courseId
              AND p.completed = true
            """)
    long countCompletedLessonsForUserOnCourse(
            @Param("userId") UUID userId,
            @Param("courseId") UUID courseId
    );

    @Query("""
            SELECT p.enrollment.user.id, COUNT(DISTINCT p.lesson.id)
            FROM LessonProgress p
            WHERE p.lesson.section.course.id = :courseId
              AND p.completed = true
            GROUP BY p.enrollment.user.id
            """)
    List<Object[]> countCompletedLessonsGroupedByUserOnCourse(@Param("courseId") UUID courseId);
}
