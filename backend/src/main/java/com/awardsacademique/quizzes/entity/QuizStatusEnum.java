package com.awardsacademique.quizzes.entity;

/**
 * Lifecycle states for a quiz.
 * Values must match the PostgreSQL enum {@code quiz_status_enum}.
 */
public enum QuizStatusEnum {
    draft,
    published,
    archived
}
