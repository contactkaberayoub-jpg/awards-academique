package com.awardsacademique.sections.exception;


import java.util.UUID;

public class SectionNotFoundException extends RuntimeException {
    public SectionNotFoundException(UUID id) {
        super("Section not found with id: " + id);
    }
}