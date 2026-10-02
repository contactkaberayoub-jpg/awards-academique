package com.awardsacademique.resources.entity;

/**
 * Type of a lesson resource.
 * Values must match the PostgreSQL enum {@code lesson_resource_type_enum}.
 */
public enum LessonResourceTypeEnum {
    pdf,
    video,
    link,
    file
}
