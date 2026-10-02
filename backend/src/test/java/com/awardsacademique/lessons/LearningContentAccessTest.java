package com.awardsacademique.lessons;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.pipeline.ProgressionService;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.enrollments.entity.Enrollment;
import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import com.awardsacademique.enrollments.validation.EnrollmentValidator;
import com.awardsacademique.lessons.Repository.LessonRepository;
import com.awardsacademique.lessons.dto.request.CreateLessonRequest;
import com.awardsacademique.lessons.dto.response.LessonResponse;
import com.awardsacademique.lessons.entity.Lesson;
import com.awardsacademique.lessons.entity.LessonStatusEnum;
import com.awardsacademique.lessons.entity.LessonTypeEnum;
import com.awardsacademique.lessons.exception.LessonNotFoundException;
import com.awardsacademique.lessons.mapper.LessonMapper;
import com.awardsacademique.lessons.service.impl.LessonServiceImpl;
import com.awardsacademique.lessons.service.interfaces.LessonVideoStorageService;
import com.awardsacademique.lessons.validation.LessonValidator;
import com.awardsacademique.sections.Repository.SectionRepository;
import com.awardsacademique.sections.entity.Section;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Sprint 5: verifies that student access to learning content (lessons) requires
 * an active enrollment. Admins, instructors and course owners are exempt.
 */
@ExtendWith(MockitoExtension.class)
class LearningContentAccessTest {

    @Mock private LessonRepository lessonRepository;
    @Mock private LessonMapper lessonMapper;
    @Mock private LessonVideoStorageService lessonVideoStorageService;
    @Mock private AuthorizationService authorizationService;
    @Mock private SectionRepository sectionRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private ProgressionService progressionService;

    private LessonServiceImpl service;
    private LessonValidator lessonValidator;
    private EnrollmentValidator enrollmentValidator;

    @BeforeEach
    void setUp() {
        lessonValidator = new LessonValidator(sectionRepository, courseRepository);
        enrollmentValidator = new EnrollmentValidator(courseRepository, enrollmentRepository);
        service = new LessonServiceImpl(
                lessonRepository, lessonMapper, lessonValidator,
                lessonVideoStorageService, authorizationService, enrollmentValidator, progressionService);
    }

    private User student() {
        return User.builder().id(UUID.randomUUID()).build();
    }

    private User instructor() {
        return User.builder().id(UUID.randomUUID()).build();
    }

    private Course course(UUID id) {
        return Course.builder()
                .id(id)
                .status(CourseStatusEnum.published)
                .published(true)
                .isActive(true)
                .build();
    }

    private Section section(UUID id, Course course) {
        return Section.builder().id(id).course(course).build();
    }

    private Lesson lesson(UUID id, Section sec) {
        return Lesson.builder()
                .id(id)
                .section(sec)
                .status(LessonStatusEnum.published)
                .lessonType(LessonTypeEnum.text)
                .build();
    }

    private void stubStudentOnPublishedCourse(User student, Course course) {
        lenient().when(authorizationService.requireCurrentUser()).thenReturn(student);
        lenient().when(authorizationService.getCurrentUser()).thenReturn(Optional.of(student));
        when(authorizationService.isAdministrator(student)).thenReturn(false);
        when(authorizationService.isInstructor(student)).thenReturn(false);
        when(authorizationService.ownsCourse(course, student)).thenReturn(false);
        lenient().when(progressionService.isLessonUnlocked(any(), any())).thenReturn(true);
        lenient().when(progressionService.publishedQuizForLesson(any())).thenReturn(Optional.empty());
    }

    // A. Active enrollment → getById succeeds
    @Test
    void getById_studentWithActiveEnrollment_returnsLesson() {
        UUID lessonId = UUID.randomUUID();
        User student = student();
        Course course = course(UUID.randomUUID());
        Section sec = section(UUID.randomUUID(), course);
        Lesson les = lesson(lessonId, sec);
        LessonResponse resp = LessonResponse.builder().id(lessonId).build();

        when(lessonRepository.findByIdAndDeletedAtIsNull(lessonId)).thenReturn(Optional.of(les));
        doNothing().when(authorizationService).requireCanViewCourse(course);
        stubStudentOnPublishedCourse(student, course);

        Enrollment enrollment = Enrollment.builder().status(EnrollmentStatusEnum.active).build();
        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), course.getId()))
                .thenReturn(Optional.of(enrollment));
        when(lessonMapper.toResponse(les)).thenReturn(resp);

        LessonResponse result = service.getById(lessonId);

        assertEquals(lessonId, result.getId());
        verify(enrollmentRepository).findByUserIdAndCourseId(student.getId(), course.getId());
    }

    // Case 13: a non-privileged student cannot open a lesson that is still locked by progression.
    @Test
    void getById_studentWithEnrollment_lockedLesson_throwsNotFound() {
        UUID lessonId = UUID.randomUUID();
        User student = student();
        Course course = course(UUID.randomUUID());
        Section sec = section(UUID.randomUUID(), course);
        Lesson les = lesson(lessonId, sec);

        when(lessonRepository.findByIdAndDeletedAtIsNull(lessonId)).thenReturn(Optional.of(les));
        doNothing().when(authorizationService).requireCanViewCourse(course);
        stubStudentOnPublishedCourse(student, course);
        when(progressionService.isLessonUnlocked(student.getId(), les)).thenReturn(false);

        Enrollment enrollment = Enrollment.builder().status(EnrollmentStatusEnum.active).build();
        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), course.getId()))
                .thenReturn(Optional.of(enrollment));

        assertThrows(LessonNotFoundException.class, () -> service.getById(lessonId));
        verify(lessonMapper, never()).toResponse(any());
    }

    // B. No enrollment → getById throws AccessDeniedException
    @Test
    void getById_studentWithoutEnrollment_throwsAccessDenied() {        UUID lessonId = UUID.randomUUID();
        User student = student();
        Course course = course(UUID.randomUUID());
        Section sec = section(UUID.randomUUID(), course);
        Lesson les = lesson(lessonId, sec);

        when(lessonRepository.findByIdAndDeletedAtIsNull(lessonId)).thenReturn(Optional.of(les));
        doNothing().when(authorizationService).requireCanViewCourse(course);
        stubStudentOnPublishedCourse(student, course);

        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), course.getId()))
                .thenReturn(Optional.empty());

        assertThrows(AccessDeniedException.class, () -> service.getById(lessonId));
    }

    // B-¬A. Enrolled in CourseA but accessing CourseB lesson → denied
    @Test
    void getById_studentEnrolledInCourseA_accessingCourseB_throwsAccessDenied() {
        UUID lessonId = UUID.randomUUID();
        User student = student();
        Course courseB = course(UUID.randomUUID());
        Section sec = section(UUID.randomUUID(), courseB);
        Lesson les = lesson(lessonId, sec);

        when(lessonRepository.findByIdAndDeletedAtIsNull(lessonId)).thenReturn(Optional.of(les));
        doNothing().when(authorizationService).requireCanViewCourse(courseB);
        stubStudentOnPublishedCourse(student, courseB);

        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), courseB.getId()))
                .thenReturn(Optional.empty());

        assertThrows(AccessDeniedException.class, () -> service.getById(lessonId));
    }

    // C. Admin without enrollment → getById succeeds (exempt)
    @Test
    void getById_adminWithoutEnrollment_succeeds() {
        UUID lessonId = UUID.randomUUID();
        User admin = User.builder().id(UUID.randomUUID()).build();
        Course course = course(UUID.randomUUID());
        Section sec = section(UUID.randomUUID(), course);
        Lesson les = lesson(lessonId, sec);
        LessonResponse resp = LessonResponse.builder().id(lessonId).build();

        when(lessonRepository.findByIdAndDeletedAtIsNull(lessonId)).thenReturn(Optional.of(les));
        doNothing().when(authorizationService).requireCanViewCourse(course);
        when(authorizationService.requireCurrentUser()).thenReturn(admin);
        when(authorizationService.isAdministrator(admin)).thenReturn(true);
        when(lessonMapper.toResponse(les)).thenReturn(resp);

        LessonResponse result = service.getById(lessonId);
        assertEquals(lessonId, result.getId());
        verify(enrollmentRepository, never()).findByUserIdAndCourseId(any(), any());
    }

    // D. Instructor without enrollment → getById succeeds (exempt)
    @Test
    void getById_instructorWithoutEnrollment_succeeds() {
        UUID lessonId = UUID.randomUUID();
        User intr = instructor();
        Course course = course(UUID.randomUUID());
        Section sec = section(UUID.randomUUID(), course);
        Lesson les = lesson(lessonId, sec);
        LessonResponse resp = LessonResponse.builder().id(lessonId).build();

        when(lessonRepository.findByIdAndDeletedAtIsNull(lessonId)).thenReturn(Optional.of(les));
        doNothing().when(authorizationService).requireCanViewCourse(course);
        when(authorizationService.requireCurrentUser()).thenReturn(intr);
        when(authorizationService.isAdministrator(intr)).thenReturn(false);
        when(authorizationService.isInstructor(intr)).thenReturn(true);
        when(lessonMapper.toResponse(les)).thenReturn(resp);

        LessonResponse result = service.getById(lessonId);
        assertEquals(lessonId, result.getId());
        verify(enrollmentRepository, never()).findByUserIdAndCourseId(any(), any());
    }

    // E. getBySectionId: active enrollment → success
    @Test
    void getBySectionId_studentWithActiveEnrollment_returnsLessons() {
        User student = student();
        Course course = course(UUID.randomUUID());
        Section sec = section(UUID.randomUUID(), course);

        when(sectionRepository.findByIdAndDeletedAtIsNull(sec.getId())).thenReturn(Optional.of(sec));
        doNothing().when(authorizationService).requireCanViewCourse(course);
        stubStudentOnPublishedCourse(student, course);

        Enrollment enrollment = Enrollment.builder().status(EnrollmentStatusEnum.active).build();
        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), course.getId()))
                .thenReturn(Optional.of(enrollment));

        Lesson les = lesson(UUID.randomUUID(), sec);
        when(lessonRepository.findBySectionIdAndDeletedAtIsNullOrderByDisplayOrderAsc(sec.getId()))
                .thenReturn(java.util.List.of(les));

        LessonResponse resp = LessonResponse.builder().id(les.getId()).build();
        when(lessonMapper.toResponse(les)).thenReturn(resp);

        var result = service.getBySectionId(sec.getId());
        assertEquals(1, result.size());
    }

    // F. getBySectionId: no enrollment → status 200 listing, but protected content is redacted
    @Test
    void getBySectionId_studentWithoutEnrollment_seesRedactedMetadata() {
        User student = student();
        Course course = course(UUID.randomUUID());
        Section sec = section(UUID.randomUUID(), course);

        when(sectionRepository.findByIdAndDeletedAtIsNull(sec.getId())).thenReturn(Optional.of(sec));
        doNothing().when(authorizationService).requireCanViewCourse(course);
        stubStudentOnPublishedCourse(student, course);

        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), course.getId()))
                .thenReturn(Optional.empty());

        Lesson les = lesson(UUID.randomUUID(), sec);
        LessonResponse resp = LessonResponse.builder()
                .id(les.getId())
                .title(les.getTitle())
                .content("secret-body")
                .videoUrl("/api/lessons/videos/secret.mp4")
                .build();
        when(lessonRepository.findBySectionIdAndDeletedAtIsNullOrderByDisplayOrderAsc(sec.getId()))
                .thenReturn(java.util.List.of(les));
        when(lessonMapper.toResponse(les)).thenReturn(resp);

        var result = service.getBySectionId(sec.getId());
        assertEquals(1, result.size());
        assertNull(result.get(0).getContent(), "body must be redacted without enrollment");
        assertNull(result.get(0).getVideoUrl(), "video URL must be redacted without enrollment");
        assertNull(result.get(0).getUnlocked(), "unlock state must be redacted without enrollment");
        assertNull(result.get(0).getMandatoryQuizId(), "quiz gate must be redacted without enrollment");
        verify(enrollmentRepository).findByUserIdAndCourseId(student.getId(), course.getId());
        verify(progressionService, never()).isLessonUnlocked(any(), any());
    }

    // G. Student with enrollment accesses a DRAFT lesson by id → 404 (not exposed)
    @Test
    void getById_studentWithEnrollment_draftLesson_notFound() {
        UUID lessonId = UUID.randomUUID();
        User student = student();
        Course course = course(UUID.randomUUID());
        Section sec = section(UUID.randomUUID(), course);
        Lesson draft = Lesson.builder()
                .id(lessonId)
                .section(sec)
                .status(LessonStatusEnum.draft)
                .lessonType(LessonTypeEnum.text)
                .build();

        when(lessonRepository.findByIdAndDeletedAtIsNull(lessonId)).thenReturn(Optional.of(draft));
        doNothing().when(authorizationService).requireCanViewCourse(course);
        stubStudentOnPublishedCourse(student, course);

        Enrollment enrollment = Enrollment.builder().status(EnrollmentStatusEnum.active).build();
        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), course.getId()))
                .thenReturn(Optional.of(enrollment));

        assertThrows(LessonNotFoundException.class, () -> service.getById(lessonId));
        verify(lessonMapper, never()).toResponse(any());
    }

    // H. Admin can still fetch a draft lesson by id (exempt)
    @Test
    void getById_admin_draftLesson_succeeds() {
        UUID lessonId = UUID.randomUUID();
        User admin = User.builder().id(UUID.randomUUID()).build();
        Course course = course(UUID.randomUUID());
        Section sec = section(UUID.randomUUID(), course);
        Lesson draft = Lesson.builder()
                .id(lessonId)
                .section(sec)
                .status(LessonStatusEnum.draft)
                .lessonType(LessonTypeEnum.text)
                .build();
        LessonResponse resp = LessonResponse.builder().id(lessonId).build();

        when(lessonRepository.findByIdAndDeletedAtIsNull(lessonId)).thenReturn(Optional.of(draft));
        doNothing().when(authorizationService).requireCanViewCourse(course);
        when(authorizationService.requireCurrentUser()).thenReturn(admin);
        when(authorizationService.isAdministrator(admin)).thenReturn(true);
        when(lessonMapper.toResponse(draft)).thenReturn(resp);

        LessonResponse result = service.getById(lessonId);
        assertEquals(lessonId, result.getId());
    }

    // I. getBySectionId for a student lists only published lessons (draft hidden)
    @Test
    void getBySectionId_studentWithEnrollment_hidesDraftLessons() {
        User student = student();
        Course course = course(UUID.randomUUID());
        Section sec = section(UUID.randomUUID(), course);

        when(sectionRepository.findByIdAndDeletedAtIsNull(sec.getId())).thenReturn(Optional.of(sec));
        doNothing().when(authorizationService).requireCanViewCourse(course);
        stubStudentOnPublishedCourse(student, course);

        Enrollment enrollment = Enrollment.builder().status(EnrollmentStatusEnum.active).build();
        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), course.getId()))
                .thenReturn(Optional.of(enrollment));

        Lesson published = lesson(UUID.randomUUID(), sec);
        Lesson draft = Lesson.builder()
                .id(UUID.randomUUID())
                .section(sec)
                .status(LessonStatusEnum.draft)
                .lessonType(LessonTypeEnum.text)
                .build();
        when(lessonRepository.findBySectionIdAndDeletedAtIsNullOrderByDisplayOrderAsc(sec.getId()))
                .thenReturn(java.util.List.of(published, draft));

        when(lessonMapper.toResponse(published)).thenReturn(
                LessonResponse.builder().id(published.getId()).build());

        var result = service.getBySectionId(sec.getId());
        assertEquals(1, result.size());
        assertEquals(published.getId(), result.get(0).getId());
        verify(lessonMapper, never()).toResponse(draft);
    }

    // J. Instructor cannot publish a lesson on create (admin-only lockout)
    @Test
    void create_instructorPublishingStatus_denied() {
        UUID sectionId = UUID.randomUUID();
        User intr = instructor();
        Course course = course(UUID.randomUUID());
        Section sec = section(UUID.randomUUID(), course);

        when(authorizationService.requireCurrentUser()).thenReturn(intr);
        when(sectionRepository.findByIdAndDeletedAtIsNull(sectionId)).thenReturn(Optional.of(sec));
        doNothing().when(authorizationService).requireCanModifyCourse(course, intr);
        doThrow(new AccessDeniedException("Only administrators can publish lessons"))
                .when(authorizationService).requireCanPublishLesson(intr);

        CreateLessonRequest request = CreateLessonRequest.builder()
                .status(LessonStatusEnum.published)
                .lessonType(LessonTypeEnum.text)
                .content("content")
                .build();

        assertThrows(AccessDeniedException.class, () -> service.create(sectionId, request));
        verify(lessonRepository, never()).save(any());
    }
}
