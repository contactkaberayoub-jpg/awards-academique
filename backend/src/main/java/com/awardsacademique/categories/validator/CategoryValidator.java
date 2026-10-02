package com.awardsacademique.categories.validator;

import com.awardsacademique.categories.entity.Category;
import com.awardsacademique.categories.exception.CategoryNotFoundException;
import com.awardsacademique.categories.exception.DuplicateCategoryException;
import com.awardsacademique.categories.Repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Encapsulates business validation rules for category operations.
 */
@Component
@RequiredArgsConstructor
public class CategoryValidator {

    public static final int MAX_NESTING_LEVEL = 4;

    private final CategoryRepository categoryRepository;

    /**
     * Ensures no existing category already uses the given slug.
     */
    public void validateSlugIsUnique(String slug) {
        if (categoryRepository.existsBySlug(slug)) {
            throw new DuplicateCategoryException(slug);
        }
    }

    /**
     * Ensures the slug is unique, ignoring the category currently being updated.
     */
    public void validateSlugIsUniqueForUpdate(String slug, UUID currentCategoryId) {
        categoryRepository.findBySlug(slug).ifPresent(existing -> {
            if (!existing.getId().equals(currentCategoryId)) {
                throw new DuplicateCategoryException(slug);
            }
        });
    }

    /**
     * Ensures no existing category already uses the given name (case-insensitive).
     */
    public void validateNameIsUnique(String name) {
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new DuplicateCategoryException("name", name);
        }
    }

    /**
     * Ensures the name is unique (case-insensitive), ignoring the category being updated.
     */
    public void validateNameIsUniqueForUpdate(String name, UUID currentCategoryId) {
        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(name, currentCategoryId)) {
            throw new DuplicateCategoryException("name", name);
        }
    }

    /**
     * Resolves and returns the parent category, ensuring it exists,
     * is not the category itself, does not create a cycle, and would
     * not result in nesting deeper than {@link #MAX_NESTING_LEVEL}
     * (where a root category is level 0).
     */
    public Category resolveParent(UUID parentId, UUID currentCategoryId) {
        if (parentId == null) {
            return null;
        }
        if (parentId.equals(currentCategoryId)) {
            throw new IllegalStateException("A category cannot be its own parent");
        }
        Category parent = categoryRepository.findById(parentId)
                .orElseThrow(() -> new CategoryNotFoundException(parentId));

        java.util.Set<UUID> visited = new java.util.HashSet<>();
        Category cursor = parent;
        int parentLevel = 0;
        while (cursor != null && visited.add(cursor.getId())) {
            if (cursor.getId().equals(currentCategoryId)) {
                throw new IllegalStateException("A category cannot be its own ancestor");
            }
            cursor = cursor.getParent();
            if (cursor != null) {
                parentLevel++;
            }
        }
        int newChildLevel = parentLevel + 1;
        if (newChildLevel >= MAX_NESTING_LEVEL) {
            throw new IllegalStateException(
                    "Category nesting cannot exceed " + MAX_NESTING_LEVEL + " levels (root = level 0)."
                            + " Attaching this category would place it at level " + newChildLevel + ".");
        }
        return parent;
    }

    /**
     * After reparenting a subtree (e.g. when deleting a parent category),
     * validates that every descendant of the reparented root still respects
     * the {@link #MAX_NESTING_LEVEL} ceiling, walking down through children
     * and counting depth from the real root upward.
     *
     * @param reparentedChild the immediate child whose parent reference was
     *                        just reassigned; its whole subtree is rechecked.
     */
    public void validateSubtreeDepthAfterReparent(Category reparentedChild) {
        int depthFromRoot = computeDepthFromRoot(reparentedChild);
        validateDescendantDepth(reparentedChild, depthFromRoot);
    }

    private int computeDepthFromRoot(Category category) {
        int depth = 0;
        Category cursor = category.getParent();
        java.util.Set<UUID> seen = new java.util.HashSet<>();
        while (cursor != null && seen.add(cursor.getId())) {
            depth++;
            cursor = cursor.getParent();
        }
        return depth;
    }

    private void validateDescendantDepth(Category node, int currentDepth) {
        if (currentDepth >= MAX_NESTING_LEVEL) {
            throw new IllegalStateException(
                    "Cannot reparent category '" + node.getName() + "' (id=" + node.getId()
                            + "): it would end up at level " + currentDepth
                            + " which exceeds the " + MAX_NESTING_LEVEL + " level nesting limit"
                            + " (root = level 0). Restructure the subtree first before deleting its ancestor.");
        }
        java.util.List<Category> children = categoryRepository.findByParentIdOrderByDisplayOrderAsc(node.getId());
        for (Category child : children) {
            validateDescendantDepth(child, currentDepth + 1);
        }
    }
}