package com.awardsacademique.resources.service.impl;

import com.awardsacademique.resources.service.interfaces.ResourceStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

/**
 * Stores lesson resource files on the local filesystem and serves them back.
 */
@Service
public class ResourceStorageServiceImpl implements ResourceStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "text/plain",
            "text/markdown",
            "text/csv",
            "application/json",
            "application/zip",
            "application/x-zip-compressed",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
            "audio/mpeg",
            "audio/wav",
            "video/mp4",
            "video/webm"
    );

    private final Path resourceDirectory;
    private final long maxFileSizeBytes;

    public ResourceStorageServiceImpl(
            @Value("${app.lesson-resource.storage-directory:uploads/lesson-resources}") String storageDirectory,
            @Value("${app.lesson-resource.max-size-bytes:20971520}") long maxFileSizeBytes
    ) {
        this.resourceDirectory = Path.of(storageDirectory).toAbsolutePath().normalize();
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    @Override
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("A resource file is required");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("This file type is not supported for lesson resources");
        }
        if (file.getSize() > maxFileSizeBytes) {
            throw new IllegalArgumentException("Resource file exceeds the maximum allowed size");
        }

        String filename = UUID.randomUUID() + extensionFor(file.getOriginalFilename());
        Path destination = resourceDirectory.resolve(filename).normalize();
        if (!destination.getParent().equals(resourceDirectory)) {
            throw new IllegalArgumentException("Invalid resource filename");
        }

        try {
            Files.createDirectories(resourceDirectory);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            return "/api/lesson-resources/files/" + filename;
        } catch (IOException exception) {
            throw new IllegalStateException("Could not store the lesson resource", exception);
        }
    }

    @Override
    public void deleteIfManaged(String fileUrl) {
        if (fileUrl == null || !fileUrl.startsWith("/api/lesson-resources/files/")) {
            return;
        }

        String filename = fileUrl.substring("/api/lesson-resources/files/".length());
        Path target = resourceDirectory.resolve(filename).normalize();
        if (!target.getParent().equals(resourceDirectory)) {
            return;
        }

        try {
            Files.deleteIfExists(target);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not remove the lesson resource", exception);
        }
    }

    @Override
    public Resource load(String filename) {
        Path target = resourceDirectory.resolve(filename).normalize();
        if (!target.getParent().equals(resourceDirectory) || !Files.isRegularFile(target)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson resource not found");
        }
        try {
            return new UrlResource(target.toUri());
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read the lesson resource", exception);
        }
    }

    private String extensionFor(String originalFilename) {
        if (originalFilename == null) {
            return "";
        }
        int extensionIndex = originalFilename.lastIndexOf('.');
        if (extensionIndex < 0) {
            return "";
        }
        String extension = originalFilename.substring(extensionIndex).toLowerCase();
        if (extension.length() > 10) {
            return "";
        }
        return extension;
    }
}
