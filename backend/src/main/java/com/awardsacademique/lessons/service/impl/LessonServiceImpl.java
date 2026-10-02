package com.awardsacademique.lessons.service.impl;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.pipeline.ProgressionService;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.enrollments.validation.EnrollmentValidator;
import com.awardsacademique.lessons.Repository.LessonRepository;
import com.awardsacademique.lessons.dto.request.CreateLessonRequest;
import com.awardsacademique.lessons.dto.request.UpdateLessonRequest;
import com.awardsacademique.lessons.dto.response.LessonResponse;
import com.awardsacademique.lessons.entity.Lesson;
import com.awardsacademique.lessons.entity.LessonStatusEnum;
import com.awardsacademique.lessons.entity.LessonTypeEnum;
import com.awardsacademique.lessons.exception.LessonNotFoundException;
import com.awardsacademique.lessons.mapper.LessonMapper;
import com.awardsacademique.lessons.service.interfaces.LessonService;
import com.awardsacademique.lessons.service.interfaces.LessonVideoStorageService;
import com.awardsacademique.lessons.validation.LessonValidator;
import com.awardsacademique.lessons.utils.LessonHtmlSanitizer;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.sections.entity.Section;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LessonServiceImpl implements LessonService {

    private final LessonRepository lessonRepository;
    private final LessonMapper lessonMapper;
    private final LessonValidator lessonValidator;
    private final LessonVideoStorageService lessonVideoStorageService;
    private final AuthorizationService authorizationService;
    private final EnrollmentValidator enrollmentValidator;
    private final ProgressionService progressionService;

    @Override
    @Transactional
    public LessonResponse create(UUID sectionId, CreateLessonRequest request) {
        User currentUser = authorizationService.requireCurrentUser();
        Section section = lessonValidator.resolveSection(sectionId);

        authorizationService.requireCanModifyCourse(section.getCourse(), currentUser);
        if (request.getStatus() == LessonStatusEnum.published) {
            authorizationService.requireCanPublishLesson(currentUser);
        }

        Lesson lesson = lessonMapper.toEntity(request);
        lesson.setSection(section);
        lesson.setFreePreview(Boolean.TRUE.equals(request.getIsFreePreview()));
        lesson.setStatus(request.getStatus() == null ? LessonStatusEnum.draft : request.getStatus());
        lesson.setDisplayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0);
        lesson.setDurationMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : 0);

        // Allowlist-sanitize rich-text content before it can be stored/persisted.
        lesson.setContent(LessonHtmlSanitizer.sanitize(lesson.getContent()));
        lessonValidator.validateLessonContent(lesson.getLessonType(), lesson.getStatus(), lesson.getContent(), lesson.getVideoUrl());

        lesson.setCreatedAt(LocalDateTime.now());
        lesson.setUpdatedAt(LocalDateTime.now());

        Lesson saved = lessonRepository.save(lesson);

        return lessonMapper.toResponse(saved);
    }

    private void requireCanViewLearningContent(User currentUser, Course course) {
        if (!hasLearningAccess(currentUser, course)) {
            throw new AccessDeniedException(
                    "You must have an active enrollment to access this course's learning content");
        }
    }

    /**
     * Whether the given (possibly anonymous) viewer may see the protected learning content of a
     * course: administrators, instructors, the owning instructor and actively enrolled students.
     */
    private boolean hasLearningAccess(User viewer, Course course) {
        return isPrivilegedViewer(viewer, course)
                || enrollmentValidator.hasActiveEnrollment(viewer, course);
    }

    /**
     * Builds the listing DTO for the public curriculum. Viewers without learning access (guests,
     * or authenticated students who have not enrolled) may browse the course's lesson metadata only;
     * protected content (body, video URL, per-user unlock/progress and the mandatory quiz gate) is
     * redacted so it never leaks through the public curriculum endpoints.
     */
    private LessonResponse toListingResponse(Lesson lesson, User viewer, boolean privilegedViewer, boolean canAccessContent) {
        LessonResponse response = lessonMapper.toResponse(lesson);
        if (canAccessContent && viewer != null) {
            boolean unlocked = privilegedViewer || lesson.isFreePreview()
                    || progressionService.isLessonUnlocked(viewer.getId(), lesson);
            response.setUnlocked(unlocked);
            attachGate(response, lesson);
        } else {
            response.setContent(null);
            response.setVideoUrl(null);
            response.setUnlocked(null);
            response.setCompleted(null);
            response.setMandatoryQuizId(null);
        }
        return response;
    }

    @Override
    @Transactional
    public LessonResponse update(UUID id, UpdateLessonRequest request) {
        Lesson lesson = lessonRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new LessonNotFoundException(id));
        String previousVideoUrl = lesson.getVideoUrl();

        User currentUser = authorizationService.requireCurrentUser();

        authorizationService.requireCanModifyCourse(lesson.getSection().getCourse(), currentUser);
        authorizationService.requireCanModifyPublishedLesson(currentUser, lesson.getStatus() == LessonStatusEnum.published);

        if (request.getSectionId() != null && !request.getSectionId().equals(lesson.getSection().getId())) {
            Section targetSection = lessonValidator.resolveSection(request.getSectionId());
            authorizationService.requireCanModifyCourse(targetSection.getCourse(), currentUser);
            lesson.setSection(targetSection);
        }

        if (request.getTitle() != null) {
            lesson.setTitle(request.getTitle());
        }

        if (request.getContent() != null) {
            lesson.setContent(LessonHtmlSanitizer.sanitize(request.getContent()));
        }

        if (request.getLessonType() != null) {
            lesson.setLessonType(request.getLessonType());
        }

        if (request.getVideoUrl() != null) {
            lesson.setVideoUrl(request.getVideoUrl());
        }

        if (request.getIsFreePreview() != null) {
            lesson.setFreePreview(request.getIsFreePreview());
        }

        if (request.getStatus() != null) {
            if (request.getStatus() == LessonStatusEnum.published) {
                authorizationService.requireCanPublishLesson(currentUser);
            }
            lesson.setStatus(request.getStatus());
        }

        if (request.getDisplayOrder() != null) {
            lesson.setDisplayOrder(request.getDisplayOrder());
        }

        if (request.getDurationMinutes() != null) {
            lesson.setDurationMinutes(request.getDurationMinutes());
        }

        if (lesson.getLessonType() != LessonTypeEnum.video) {
            lesson.setVideoUrl(null);
        }

        lessonValidator.validateLessonContent(lesson.getLessonType(), lesson.getStatus(), lesson.getContent(), lesson.getVideoUrl());

        lesson.setUpdatedAt(LocalDateTime.now());

        Lesson updated = lessonRepository.save(lesson);
        if (!java.util.Objects.equals(previousVideoUrl, updated.getVideoUrl())) {
            lessonVideoStorageService.deleteIfManaged(previousVideoUrl);
        }

        return lessonMapper.toResponse(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public LessonResponse getById(UUID id) {
        Lesson lesson = lessonRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new LessonNotFoundException(id));

        Course course = lesson.getSection().getCourse();
        authorizationService.requireCanViewCourse(course);
        User currentUser = authorizationService.requireCurrentUser();
        requireCanViewLearningContent(currentUser, course);

        boolean privileged = isPrivilegedViewer(currentUser, course);
        boolean freePreview = lesson.isFreePreview();

        if (!privileged && lesson.getStatus() != LessonStatusEnum.published) {
            throw new LessonNotFoundException(id);
        }

        // Sequential progression: a non-privileged (student) viewer cannot open a lesson whose
        // preceding lesson(s), plus their linked published quizzes, are not yet satisfied. Free
        // previews are always reachable.
        boolean unlocked = privileged || freePreview
                || progressionService.isLessonUnlocked(currentUser.getId(), lesson);
        if (!unlocked) {
            throw new LessonNotFoundException(id);
        }

        LessonResponse response = lessonMapper.toResponse(lesson);
        response.setUnlocked(unlocked);
        response.setCompleted(progressionService.isLessonCompleted(currentUser.getId(), lesson.getId()));
        attachGate(response, lesson);
        return response;
    }

    private void attachGate(LessonResponse response, Lesson lesson) {
        if (response != null && lesson != null && lesson.getId() != null) {
            response.setMandatoryQuizId(
                    progressionService.publishedQuizForLesson(lesson.getId())
                            .map(Quiz::getId).orElse(null));
        }
    }

    private boolean isPrivilegedViewer(User currentUser, Course course) {
        return authorizationService.isAdministrator(currentUser)
                || authorizationService.isInstructor(currentUser)
                || authorizationService.ownsCourse(course, currentUser);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LessonResponse> getAll() {
        User currentUser = authorizationService.requireCurrentUser();

        if (!authorizationService.isAdministrator(currentUser)
                && !authorizationService.isInstructor(currentUser)) {
            throw new AccessDeniedException("Only administrators and instructors can list all lessons.");
        }

        List<Lesson> lessons;
        if (authorizationService.isAdministrator(currentUser)) {
            lessons = lessonRepository.findByDeletedAtIsNullOrderByDisplayOrderAsc();
        } else {
            lessons = lessonRepository.findAllScoped(currentUser.getId(), false);
        }

        return lessons.stream()
                .map(lessonMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LessonResponse> getBySectionId(UUID sectionId) {
        Section section = lessonValidator.resolveSection(sectionId);

        Course course = section.getCourse();
        authorizationService.requireCanViewCourse(course);
        User currentUser = authorizationService.getCurrentUser().orElse(null);
        boolean privilegedViewer = isPrivilegedViewer(currentUser, course);
        boolean canAccessContent = hasLearningAccess(currentUser, course);

        List<Lesson> lessons = lessonRepository.findBySectionIdAndDeletedAtIsNullOrderByDisplayOrderAsc(sectionId);
        return lessons.stream()
                .filter(lesson -> privilegedViewer || lesson.getStatus() == LessonStatusEnum.published)
                .map(lesson -> toListingResponse(lesson, currentUser, privilegedViewer, canAccessContent))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<LessonResponse> getPage(UUID courseId, UUID sectionId, LessonStatusEnum status, String search, Pageable pageable) {
        User currentUser = authorizationService.getCurrentUser().orElse(null);
        boolean privileged = authorizationService.isAdministrator(currentUser)
                || authorizationService.isInstructor(currentUser);

        Course course = null;
        if (sectionId != null) {
            Section section = lessonValidator.resolveSection(sectionId);
            course = section.getCourse();
            if (courseId != null && !courseId.equals(course.getId())) {
                throw new IllegalArgumentException("The selected section does not belong to the selected course");
            }
            if (!privileged) {
                // Public curriculum: published courses may be browsed by guests and non-enrolled
                // users; protected lesson content is redacted by toListingResponse.
                authorizationService.requireCanViewCourse(course);
            }
        } else if (courseId != null) {
            course = lessonValidator.resolveCourse(courseId);
            if (!privileged) {
                authorizationService.requireCanViewCourse(course);
            }
        }

        UUID instructorId = null;
        boolean publishedOnly = false;
        if (authorizationService.isInstructor(currentUser)) {
            instructorId = currentUser.getId();
        } else if (!authorizationService.isAdministrator(currentUser)) {
            publishedOnly = true;
        }

        boolean canAccessContent = privileged || (course != null && hasLearningAccess(currentUser, course));
        String query = search == null || search.isBlank() ? "" : search.trim();
        return lessonRepository.findPage(courseId, sectionId, status, query, pageable, instructorId, publishedOnly)
                .map(lesson -> toListingResponse(lesson, currentUser, privileged, canAccessContent));
    }

    @Override
    @Transactional
    public LessonResponse uploadVideo(UUID id, MultipartFile file) {
        Lesson lesson = lessonRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new LessonNotFoundException(id));
        User currentUser = authorizationService.requireCurrentUser();

        authorizationService.requireCanModifyCourse(lesson.getSection().getCourse(), currentUser);
        authorizationService.requireCanModifyPublishedLesson(currentUser, lesson.getStatus() == LessonStatusEnum.published);

        if (lesson.getLessonType() != LessonTypeEnum.video) {
            throw new IllegalArgumentException("A video can only be attached to a video lesson");
        }

        String previousVideoUrl = lesson.getVideoUrl();
        lesson.setVideoUrl(lessonVideoStorageService.store(file));
        Lesson updated = lessonRepository.save(lesson);
        lessonVideoStorageService.deleteIfManaged(previousVideoUrl);
        return lessonMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public LessonResponse deleteVideo(UUID id) {
        Lesson lesson = lessonRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new LessonNotFoundException(id));
        User currentUser = authorizationService.requireCurrentUser();

        authorizationService.requireCanModifyCourse(lesson.getSection().getCourse(), currentUser);
        authorizationService.requireCanModifyPublishedLesson(currentUser, lesson.getStatus() == LessonStatusEnum.published);

        String previousVideoUrl = lesson.getVideoUrl();
        lesson.setVideoUrl(null);
        if (lesson.getStatus() == LessonStatusEnum.published) {
            lesson.setStatus(LessonStatusEnum.draft);
        }
        Lesson updated = lessonRepository.save(lesson);
        lessonVideoStorageService.deleteIfManaged(previousVideoUrl);
        return lessonMapper.toResponse(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public Resource getVideo(String filename) {
        String videoUrl = "/api/lessons/videos/" + filename;
        Lesson lesson = lessonRepository.findByVideoUrlAndDeletedAtIsNull(videoUrl)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Lesson video not found"));

        User currentUser = authorizationService.requireCurrentUser();
        Course course = lesson.getSection().getCourse();
        if (!authorizationService.isAdministrator(currentUser)
                && !authorizationService.ownsCourse(course, currentUser)) {
            authorizationService.requireCanViewCourse(course);
            requireCanViewLearningContent(currentUser, course);
            if (lesson.getStatus() != LessonStatusEnum.published) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Lesson video not found");
            }
        }

        return lessonVideoStorageService.load(filename);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Lesson lesson = lessonRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new LessonNotFoundException(id));

        User currentUser = authorizationService.requireCurrentUser();

        authorizationService.requireCanModifyCourse(lesson.getSection().getCourse(), currentUser);
        authorizationService.requireCanModifyPublishedLesson(currentUser, lesson.getStatus() == LessonStatusEnum.published);

        lesson.setDeletedAt(LocalDateTime.now());

        lessonRepository.save(lesson);
        lessonVideoStorageService.deleteIfManaged(lesson.getVideoUrl());
    }
}
