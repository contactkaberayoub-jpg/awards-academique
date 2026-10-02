package com.awardsacademique.quizzes.service.interfaces;

import com.awardsacademique.quizzes.dto.request.CreateQuizRequest;
import com.awardsacademique.quizzes.dto.request.UpdateQuizRequest;
import com.awardsacademique.quizzes.dto.response.QuizResponse;

import java.util.List;
import java.util.UUID;

public interface QuizService {

    QuizResponse create(CreateQuizRequest request);

    QuizResponse update(UUID id, UpdateQuizRequest request);

    QuizResponse getById(UUID id);

    List<QuizResponse> getByCourse(UUID courseId);

    List<QuizResponse> getAll();

    QuizResponse publish(UUID id);

    QuizResponse archive(UUID id);

    void delete(UUID id);
}
