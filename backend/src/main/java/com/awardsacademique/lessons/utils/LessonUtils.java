package com.awardsacademique.lessons.utils;

public final class LessonUtils {

    private LessonUtils() {
    }

    public static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
