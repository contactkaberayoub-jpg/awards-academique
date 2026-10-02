package com.awardsacademique.sections.service.interfaces;

import com.awardsacademique.sections.dto.request.CreateSectionRequest;
import com.awardsacademique.sections.dto.request.UpdateSectionRequest;
import com.awardsacademique.sections.dto.response.SectionResponse;

import java.util.List;
import java.util.UUID;

public interface SectionService {

    SectionResponse create(CreateSectionRequest request);

    SectionResponse update(UUID id, UpdateSectionRequest request);

    SectionResponse getById(UUID id);

    List<SectionResponse> getByCourseId(UUID courseId);

    void delete(UUID id);
}