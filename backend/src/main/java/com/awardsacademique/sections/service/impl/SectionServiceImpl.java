package com.awardsacademique.sections.service.impl;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.sections.Repository.SectionRepository;
import com.awardsacademique.sections.dto.request.CreateSectionRequest;
import com.awardsacademique.sections.dto.request.UpdateSectionRequest;
import com.awardsacademique.sections.dto.response.SectionResponse;
import com.awardsacademique.sections.entity.Section;
import com.awardsacademique.sections.exception.SectionNotFoundException;
import com.awardsacademique.sections.mapper.SectionMapper;
import com.awardsacademique.sections.service.interfaces.SectionService;
import com.awardsacademique.sections.validation.SectionValidation;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SectionServiceImpl implements SectionService {

    private final SectionRepository sectionRepository;
    private final SectionMapper sectionMapper;
    private final SectionValidation sectionValidation;
    private final AuthorizationService authorizationService;

    @Override
    @Transactional
    public SectionResponse create(CreateSectionRequest request) {
        User currentUser = authorizationService.requireCurrentUser();
        Course course = sectionValidation.resolveCourse(request.getCourseId());

        authorizationService.requireCanModifyCourse(course, currentUser);

        Section section = sectionMapper.toEntity(request);
        section.setCourse(course);
        section.setDisplayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0);

        section.setCreatedAt(LocalDateTime.now());
        section.setUpdatedAt(LocalDateTime.now());

        Section saved = sectionRepository.save(section);

        return sectionMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public SectionResponse update(UUID id, UpdateSectionRequest request) {
        Section section = sectionRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new SectionNotFoundException(id));

        User currentUser = authorizationService.requireCurrentUser();
        authorizationService.requireCanModifyCourse(section.getCourse(), currentUser);

        if (request.getTitle() != null) {
            section.setTitle(request.getTitle());
        }

        if (request.getDisplayOrder() != null) {
            section.setDisplayOrder(request.getDisplayOrder());
        }

        section.setUpdatedAt(LocalDateTime.now());

        Section updated = sectionRepository.save(section);

        return sectionMapper.toResponse(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public SectionResponse getById(UUID id) {
        Section section = sectionRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new SectionNotFoundException(id));

        authorizationService.requireCanViewCourse(section.getCourse());

        return sectionMapper.toResponse(section);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SectionResponse> getByCourseId(UUID courseId) {
        Course course = sectionValidation.resolveCourse(courseId);

        authorizationService.requireCanViewCourse(course);

        return sectionRepository.findByCourseIdAndDeletedAtIsNullOrderByDisplayOrderAsc(courseId).stream()
                .map(sectionMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Section section = sectionRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new SectionNotFoundException(id));

        User currentUser = authorizationService.requireCurrentUser();
        authorizationService.requireCanModifyCourse(section.getCourse(), currentUser);

        section.setDeletedAt(LocalDateTime.now());

        sectionRepository.save(section);
    }
}
