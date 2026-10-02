package com.awardsacademique.resources.service.interfaces;

import com.awardsacademique.resources.dto.request.CreateLessonResourceRequest;
import com.awardsacademique.resources.dto.request.UpdateLessonResourceRequest;
import com.awardsacademique.resources.dto.response.LessonResourceResponse;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface LessonResourceService {

    LessonResourceResponse create(CreateLessonResourceRequest request);

    LessonResourceResponse upload(UUID lessonId, String title, MultipartFile file);

    List<LessonResourceResponse> getByLesson(UUID lessonId);

    List<LessonResourceResponse> getByCourse(UUID courseId);

    Resource getFile(String filename);

    LessonResourceResponse update(UUID id, UpdateLessonResourceRequest request);

    void delete(UUID id);
}
