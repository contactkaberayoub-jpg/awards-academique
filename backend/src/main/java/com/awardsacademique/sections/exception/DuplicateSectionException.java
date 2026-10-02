package com.awardsacademique.sections.exception;

public class DuplicateSectionException extends RuntimeException {
    public DuplicateSectionException(String field, String value) {
        super("Section with " + field + " already exists: " + value);
    }
}