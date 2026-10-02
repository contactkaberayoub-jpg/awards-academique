package com.awardsacademique.categories.mapper;

import com.awardsacademique.categories.dto.request.CreateCategoryRequest;
import com.awardsacademique.categories.dto.response.CategoryResponse;
import com.awardsacademique.categories.entity.Category;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

/**
 * Mapper for converting between Category entities and DTOs.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface CategoryMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "parent", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "isActive", ignore = true)
    Category toEntity(CreateCategoryRequest request);

    @Mapping(target = "parentId", source = "parent.id")
    @Mapping(target = "isActive", expression = "java(category.isActive())")
    CategoryResponse toResponse(Category category);
}
