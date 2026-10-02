package com.awardsacademique.resources.Repository;

import com.awardsacademique.resources.entity.LessonResource;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LessonResourceRepository extends JpaRepository<LessonResource, UUID> {

    @EntityGraph(attributePaths = {"lesson", "lesson.section", "lesson.section.course", "lesson.section.course.instructor"})
    Optional<LessonResource> findById(UUID id);

    @EntityGraph(attributePaths = {"lesson", "lesson.section", "lesson.section.course"})
    List<LessonResource> findByLessonIdOrderByCreatedAtAsc(UUID lessonId);

    @EntityGraph(attributePaths = {"lesson", "lesson.section", "lesson.section.course"})
    Optional<LessonResource> findByFileUrl(String fileUrl);

    @EntityGraph(attributePaths = {"lesson", "lesson.section", "lesson.section.course"})
    List<LessonResource> findByLessonIdInOrderByCreatedAtAsc(Collection<UUID> lessonIds);
}
