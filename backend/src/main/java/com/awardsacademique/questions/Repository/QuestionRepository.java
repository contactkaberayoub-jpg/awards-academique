package com.awardsacademique.questions.Repository;

import com.awardsacademique.questions.entity.Question;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuestionRepository extends JpaRepository<Question, UUID> {

    @EntityGraph(attributePaths = {"quiz", "quiz.course", "quiz.course.instructor"})
    Optional<Question> findById(UUID id);

    @EntityGraph(attributePaths = {"options"})
    List<Question> findByQuizIdOrderByDisplayOrderAsc(UUID quizId);

    long countByQuizId(UUID quizId);
}
