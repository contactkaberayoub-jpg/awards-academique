package com.awardsacademique.progress.entity;

import com.awardsacademique.enrollments.entity.Enrollment;
import com.awardsacademique.lessons.entity.Lesson;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.NamedAttributeNode;
import jakarta.persistence.NamedEntityGraph;
import jakarta.persistence.NamedEntityGraphs;
import jakarta.persistence.NamedSubgraph;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tracks a user's progress on a single lesson, scoped by the enrollment
 * (keeps progression tied to the actual course registration).
 * <p>
 * Maps to the existing Supabase {@code public.lesson_progress} table which
 * uses an FK to {@code enrollments} and a boolean {@code is_completed}.
 */
@Entity
@Table(name = "lesson_progress", uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_lesson_progress_enrollment_lesson",
                columnNames = {"enrollment_id", "lesson_id"}
        )
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"enrollment", "lesson"})
@NamedEntityGraphs({
        @NamedEntityGraph(
                name = "LessonProgress.withEnrollmentAndLesson",
                attributeNodes = {
                        @NamedAttributeNode(value = "enrollment", subgraph = "enrollment.userAndCourse"),
                        @NamedAttributeNode(value = "lesson", subgraph = "lesson.section")
                },
                subgraphs = {
                        @NamedSubgraph(
                                name = "enrollment.userAndCourse",
                                type = Enrollment.class,
                                attributeNodes = {
                                        @NamedAttributeNode("user"),
                                        @NamedAttributeNode("course")
                                }
                        ),
                        @NamedSubgraph(
                                name = "lesson.section",
                                type = Lesson.class,
                                attributeNodes = @NamedAttributeNode(value = "section", subgraph = "section.course")
                        ),
                        @NamedSubgraph(
                                name = "section.course",
                                type = com.awardsacademique.sections.entity.Section.class,
                                attributeNodes = @NamedAttributeNode("course")
                        )
                }
        ),
        @NamedEntityGraph(
                name = "LessonProgress.withEnrollment",
                attributeNodes = @NamedAttributeNode(value = "enrollment", subgraph = "enrollment.course"),
                subgraphs = {
                        @NamedSubgraph(
                                name = "enrollment.course",
                                type = Enrollment.class,
                                attributeNodes = {
                                        @NamedAttributeNode("course"),
                                        @NamedAttributeNode("user")
                                }
                        )
                }
        )
})
public class LessonProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private Enrollment enrollment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @Column(name = "is_completed", nullable = false)
    @Builder.Default
    private boolean completed = false;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.completed && this.completedAt == null) {
            this.completedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.completed && this.completedAt == null) {
            this.completedAt = LocalDateTime.now();
        }
        if (!this.completed) {
            this.completedAt = null;
        }
    }
}
