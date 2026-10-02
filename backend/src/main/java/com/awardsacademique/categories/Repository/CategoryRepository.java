package com.awardsacademique.categories.Repository;

import com.awardsacademique.categories.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CategoryRepository extends JpaRepository<Category, UUID> {
    Optional<Category> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);

    List<Category> findByParentIsNullOrderByDisplayOrderAsc();

    List<Category> findByParentIdOrderByDisplayOrderAsc(UUID parentId);

    List<Category> findByIsActiveTrueOrderByDisplayOrderAsc();
}
