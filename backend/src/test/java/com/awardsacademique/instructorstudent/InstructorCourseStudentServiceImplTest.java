package com.awardsacademique.instructorstudent;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.certificates.Repository.CertificateRepository;
import com.awardsacademique.certificates.entity.Certificate;
import com.awardsacademique.common.pipeline.ProgressionService;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.enrollments.entity.Enrollment;
import com.awardsacademique.enrollments.entity.EnrollmentStatusEnum;
import com.awardsacademique.enrollments.exception.EnrollmentNotFoundException;
import com.awardsacademique.instructorstudent.dto.response.FinalQuizProgressResponse;
import com.awardsacademique.instructorstudent.dto.response.InstructorCourseStudentDetailResponse;
import com.awardsacademique.instructorstudent.dto.response.InstructorCourseStudentsResponse;
import com.awardsacademique.instructorstudent.dto.response.InstructorStudentCourseResponse;
import com.awardsacademique.instructorstudent.dto.response.StudentLessonProgressResponse;
import com.awardsacademique.instructorstudent.service.impl.InstructorCourseStudentServiceImpl;
import com.awardsacademique.lessons.Repository.LessonRepository;
import com.awardsacademique.lessons.entity.Lesson;
import com.awardsacademique.progress.Repository.LessonProgressRepository;
import com.awardsacademique.progress.entity.LessonProgress;
import com.awardsacademique.quizattempts.Repository.QuizAttemptRepository;
import com.awardsacademique.quizattempts.entity.AttemptStatusEnum;
import com.awardsacademique.quizattempts.entity.QuizAttempt;
import com.awardsacademique.quizzes.Repository.QuizRepository;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Service-level tests for the instructor students view: RBAC isolation (owner / admin only),
 * database-driven list assembly and full student detail (lessons, final exam, certificate,
 * same-instructor courses). Every repository interaction is mocked per call, mirroring the
 * batched queries used in production.
 */
@ExtendWith(MockitoExtension.class)
class InstructorCourseStudentServiceImplTest {

    @Mock private CourseRepository courseRepository;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private LessonRepository lessonRepository;
    @Mock private LessonProgressRepository lessonProgressRepository;
    @Mock private QuizRepository quizRepository;
    @Mock private QuizAttemptRepository quizAttemptRepository;
    @Mock private CertificateRepository certificateRepository;
    @Mock private ProgressionService progressionService;
    @Mock private AuthorizationService authorizationService;

    private InstructorCourseStudentServiceImpl service;

    private User instructor;
    private User student;
    private Course course;
    private UUID courseId;

    @BeforeEach
    void setUp() {
        service = new InstructorCourseStudentServiceImpl(
                courseRepository, enrollmentRepository, lessonRepository, lessonProgressRepository,
                quizRepository, quizAttemptRepository, certificateRepository,
                progressionService, authorizationService);
        instructor = User.builder()
                .id(UUID.randomUUID())
                .firstName("Jean")
                .lastName("Dupont")
                .email("jean.dupont@test.com")
                .build();
        student = User.builder()
                .id(UUID.randomUUID())
                .firstName("Alice")
                .lastName("Martin")
                .email("alice.martin@test.com")
                .build();
        courseId = UUID.randomUUID();
        course = Course.builder()
                .id(courseId)
                .title("Java Spring Boot")
                .instructor(instructor)
                .build();
    }

    private Enrollment enrollment(UUID id, User user, Course course, EnrollmentStatusEnum status) {
        return Enrollment.builder()
                .id(id)
                .user(user)
                .course(course)
                .status(status)
                .build();
    }

    private void allowAccess(User currentUser) {
        when(authorizationService.requireCurrentUser()).thenReturn(currentUser);
        when(authorizationService.isAdministrator(currentUser)).thenReturn(false);
        when(authorizationService.ownsCourse(course, currentUser)).thenReturn(true);
    }

    private Course findCourse() {
        when(courseRepository.findByIdAndDeletedAtIsNull(courseId))
                .thenReturn(Optional.of(course));
        return course;
    }

    // ==== List ====

    @Test
    void getCourseStudents_ownerSeesOnlyDbEnrollments() {
        findCourse();
        allowAccess(instructor);
        Enrollment enrollment = enrollment(UUID.randomUUID(), student, course, EnrollmentStatusEnum.active);

        when(enrollmentRepository.findByCourseIdOrderByEnrolledAtDesc(courseId))
                .thenReturn(List.of(enrollment));
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId)).thenReturn(List.of());
        when(progressionService.orderedLessonsOfCourse(courseId)).thenReturn(List.of());
        when(lessonProgressRepository.countCompletedLessonsGroupedByUserOnCourse(courseId)).thenReturn(List.of());
        when(quizAttemptRepository.countPassedLessonQuizzesGroupedByUser(courseId)).thenReturn(List.of());
        when(certificateRepository.findByCourseIdOrderByIssuedAtDesc(courseId)).thenReturn(List.of());

        InstructorCourseStudentsResponse response = service.getCourseStudents(courseId);

        assertEquals(courseId, response.getCourseId());
        assertEquals("Java Spring Boot", response.getCourseTitle());
        assertEquals(1, response.getTotalStudents());
        assertEquals(1, response.getStudents().size());
        assertEquals("Alice Martin", response.getStudents().get(0).getStudentName());
        assertEquals("alice.martin@test.com", response.getStudents().get(0).getStudentEmail());
        assertEquals(EnrollmentStatusEnum.active, response.getStudents().get(0).getEnrollmentStatus());
        assertEquals(0, new BigDecimal("0.00")
                .compareTo(response.getStudents().get(0).getCompletionPercentage()));
        assertNull(response.getStudents().get(0).getCertificate());
        assertNull(response.getFinalQuiz());
    }

    @Test
    void getCourseStudents_otherInstructorsCourse_throwsAccessDenied() {
        findCourse();
        when(authorizationService.requireCurrentUser()).thenReturn(instructor);
        when(authorizationService.isAdministrator(instructor)).thenReturn(false);
        when(authorizationService.ownsCourse(course, instructor)).thenReturn(false);

        assertThrows(AccessDeniedException.class, () -> service.getCourseStudents(courseId));

        verify(enrollmentRepository, never()).findByCourseIdOrderByEnrolledAtDesc(any());
    }

    @Test
    void getCourseStudents_adminCanSeeAnyCourse() {
        findCourse();
        User admin = User.builder()
                .id(UUID.randomUUID())
                .firstName("Admin")
                .lastName("Root")
                .email("admin@test.com")
                .build();
        when(authorizationService.requireCurrentUser()).thenReturn(admin);
        when(authorizationService.isAdministrator(admin)).thenReturn(true);
        when(enrollmentRepository.findByCourseIdOrderByEnrolledAtDesc(courseId)).thenReturn(List.of());

        InstructorCourseStudentsResponse response = service.getCourseStudents(courseId);

        assertEquals(0, response.getTotalStudents());
        assertTrue(response.getStudents().isEmpty());
        verify(authorizationService, never()).ownsCourse(any(), any());
    }

    @Test
    void getCourseStudents_emptyEnrollment_courseReturnsZeroStudents() {
        findCourse();
        allowAccess(instructor);
        when(enrollmentRepository.findByCourseIdOrderByEnrolledAtDesc(courseId)).thenReturn(List.of());

        InstructorCourseStudentsResponse response = service.getCourseStudents(courseId);

        assertEquals(0, response.getTotalStudents());
        assertTrue(response.getStudents().isEmpty());
    }

    // ==== Detail ====

    @Test
    void getCourseStudentDetail_returnsLessonsFinalQuizCertificateAndOtherCourses() {
        findCourse();
        allowAccess(instructor);

        Lesson l1 = Lesson.builder().id(UUID.randomUUID())
                .title("Introduction").displayOrder(1).build();
        Lesson l2 = Lesson.builder().id(UUID.randomUUID())
                .title("Avance").displayOrder(2).build();
        when(progressionService.orderedLessonsOfCourse(courseId)).thenReturn(List.of(l1, l2));

        Quiz finalQuiz = Quiz.builder()
                .id(UUID.randomUUID()).course(course).title("Examen final")
                .status(QuizStatusEnum.published).passingScore(70).maxAttempts(3).build();
        Quiz linked = Quiz.builder()
                .id(UUID.randomUUID()).course(course).lesson(l1)
                .status(QuizStatusEnum.published).build();
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId))
                .thenReturn(List.of(finalQuiz, linked));

        Enrollment enrollment = enrollment(UUID.randomUUID(), student, course, EnrollmentStatusEnum.active);
        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), courseId))
                .thenReturn(Optional.of(enrollment));

        LessonProgress completedRow = LessonProgress.builder()
                .id(UUID.randomUUID()).enrollment(enrollment).lesson(l1).completed(true).build();
        when(lessonProgressRepository.findByEnrollmentIdOrderByLesson_DisplayOrderAsc(enrollment.getId()))
                .thenReturn(List.of(completedRow));

        when(quizAttemptRepository.findPassedLessonQuizIdsByUserOnCourse(student.getId(), courseId))
                .thenReturn(List.of(linked.getId()));

        QuizAttempt passedAttempt = QuizAttempt.builder()
                .id(UUID.randomUUID()).user(student).quiz(finalQuiz)
                .status(AttemptStatusEnum.passed).score(new BigDecimal("85")).build();
        when(quizAttemptRepository.findByUserIdAndQuizIdOrderByStartedAtDesc(student.getId(), finalQuiz.getId()))
                .thenReturn(List.of(passedAttempt));

        Certificate certificate = Certificate.builder()
                .id(UUID.randomUUID()).user(student).course(course).certificateCode("CERT-ABC")
                .issuedAt(java.time.LocalDateTime.of(2026, 1, 1, 12, 0)).build();
        when(certificateRepository.findByUserIdAndCourseId(student.getId(), courseId))
                .thenReturn(Optional.of(certificate));

        Course course2 = Course.builder()
                .id(UUID.randomUUID()).title("Spring Boot Avance").instructor(instructor).build();
        when(courseRepository.findByInstructorIdAndDeletedAtIsNullAndIsActiveTrueOrderByCreatedAtDesc(instructor.getId()))
                .thenReturn(List.of(course, course2));

        Enrollment enrollment2 = enrollment(UUID.randomUUID(), student, course2, EnrollmentStatusEnum.active);
        when(enrollmentRepository.findByUserIdAndCourseIdInOrderByEnrolledAtDesc(eq(student.getId()), any()))
                .thenReturn(List.of(enrollment2));

        Object[] completedCount = new Object[]{ student.getId(), 1L };
        Object[] passedCount = new Object[]{ student.getId(), 1L };
        when(lessonProgressRepository.countCompletedLessonsGroupedByUserOnCourse(courseId))
                .thenReturn(java.util.Collections.singletonList(completedCount));
        when(lessonProgressRepository.countCompletedLessonsGroupedByUserOnCourse(course2.getId()))
                .thenReturn(List.of());
        when(quizAttemptRepository.countPassedLessonQuizzesGroupedByUser(courseId))
                .thenReturn(java.util.Collections.singletonList(passedCount));
        when(quizAttemptRepository.countPassedLessonQuizzesGroupedByUser(course2.getId()))
                .thenReturn(List.of());

        InstructorCourseStudentDetailResponse response =
                service.getCourseStudentDetail(courseId, student.getId());

        assertEquals(student.getId(), response.getUserId());
        assertEquals("Alice Martin", response.getStudentName());
        assertEquals(EnrollmentStatusEnum.active, response.getEnrollmentStatus());
        // 2 lessons + 1 published linked quiz = 3 steps; 1 lesson + 1 passed quiz = 2 steps
        // 66.67% * 0.7 + 30 (passed final) = 76.67
        assertEquals(0, new BigDecimal("76.67").compareTo(response.getCompletionPercentage()));

        // Lessons with real lock state.
        assertEquals(2, response.getLessons().size());
        StudentLessonProgressResponse first = response.getLessons().get(0);
        assertEquals("Introduction", first.getTitle());
        assertTrue(first.isCompleted());
        StudentLessonProgressResponse second = response.getLessons().get(1);
        assertEquals("Avance", second.getTitle());
        assertTrue(!second.isCompleted());
        assertTrue(!second.isLocked());

        // Final quiz result.
        assertNotNull(response.getFinalQuiz());
        assertTrue(response.getFinalQuiz().isAttempted());
        assertTrue(response.getFinalQuiz().isPassed());
        assertEquals(70, response.getFinalQuiz().getPassingScore());
        assertEquals(3, response.getFinalQuiz().getMaxAttempts());
        assertEquals(1, response.getFinalQuiz().getAttemptsUsed());
        assertEquals(0, new BigDecimal("85").compareTo(response.getFinalQuiz().getScore()));

        // Certificate.
        assertNotNull(response.getCertificate());
        assertEquals("CERT-ABC", response.getCertificate().getCertificateCode());

        // Same-instructor courses with the student's enrollment.
        assertEquals(1, response.getOtherCourses().size());
        InstructorStudentCourseResponse other = response.getOtherCourses().get(0);
        assertEquals(course2.getId(), other.getCourseId());
        assertEquals("Spring Boot Avance", other.getCourseTitle());
        assertEquals("active", other.getEnrollmentStatus());
    }

    @Test
    void getCourseStudentDetail_studentNotEnrolled_throwsEnrollmentNotFound() {
        findCourse();
        allowAccess(instructor);
        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), courseId))
                .thenReturn(Optional.empty());

        assertThrows(EnrollmentNotFoundException.class,
                () -> service.getCourseStudentDetail(courseId, student.getId()));
    }

    @Test
    void getCourseStudentDetail_finalQuizNotAttempted_showsZeroAndNotPassed() {
        findCourse();
        allowAccess(instructor);

        Quiz finalQuiz = Quiz.builder()
                .id(UUID.randomUUID()).course(course).title("Examen final")
                .status(QuizStatusEnum.published).passingScore(60).maxAttempts(3).build();
        when(quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId))
                .thenReturn(List.of(finalQuiz));

        Enrollment enrollment = enrollment(UUID.randomUUID(), student, course, EnrollmentStatusEnum.active);
        when(enrollmentRepository.findByUserIdAndCourseId(student.getId(), courseId))
                .thenReturn(Optional.of(enrollment));

        when(progressionService.orderedLessonsOfCourse(courseId)).thenReturn(List.of());
        when(lessonProgressRepository.findByEnrollmentIdOrderByLesson_DisplayOrderAsc(enrollment.getId()))
                .thenReturn(List.of());
        when(quizAttemptRepository.findPassedLessonQuizIdsByUserOnCourse(student.getId(), courseId))
                .thenReturn(List.of());
        when(quizAttemptRepository.findByUserIdAndQuizIdOrderByStartedAtDesc(student.getId(), finalQuiz.getId()))
                .thenReturn(List.of());
        when(certificateRepository.findByUserIdAndCourseId(student.getId(), courseId))
                .thenReturn(Optional.empty());
        when(courseRepository.findByInstructorIdAndDeletedAtIsNullAndIsActiveTrueOrderByCreatedAtDesc(instructor.getId()))
                .thenReturn(List.of(course));
        when(enrollmentRepository.findByUserIdAndCourseIdInOrderByEnrolledAtDesc(eq(student.getId()), any()))
                .thenReturn(List.of(enrollment));

        InstructorCourseStudentDetailResponse response =
                service.getCourseStudentDetail(courseId, student.getId());

        assertNotNull(response.getFinalQuiz());
        assertTrue(!response.getFinalQuiz().isAttempted());
        assertTrue(!response.getFinalQuiz().isPassed());
        assertNull(response.getFinalQuiz().getScore());
        assertEquals(0, response.getFinalQuiz().getAttemptsUsed());
        assertNull(response.getCertificate());
    }
}