package com.awardsacademique.questions.mapper;

import com.awardsacademique.questions.dto.response.QuestionOptionResponse;
import com.awardsacademique.questions.dto.response.QuestionResponse;
import com.awardsacademique.questions.entity.Question;
import com.awardsacademique.questions.entity.QuestionOption;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

/**
 * Mapper for converting between Question entities and DTOs.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface QuestionMapper {

    @Mapping(target = "quizId", source = "quiz.id")
    QuestionResponse toResponse(Question question);

    QuestionOptionResponse toOptionResponse(QuestionOption option);
}
