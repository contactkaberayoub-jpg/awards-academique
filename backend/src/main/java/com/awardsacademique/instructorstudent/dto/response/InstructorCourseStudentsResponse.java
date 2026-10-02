package com.awardsacademique.instructorstudent.dto.response;

import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

/**
 * Aggregated course-level (final exam) quiz data for every enrolled student of a course.
 * Passing grade comes from the stored quiz config, attempt data from the stored attempts.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstructorCourseStudentsResponse {

    private UUID courseId;
    private String courseTitle;
    private long totalStudents;

    /** The single course-level quiz (lesson_id IS NULL) of the course, if any. */
    private QuizInfo finalQuiz;

    private List<InstructorCourseStudentResponse> students;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizInfo {
        private UUID id;
        private String title;
        private Integer passingScore;
        private Integer maxAttempts;
        private QuizStatusEnum status;
    }
}