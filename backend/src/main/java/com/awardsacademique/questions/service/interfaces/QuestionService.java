package com.awardsacademique.questions.service.interfaces;

import com.awardsacademique.questions.dto.request.CreateQuestionRequest;
import com.awardsacademique.questions.dto.request.UpdateQuestionRequest;
import com.awardsacademique.questions.dto.response.QuestionResponse;

import java.util.List;
import java.util.UUID;

public interface QuestionService {

    QuestionResponse create(UUID quizId, CreateQuestionRequest request);

    List<QuestionResponse> getByQuiz(UUID quizId);

    QuestionResponse update(UUID id, UpdateQuestionRequest request);

    void delete(UUID id);
}
