package com.awardsacademique.quizzes.Repository;

import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, UUID> {

    @EntityGraph(attributePaths = {"course", "course.instructor", "lesson"})
    Optional<Quiz> findById(UUID id);

    @EntityGraph(attributePaths = {"course", "lesson"})
    List<Quiz> findByCourseIdOrderByCreatedAtDesc(UUID courseId);

    @EntityGraph(attributePaths = {"course", "lesson"})
    List<Quiz> findByCourseIdInOrderByCreatedAtDesc(Collection<UUID> courseIds);

    boolean existsByLessonIdAndStatus(UUID lessonId, QuizStatusEnum status);

    /** True when the course already owns a course-level (lesson_id IS NULL) quiz. */
    boolean existsByCourseIdAndLessonIsNull(UUID courseId);

    @EntityGraph(attributePaths = {"lesson", "course"})
    Optional<Quiz> findByLessonId(UUID lessonId);
}
