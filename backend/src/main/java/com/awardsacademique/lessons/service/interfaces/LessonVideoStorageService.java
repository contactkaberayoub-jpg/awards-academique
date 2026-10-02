package com.awardsacademique.lessons.service.interfaces;

import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;

public interface LessonVideoStorageService {

    String store(MultipartFile file);

    void deleteIfManaged(String videoUrl);

    Resource load(String filename);
}
