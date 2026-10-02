package com.awardsacademique.quizattempts.service.interfaces;

import com.awardsacademique.quizattempts.dto.request.CreateQuizAttemptRequest;
import com.awardsacademique.quizattempts.dto.request.UpdateQuizAttemptRequest;
import com.awardsacademique.quizattempts.dto.response.QuizAttemptResponse;
import com.awardsacademique.quizattempts.dto.response.StudentQuizContentResponse;

import java.util.List;
import java.util.UUID;

public interface QuizAttemptService {

    QuizAttemptResponse start(CreateQuizAttemptRequest request);

    QuizAttemptResponse submit(UUID attemptId, UpdateQuizAttemptRequest request);

    QuizAttemptResponse getById(UUID id);

    List<QuizAttemptResponse> getMyHistory();

    List<QuizAttemptResponse> getMyHistoryByQuiz(UUID quizId);

    List<QuizAttemptResponse> getHistoryByQuiz(UUID quizId);

    QuizAttemptResponse getBestForQuiz(UUID quizId);

    StudentQuizContentResponse getStudentQuizContent(UUID quizId);

    void delete(UUID id);
}
