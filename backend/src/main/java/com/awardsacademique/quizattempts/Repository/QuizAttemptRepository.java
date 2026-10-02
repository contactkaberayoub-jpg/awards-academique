package com.awardsacademique.quizattempts.Repository;

import com.awardsacademique.quizattempts.entity.AttemptStatusEnum;
import com.awardsacademique.quizattempts.entity.QuizAttempt;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {

    @EntityGraph(value = "QuizAttempt.withUserAndQuiz")
    Optional<QuizAttempt> findById(UUID id);

    @EntityGraph(value = "QuizAttempt.withUserAndQuiz")
    Optional<QuizAttempt> findByUserIdAndQuizIdAndStatus(
            UUID userId, UUID quizId, AttemptStatusEnum status
    );

    @EntityGraph(value = "QuizAttempt.withUserAndQuiz")
    List<QuizAttempt> findByUserIdOrderByStartedAtDesc(UUID userId);

    @EntityGraph(value = "QuizAttempt.withUserAndQuiz")
    List<QuizAttempt> findByQuizIdOrderByStartedAtDesc(UUID quizId);

    @EntityGraph(value = "QuizAttempt.withUserAndQuiz")
    List<QuizAttempt> findByUserIdAndQuizIdOrderByStartedAtDesc(UUID userId, UUID quizId);

    long countByUserIdAndQuizId(UUID userId, UUID quizId);

    @Query("""
            SELECT COALESCE(MAX(a.score), 0) FROM QuizAttempt a
            WHERE a.user.id = :userId
              AND a.quiz.id = :quizId
              AND a.status = 'passed'
            """)
    java.math.BigDecimal findBestScoreForUserOnQuiz(
            @Param("userId") UUID userId,
            @Param("quizId") UUID quizId
    );

    @EntityGraph(value = "QuizAttempt.withUserAndQuiz")
    @Query("""
            SELECT a FROM QuizAttempt a
            WHERE a.user.id = :userId
              AND a.quiz.id = :quizId
              AND a.status = 'passed'
            ORDER BY a.score DESC, a.startedAt DESC
            LIMIT 1
            """)
    Optional<QuizAttempt> findBestAttemptForUserOnQuiz(
            @Param("userId") UUID userId,
            @Param("quizId") UUID quizId
    );

    default boolean hasInProgressAttempt(UUID userId, UUID quizId) {
        return findByUserIdAndQuizIdAndStatus(userId, quizId, AttemptStatusEnum.in_progress)
                .isPresent();
    }

    @Query("""
            SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END
            FROM QuizAttempt a
            WHERE a.user.id = :userId
              AND a.quiz.id = :quizId
              AND a.status = 'passed'
              AND a.score >= COALESCE(a.quiz.passingScore, 0)
            """)
    boolean existsPassedAttemptForUserOnQuiz(
            @Param("userId") UUID userId,
            @Param("quizId") UUID quizId
    );

    @Query("""
            SELECT a.user.id, COUNT(DISTINCT a.quiz.id)
            FROM QuizAttempt a
            WHERE a.quiz.course.id = :courseId
              AND a.quiz.lesson IS NOT NULL
              AND a.quiz.status = 'published'
              AND a.status = 'passed'
            GROUP BY a.user.id
            """)
    List<Object[]> countPassedLessonQuizzesGroupedByUser(@Param("courseId") UUID courseId);

    @Query("""
            SELECT a.quiz.id FROM QuizAttempt a
            WHERE a.user.id = :userId
              AND a.quiz.course.id = :courseId
              AND a.quiz.lesson IS NOT NULL
              AND a.quiz.status = 'published'
              AND a.status = 'passed'
            """)
    List<UUID> findPassedLessonQuizIdsByUserOnCourse(
            @Param("userId") UUID userId,
            @Param("courseId") UUID courseId
    );
}
