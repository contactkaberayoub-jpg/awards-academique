package com.awardsacademique.courses.exception;

public class DuplicateCourseException extends RuntimeException {
    public DuplicateCourseException(String field, String value) {
        super("Course with " + field + " already exists: " + value);
    }
}
