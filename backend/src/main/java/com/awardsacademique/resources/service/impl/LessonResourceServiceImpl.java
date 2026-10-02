package com.awardsacademique.resources.service.impl;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.enrollments.validation.EnrollmentValidator;
import com.awardsacademique.lessons.Repository.LessonRepository;
import com.awardsacademique.lessons.entity.Lesson;
import com.awardsacademique.lessons.entity.LessonStatusEnum;
import com.awardsacademique.lessons.exception.LessonNotFoundException;
import com.awardsacademique.resources.Repository.LessonResourceRepository;
import com.awardsacademique.resources.dto.request.CreateLessonResourceRequest;
import com.awardsacademique.resources.dto.request.UpdateLessonResourceRequest;
import com.awardsacademique.resources.dto.response.LessonResourceResponse;
import com.awardsacademique.resources.entity.LessonResource;
import com.awardsacademique.resources.entity.LessonResourceTypeEnum;
import com.awardsacademique.resources.exception.LessonResourceNotFoundException;
import com.awardsacademique.resources.mapper.LessonResourceMapper;
import com.awardsacademique.resources.service.interfaces.LessonResourceService;
import com.awardsacademique.resources.service.interfaces.ResourceStorageService;
import com.awardsacademique.sections.Repository.SectionRepository;
import com.awardsacademique.sections.entity.Section;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LessonResourceServiceImpl implements LessonResourceService {

    private static final String FILE_URL_PREFIX = "/api/lesson-resources/files/";

    private final LessonResourceRepository lessonResourceRepository;
    private final LessonResourceMapper lessonResourceMapper;
    private final ResourceStorageService resourceStorageService;
    private final LessonRepository lessonRepository;
    private final SectionRepository sectionRepository;
    private final CourseRepository courseRepository;
    private final AuthorizationService authorizationService;
    private final EnrollmentValidator enrollmentValidator;

    private Lesson resolveLesson(UUID lessonId) {
        return lessonRepository.findByIdAndDeletedAtIsNull(lessonId)
                .orElseThrow(() -> new LessonNotFoundException(lessonId));
    }

    private LessonResource resolve(UUID id) {
        return lessonResourceRepository.findById(id)
                .orElseThrow(() -> new LessonResourceNotFoundException(id));
    }

    private void requireCanModify(Lesson lesson, User user) {
        Course course = lesson.getSection().getCourse();
        authorizationService.requireCanModifyCourse(course, user);
        if (lesson.getStatus() == LessonStatusEnum.published && !authorizationService.isAdministrator(user)) {
            throw new AccessDeniedException("Resources of published lessons can only be modified by administrators");
        }
    }

    private void requireCanView(Lesson lesson) {
        User user = authorizationService.requireCurrentUser();
        Course course = lesson.getSection().getCourse();
        if (authorizationService.isAdministrator(user)
                || authorizationService.isInstructor(user)
                || authorizationService.ownsCourse(course, user)) {
            return;
        }
        if (course.getStatus() != CourseStatusEnum.published || !course.isPublished()) {
            throw new AccessDeniedException("You do not have permission to view this resource");
        }
        if (lesson.getStatus() != LessonStatusEnum.published) {
            throw new AccessDeniedException("This resource is not available yet");
        }
        enrollmentValidator.requireActiveEnrollment(user, course);
    }

    @Override
    @Transactional
    public LessonResourceResponse create(CreateLessonResourceRequest request) {
        Lesson lesson = resolveLesson(request.getLessonId());
        User currentUser = authorizationService.requireCurrentUser();
        requireCanModify(lesson, currentUser);

        if (request.getResourceType() == LessonResourceTypeEnum.link
                || request.getResourceType() == LessonResourceTypeEnum.video) {
            LessonResource resource = LessonResource.builder()
                    .lesson(lesson)
                    .title(request.getTitle())
                    .resourceType(request.getResourceType())
                    .fileUrl(request.getUrl())
                    .build();
            return lessonResourceMapper.toResponse(lessonResourceRepository.save(resource));
        }

        throw new IllegalArgumentException("Use the upload endpoint for file or PDF resources");
    }

    @Override
    @Transactional
    public LessonResourceResponse upload(UUID lessonId, String title, MultipartFile file) {
        Lesson lesson = resolveLesson(lessonId);
        User currentUser = authorizationService.requireCurrentUser();
        requireCanModify(lesson, currentUser);

        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("A title is required for the resource");
        }

        String fileUrl = resourceStorageService.store(file);
        LessonResourceTypeEnum type = "application/pdf".equals(file.getContentType())
                ? LessonResourceTypeEnum.pdf
                : LessonResourceTypeEnum.file;

        LessonResource resource = LessonResource.builder()
                .lesson(lesson)
                .title(title)
                .resourceType(type)
                .fileUrl(fileUrl)
                .fileSizeBytes(file.getSize())
                .build();

        LessonResource saved = lessonResourceRepository.save(resource);
        return lessonResourceMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LessonResourceResponse> getByLesson(UUID lessonId) {
        Lesson lesson = resolveLesson(lessonId);
        requireCanView(lesson);
        return lessonResourceRepository.findByLessonIdOrderByCreatedAtAsc(lessonId).stream()
                .map(lessonResourceMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LessonResourceResponse> getByCourse(UUID courseId) {
        Course course = courseRepository.findByIdAndDeletedAtIsNull(courseId)
                .orElseThrow(() -> new com.awardsacademique.courses.exception.CourseNotFoundException(courseId));
        User currentUser = authorizationService.requireCurrentUser();
        if (!authorizationService.isAdministrator(currentUser)
                && !authorizationService.ownsCourse(course, currentUser)) {
            throw new AccessDeniedException("You do not have permission to view resources for this course");
        }

        List<Section> sections = sectionRepository.findByCourseIdAndDeletedAtIsNullOrderByDisplayOrderAsc(courseId);
        List<UUID> lessonIds = sections.stream()
                .flatMap(section -> lessonRepository.findBySectionIdAndDeletedAtIsNullOrderByDisplayOrderAsc(section.getId()).stream())
                .map(Lesson::getId)
                .collect(Collectors.toList());

        if (lessonIds.isEmpty()) {
            return List.of();
        }

        return lessonResourceRepository.findByLessonIdInOrderByCreatedAtAsc(lessonIds).stream()
                .map(lessonResourceMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Resource getFile(String filename) {
        String fileUrl = FILE_URL_PREFIX + filename;
        LessonResource resource = lessonResourceRepository.findByFileUrl(fileUrl)
                .orElseThrow(() -> new LessonResourceNotFoundException("Lesson resource not found"));
        requireCanView(resource.getLesson());
        return resourceStorageService.load(filename);
    }

    @Override
    @Transactional
    public LessonResourceResponse update(UUID id, UpdateLessonResourceRequest request) {
        LessonResource resource = resolve(id);
        Lesson lesson = resource.getLesson();
        User currentUser = authorizationService.requireCurrentUser();
        requireCanModify(lesson, currentUser);

        if (request.getTitle() != null) {
            resource.setTitle(request.getTitle());
        }
        if (request.getUrl() != null && !FILE_URL_PREFIX.equals(resource.getFileUrl())) {
            String previous = resource.getFileUrl();
            resource.setFileUrl(request.getUrl());
            resourceStorageService.deleteIfManaged(previous);
        }

        return lessonResourceMapper.toResponse(lessonResourceRepository.save(resource));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        LessonResource resource = resolve(id);
        Lesson lesson = resource.getLesson();
        User currentUser = authorizationService.requireCurrentUser();
        requireCanModify(lesson, currentUser);

        lessonResourceRepository.delete(resource);
        resourceStorageService.deleteIfManaged(resource.getFileUrl());
    }
}
