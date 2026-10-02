package com.awardsacademique.questions.Repository;

import com.awardsacademique.questions.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface QuestionOptionRepository extends JpaRepository<QuestionOption, UUID> {

    @Modifying
    @Query("DELETE FROM QuestionOption o WHERE o.question.id = :questionId")
    void deleteByQuestionId(@Param("questionId") UUID questionId);
}
