package com.awardsacademique.lessons.service.interfaces;

import com.awardsacademique.lessons.dto.request.CreateLessonRequest;
import com.awardsacademique.lessons.dto.request.UpdateLessonRequest;
import com.awardsacademique.lessons.dto.response.LessonResponse;
import com.awardsacademique.lessons.entity.LessonStatusEnum;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface LessonService {

    LessonResponse create(UUID sectionId, CreateLessonRequest request);

    LessonResponse update(UUID id, UpdateLessonRequest request);

    LessonResponse getById(UUID id);

    List<LessonResponse> getAll();

    List<LessonResponse> getBySectionId(UUID sectionId);

    Page<LessonResponse> getPage(UUID courseId, UUID sectionId, LessonStatusEnum status, String search, Pageable pageable);

    LessonResponse uploadVideo(UUID id, MultipartFile file);

    LessonResponse deleteVideo(UUID id);

    Resource getVideo(String filename);

    void delete(UUID id);
}
