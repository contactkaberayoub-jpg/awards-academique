package com.awardsacademique.categories.service.interfaces;

import com.awardsacademique.categories.dto.request.CreateCategoryRequest;
import com.awardsacademique.categories.dto.request.UpdateCategoryRequest;
import com.awardsacademique.categories.dto.response.CategoryResponse;

import java.util.List;
import java.util.UUID;

public interface CategoryService {

    CategoryResponse create(CreateCategoryRequest request);

    CategoryResponse update(UUID id, UpdateCategoryRequest request);

    CategoryResponse getById(UUID id);

    List<CategoryResponse> getAll();

    List<CategoryResponse> getRootCategories();

    List<CategoryResponse> getSubcategories(UUID parentId);

    void delete(UUID id);
}