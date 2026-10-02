package com.awardsacademique.categories.utils;

/**
 * Utility class for category-related operations.
 */
public class CategoryUtils {

    /**
     * Generates a URL-friendly slug from the given name.
     *
     * @param name the name to generate a slug for
     * @return the generated slug
     */
    public static String generateSlug(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name cannot be null or blank");
        }
        return name.toLowerCase()
                .trim()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-");
    }
}
