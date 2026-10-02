package com.awardsacademique.sections.Repository;

import com.awardsacademique.sections.entity.Section;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SectionRepository extends JpaRepository<Section, UUID> {

    @EntityGraph(attributePaths = {"course", "course.instructor"})
    Optional<Section> findByIdAndDeletedAtIsNull(UUID id);

    @EntityGraph(attributePaths = {"course"})
    List<Section> findByCourseIdAndDeletedAtIsNullOrderByDisplayOrderAsc(UUID courseId);
}