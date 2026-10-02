package com.awardsacademique.categories.exception;

public class DuplicateCategoryException extends RuntimeException {
    public DuplicateCategoryException(String slug) {
        super("Category with slug already exists: " + slug);
    }

    public DuplicateCategoryException(String field, String value) {
        super("Category with " + field + " already exists: " + value);
    }
}
