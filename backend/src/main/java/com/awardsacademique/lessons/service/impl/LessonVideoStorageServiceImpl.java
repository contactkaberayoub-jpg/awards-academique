package com.awardsacademique.lessons.service.impl;

import com.awardsacademique.lessons.service.interfaces.LessonVideoStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
public class LessonVideoStorageServiceImpl implements LessonVideoStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"
    );

    private final Path videoDirectory;
    private final long maxFileSizeBytes;

    public LessonVideoStorageServiceImpl(
            @Value("${app.lesson-video.storage-directory:uploads/lesson-videos}") String storageDirectory,
            @Value("${app.lesson-video.max-size-bytes:524288000}") long maxFileSizeBytes
    ) {
        this.videoDirectory = Path.of(storageDirectory).toAbsolutePath().normalize();
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    @Override
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("A video file is required");
        }
        if (!ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new IllegalArgumentException("Only MP4, WebM, MOV, and AVI videos are supported");
        }
        if (file.getSize() > maxFileSizeBytes) {
            throw new IllegalArgumentException("Video file exceeds the maximum allowed size");
        }

        String filename = UUID.randomUUID() + extensionFor(file.getOriginalFilename());
        Path destination = videoDirectory.resolve(filename).normalize();
        if (!destination.getParent().equals(videoDirectory)) {
            throw new IllegalArgumentException("Invalid video filename");
        }

        try {
            Files.createDirectories(videoDirectory);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            return "/api/lessons/videos/" + filename;
        } catch (IOException exception) {
            throw new IllegalStateException("Could not store the lesson video", exception);
        }
    }

    @Override
    public void deleteIfManaged(String videoUrl) {
        if (videoUrl == null || !videoUrl.startsWith("/api/lessons/videos/")) {
            return;
        }

        String filename = videoUrl.substring("/api/lessons/videos/".length());
        Path target = videoDirectory.resolve(filename).normalize();
        if (!target.getParent().equals(videoDirectory)) {
            return;
        }

        try {
            Files.deleteIfExists(target);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not remove the lesson video", exception);
        }
    }

    @Override
    public Resource load(String filename) {
        Path target = videoDirectory.resolve(filename).normalize();
        if (!target.getParent().equals(videoDirectory) || !Files.isRegularFile(target)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson video not found");
        }
        try {
            return new UrlResource(target.toUri());
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read the lesson video", exception);
        }
    }

    private String extensionFor(String originalFilename) {
        if (originalFilename == null) {
            return ".mp4";
        }
        int extensionIndex = originalFilename.lastIndexOf('.');
        if (extensionIndex < 0) {
            return ".mp4";
        }
        String extension = originalFilename.substring(extensionIndex).toLowerCase();
        return Set.of(".mp4", ".webm", ".mov", ".avi").contains(extension) ? extension : ".mp4";
    }
}
