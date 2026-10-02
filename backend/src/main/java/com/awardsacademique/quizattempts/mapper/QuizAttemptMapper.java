package com.awardsacademique.quizattempts.mapper;

import com.awardsacademique.quizattempts.dto.response.QuizAttemptResponse;
import com.awardsacademique.quizattempts.entity.QuizAttempt;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface QuizAttemptMapper {

    @Mapping(target = "userId", expression = "java(a.getUser() != null ? a.getUser().getId() : null)")
    @Mapping(target = "quizId", expression = "java(a.getQuiz() != null ? a.getQuiz().getId() : null)")
    @Mapping(target = "quizTitle", expression = "java(a.getQuiz() != null ? a.getQuiz().getTitle() : null)")
    @Mapping(target = "courseId", expression = "java(a.getQuiz() != null && a.getQuiz().getCourse() != null ? a.getQuiz().getCourse().getId() : null)")
    @Mapping(target = "lessonId", expression = "java(a.getQuiz() != null && a.getQuiz().getLesson() != null ? a.getQuiz().getLesson().getId() : null)")
    @Mapping(target = "passingScore", expression = "java(a.getQuiz() != null ? a.getQuiz().getPassingScore() : null)")
    @Mapping(target = "maxAttempts", expression = "java(a.getQuiz() != null ? a.getQuiz().getMaxAttempts() : null)")
    @Mapping(target = "status", source = "status")
    @Mapping(target = "passed", ignore = true)
    @Mapping(target = "attemptsUsed", ignore = true)
    @Mapping(target = "startedAt", source = "startedAt", qualifiedByName = "localToOffset")
    @Mapping(target = "submittedAt", source = "submittedAt", qualifiedByName = "localToOffset")
    @Mapping(target = "createdAt", source = "createdAt", qualifiedByName = "localToOffset")
    @Mapping(target = "updatedAt", source = "updatedAt", qualifiedByName = "localToOffset")
    QuizAttemptResponse toResponse(QuizAttempt a);

    @Named("localToOffset")
    default OffsetDateTime localToOffset(LocalDateTime local) {
        return local == null ? null : local.atOffset(ZoneOffset.UTC);
    }
}
