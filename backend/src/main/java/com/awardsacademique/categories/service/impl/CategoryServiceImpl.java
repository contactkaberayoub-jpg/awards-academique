package com.awardsacademique.categories.service.impl;

import com.awardsacademique.categories.dto.request.CreateCategoryRequest;
import com.awardsacademique.categories.dto.request.UpdateCategoryRequest;
import com.awardsacademique.categories.dto.response.CategoryResponse;
import com.awardsacademique.categories.entity.Category;
import com.awardsacademique.categories.exception.CategoryNotFoundException;
import com.awardsacademique.categories.mapper.CategoryMapper;
import com.awardsacademique.categories.Repository.CategoryRepository;
import com.awardsacademique.categories.service.interfaces.CategoryService;
import com.awardsacademique.categories.utils.CategoryUtils;
import com.awardsacademique.categories.validator.CategoryValidator;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.common.rbac.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;
    private final CategoryValidator categoryValidator;
    private final CourseRepository courseRepository;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional
    public CategoryResponse create(CreateCategoryRequest request) {
        // Validate name uniqueness first
        categoryValidator.validateNameIsUnique(request.getName());

        // Generate or use provided slug
        String slug = (request.getSlug() != null && !request.getSlug().isBlank())
                ? request.getSlug()
                : CategoryUtils.generateSlug(request.getName());

        // Validate slug uniqueness
        categoryValidator.validateSlugIsUnique(slug);

        // Resolve parent
        Category parent = categoryValidator.resolveParent(request.getParentId(), null);

        // Build category entity
        Category category = categoryMapper.toEntity(request);
        category.setSlug(slug);
        category.setParent(parent);
        if (request.getDisplayOrder() != null) {
            category.setDisplayOrder(request.getDisplayOrder());
        }
        category.setCreatedAt(LocalDateTime.now());
        category.setUpdatedAt(LocalDateTime.now());

        Category saved = categoryRepository.save(category);
        return categoryMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public CategoryResponse update(UUID id, UpdateCategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new CategoryNotFoundException(id));

        // Update name if changed and validate
        if (request.getName() != null && !request.getName().equals(category.getName())) {
            categoryValidator.validateNameIsUniqueForUpdate(request.getName(), id);
            category.setName(request.getName());
            // Regenerate slug only if not explicitly provided
            if (request.getSlug() == null) {
                String newSlug = CategoryUtils.generateSlug(request.getName());
                categoryValidator.validateSlugIsUniqueForUpdate(newSlug, id);
                category.setSlug(newSlug);
            }
        }

        // Update slug if explicitly provided
        if (request.getSlug() != null && !request.getSlug().equals(category.getSlug())) {
            categoryValidator.validateSlugIsUniqueForUpdate(request.getSlug(), id);
            category.setSlug(request.getSlug());
        }

        // Update other fields
        if (request.getIconUrl() != null) {
            category.setIconUrl(request.getIconUrl());
        }

        if (request.getDisplayOrder() != null) {
            category.setDisplayOrder(request.getDisplayOrder());
        }

        if (request.getIsActive() != null) {
            category.setActive(request.getIsActive());
        }

        if (Boolean.TRUE.equals(request.getClearParent())) {
            category.setParent(null);
        } else if (request.getParentId() != null) {
            Category parent = categoryValidator.resolveParent(request.getParentId(), id);
            category.setParent(parent);
        }

        // Update timestamp
        category.setUpdatedAt(LocalDateTime.now());

        Category updated = categoryRepository.save(category);
        return categoryMapper.toResponse(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse getById(UUID id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new CategoryNotFoundException(id));
        if (!category.isActive()) {
            boolean isAdmin = currentUserProvider.getCurrentUser()
                    .map(currentUserProvider::isAdministrator)
                    .orElse(false);
            if (!isAdmin) {
                throw new CategoryNotFoundException(id);
            }
        }
        return categoryMapper.toResponse(category);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getAll() {
        return categoryRepository.findByIsActiveTrueOrderByDisplayOrderAsc().stream()
                .map(categoryMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getRootCategories() {
        return categoryRepository.findByParentIsNullOrderByDisplayOrderAsc().stream()
                .filter(c -> Boolean.TRUE.equals(c.isActive()))
                .map(categoryMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getSubcategories(UUID parentId) {
        return categoryRepository.findByParentIdOrderByDisplayOrderAsc(parentId).stream()
                .filter(c -> Boolean.TRUE.equals(c.isActive()))
                .map(categoryMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new CategoryNotFoundException(id));

        if (courseRepository.existsByCategoryId(id)) {
            throw new IllegalStateException("Cannot delete this category because courses are assigned to it");
        }

        // Reparent children to the deleted category's parent so no orphans are left behind.
        List<Category> children = categoryRepository.findByParentIdOrderByDisplayOrderAsc(id);
        for (Category child : children) {
            child.setParent(category.getParent());
        }
        // Validate that no descendant in the reparented subtrees exceeds the 4-level nesting limit.
        // Must happen before saveAll; throw rolls the transaction back without orphaning anything.
        for (Category child : children) {
            categoryValidator.validateSubtreeDepthAfterReparent(child);
        }
        if (!children.isEmpty()) {
            categoryRepository.saveAll(children);
        }

        categoryRepository.delete(category);
    }
}