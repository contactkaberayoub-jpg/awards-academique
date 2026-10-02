package com.awardsacademique.instructorstudent.service.impl;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.certificates.Repository.CertificateRepository;
import com.awardsacademique.certificates.entity.Certificate;
import com.awardsacademique.common.pipeline.ProgressionService;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.exception.CourseNotFoundException;
import com.awardsacademique.enrollments.Repository.EnrollmentRepository;
import com.awardsacademique.enrollments.entity.Enrollment;
import com.awardsacademique.enrollments.exception.EnrollmentNotFoundException;
import com.awardsacademique.instructorstudent.dto.response.FinalQuizProgressResponse;
import com.awardsacademique.instructorstudent.dto.response.InstructorCourseStudentDetailResponse;
import com.awardsacademique.instructorstudent.dto.response.InstructorCourseStudentResponse;
import com.awardsacademique.instructorstudent.dto.response.InstructorCourseStudentsResponse;
import com.awardsacademique.instructorstudent.dto.response.InstructorCourseStudentsResponse.QuizInfo;
import com.awardsacademique.instructorstudent.dto.response.InstructorStudentCourseResponse;
import com.awardsacademique.instructorstudent.dto.response.StudentCertificateResponse;
import com.awardsacademique.instructorstudent.dto.response.StudentLessonProgressResponse;
import com.awardsacademique.instructorstudent.service.interfaces.InstructorCourseStudentService;
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
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Batched, read-only instructor view of a course's students. Since every student row of a
 * course is produced from a handful of aggregated repository queries (one per data dimension),
 * the implementation avoids the classic N+1 per-student access pattern.
 */
@Service
@RequiredArgsConstructor
public class InstructorCourseStudentServiceImpl implements InstructorCourseStudentService {

    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final QuizRepository quizRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final CertificateRepository certificateRepository;
    private final ProgressionService progressionService;
    private final AuthorizationService authorizationService;

    @Override
    @Transactional(readOnly = true)
    public InstructorCourseStudentsResponse getCourseStudents(UUID courseId) {
        Course course = requireCourseAccess(courseId);

        List<Enrollment> enrollments = enrollmentRepository
                .findByCourseIdOrderByEnrolledAtDesc(courseId);

        List<Quiz> quizzes = quizzesOf(courseId);
        Quiz finalQuiz = courseLevelQuiz(quizzes);

        Map<UUID, List<QuizAttempt>> finalAttemptsByUser =
                finalQuiz == null ? Map.of() : groupAttempts(finalAttempts(finalQuiz.getId()));
        Map<UUID, Certificate> certificateByUser =
                groupByUser(certificateRepository.findByCourseIdOrderByIssuedAtDesc(courseId));
        Map<UUID, BigDecimal> percentages =
                percentagesByEnrollmentId(enrollments, quizzes, finalQuiz, finalAttemptsByUser);

        List<InstructorCourseStudentResponse> students = new ArrayList<>(enrollments.size());
        for (Enrollment enrollment : enrollments) {
            User student = enrollment.getUser();
            UUID userId = student.getId();

            students.add(InstructorCourseStudentResponse.builder()
                    .enrollmentId(enrollment.getId())
                    .userId(userId)
                    .studentName(student.getFirstName() + " " + student.getLastName())
                    .studentEmail(student.getEmail())
                    .enrollmentStatus(enrollment.getStatus())
                    .completionPercentage(percentages.get(enrollment.getId()))
                    .enrolledAt(toOffset(enrollment.getEnrolledAt()))
                    .completedAt(toOffset(enrollment.getCompletedAt()))
                    .finalQuiz(buildFinalQuizProgress(finalQuiz, finalAttemptsByUser.get(userId)))
                    .certificate(toCertificateResponse(certificateByUser.get(userId)))
                    .build());
        }

        return InstructorCourseStudentsResponse.builder()
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .totalStudents(students.size())
                .finalQuiz(toQuizInfo(finalQuiz))
                .students(students)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public InstructorCourseStudentDetailResponse getCourseStudentDetail(UUID courseId, UUID studentId) {
        Course course = requireCourseAccess(courseId);

        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(studentId, courseId)
                .orElseThrow(() -> new EnrollmentNotFoundException(
                        "Student " + studentId + " is not enrolled in course " + courseId));

        List<Lesson> lessons = progressionService.orderedLessonsOfCourse(courseId);
        List<Quiz> quizzes = quizzesOf(courseId);
        Quiz finalQuiz = courseLevelQuiz(quizzes);

        Map<UUID, Quiz> mandatoryByLesson = new HashMap<>();
        for (Quiz quiz : quizzes) {
            if (quiz.getLesson() != null
                    && quiz.getStatus() == QuizStatusEnum.published) {
                mandatoryByLesson.put(quiz.getLesson().getId(), quiz);
            }
        }

        List<LessonProgress> lessonProgressRows = lessonProgressRepository
                .findByEnrollmentIdOrderByLesson_DisplayOrderAsc(enrollment.getId());
        Map<UUID, Boolean> completedLessonIds = lessonProgressRows.stream()
                .filter(LessonProgress::isCompleted)
                .collect(Collectors.toMap(
                        row -> row.getLesson().getId(), row -> Boolean.TRUE, (a, b) -> a,
                        LinkedHashMap::new));
        Map<UUID, Boolean> passedMandatoryQuizIds = quizAttemptRepository
                .findPassedLessonQuizIdsByUserOnCourse(studentId, courseId).stream()
                .collect(Collectors.toMap(Function.identity(), q -> Boolean.TRUE, (a, b) -> a));

        List<StudentLessonProgressResponse> lessonResponses = new ArrayList<>(lessons.size());
        boolean allPreviousSatisfied = true;
        for (Lesson lesson : lessons) {
            boolean completed = completedLessonIds.containsKey(lesson.getId());
            Quiz mandatory = mandatoryByLesson.get(lesson.getId());
            boolean satisfied = completed
                    && (mandatory == null || passedMandatoryQuizIds.containsKey(mandatory.getId()));
            lessonResponses.add(StudentLessonProgressResponse.builder()
                    .lessonId(lesson.getId())
                    .title(lesson.getTitle())
                    .displayOrder(lesson.getDisplayOrder())
                    .completed(completed)
                    .locked(lesson == null ? allPreviousSatisfied : !allPreviousSatisfied)
                    .build());
            allPreviousSatisfied = allPreviousSatisfied && satisfied;
        }

        Map<UUID, List<QuizAttempt>> finalAttemptsByUser = finalQuiz == null
                ? Map.of()
                : groupAttempts(quizAttemptRepository.findByUserIdAndQuizIdOrderByStartedAtDesc(studentId, finalQuiz.getId()));

        List<Enrollment> otherEnrollments = otherCoursesOfInstructorForStudent(course, studentId);
        Map<UUID, BigDecimal> otherPercentages = percentagesByEnrollmentId(
                otherEnrollments, lessonRepository::findBySectionCourseIdAndDeletedAtIsNull,
                quizRepository::findByCourseIdOrderByCreatedAtDesc);
        Map<String, Certificate> otherCertificates = otherCertificatesByCourseAndUser(
                otherEnrollments.stream().map(e -> e.getCourse().getId()).collect(Collectors.toSet()));

        List<InstructorStudentCourseResponse> otherCourses = new ArrayList<>(otherEnrollments.size());
        for (Enrollment other : otherEnrollments) {
            UUID otherCourseId = other.getCourse().getId();
            otherCourses.add(InstructorStudentCourseResponse.builder()
                    .courseId(otherCourseId)
                    .courseTitle(other.getCourse().getTitle())
                    .enrollmentStatus(other.getStatus().name())
                    .completionPercentage(otherPercentages.get(other.getId()))
                    .completedAt(toOffset(other.getCompletedAt()))
                    .certificate(toCertificateResponse(otherCertificates.get(otherCourseId + ":" + other.getUser().getId())))
                    .build());
        }

        return InstructorCourseStudentDetailResponse.builder()
                .userId(studentId)
                .studentName(enrollment.getUser().getFirstName() + " " + enrollment.getUser().getLastName())
                .studentEmail(enrollment.getUser().getEmail())
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .enrollmentId(enrollment.getId())
                .enrollmentStatus(enrollment.getStatus())
                .completionPercentage(percentagesByEnrollmentId(
                        List.of(enrollment), quizzes, finalQuiz, finalAttemptsByUser).get(enrollment.getId()))
                .enrolledAt(toOffset(enrollment.getEnrolledAt()))
                .completedAt(toOffset(enrollment.getCompletedAt()))
                .finalQuiz(toDetailFinalQuiz(finalQuiz, finalAttemptsByUser.get(studentId)))
                .certificate(toCertificateResponse(certificateRepository
                        .findByUserIdAndCourseId(studentId, courseId).orElse(null)))
                .lessons(lessonResponses)
                .otherCourses(otherCourses)
                .build();
    }

    // ---------------------------------------------------------------------
    // Progress: batched, mirrors CourseCompletionPipeline.buildCourseProgress
    // ---------------------------------------------------------------------

    private Map<UUID, BigDecimal> percentagesByEnrollmentId(
            Collection<Enrollment> enrollments,
            List<Quiz> quizzes,
            Quiz finalQuiz,
            Map<UUID, List<QuizAttempt>> finalAttemptsByUser) {
        if (enrollments.isEmpty()) {
            return Map.of();
        }
        UUID courseId = enrollments.iterator().next().getCourse().getId();
        List<Lesson> lessons = progressionService.orderedLessonsOfCourse(courseId);

        long mandatoryQuizzes = quizzes.stream()
                .filter(q -> q.getLesson() != null && q.getStatus() == QuizStatusEnum.published)
                .count();
        long totalSteps = lessons.size() + mandatoryQuizzes;
        boolean finalQuizConfigured = finalQuiz != null
                && finalQuiz.getStatus() == QuizStatusEnum.published;

        Map<UUID, Long> completedLessonsByUser = toLongMap(
                lessonProgressRepository.countCompletedLessonsGroupedByUserOnCourse(courseId));
        Map<UUID, Long> passedQuizzesByUser = toLongMap(
                quizAttemptRepository.countPassedLessonQuizzesGroupedByUser(courseId));

        Map<UUID, BigDecimal> result = new HashMap<>(enrollments.size() * 2);
        for (Enrollment enrollment : enrollments) {
            UUID userId = enrollment.getUser().getId();
            long completedSteps = completedLessonsByUser.getOrDefault(userId, 0L)
                    + passedQuizzesByUser.getOrDefault(userId, 0L);

            BigDecimal lessonStepsPct = BigDecimal.ZERO;
            if (totalSteps > 0) {
                lessonStepsPct = BigDecimal.valueOf(completedSteps)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(totalSteps), 4, RoundingMode.HALF_UP);
            }

            BigDecimal percentage;
            if (finalQuizConfigured) {
                BigDecimal weighted = lessonStepsPct.multiply(BigDecimal.valueOf(0.70));
                if (finalQuizPassed(finalQuiz, finalAttemptsByUser.get(userId))) {
                    weighted = weighted.add(BigDecimal.valueOf(30));
                }
                percentage = weighted.setScale(2, RoundingMode.HALF_UP);
            } else {
                percentage = lessonStepsPct.setScale(2, RoundingMode.HALF_UP);
            }
            result.put(enrollment.getId(), percentage);
        }
        return result;
    }

    /** Same computation but loads the course data lazily per distinct course (detail flow). */
    private Map<UUID, BigDecimal> percentagesByEnrollmentId(
            Collection<Enrollment> enrollments,
            Function<UUID, List<Lesson>> lessonLoader,
            Function<UUID, List<Quiz>> quizLoader) {
        if (enrollments.isEmpty()) {
            return Map.of();
        }
        Map<UUID, List<Enrollment>> byCourse = enrollments.stream()
                .collect(Collectors.groupingBy(e -> e.getCourse().getId()));
        Map<UUID, BigDecimal> result = new HashMap<>();
        for (Map.Entry<UUID, List<Enrollment>> entry : byCourse.entrySet()) {
            UUID courseId = entry.getKey();
            List<Quiz> quizzes = quizLoader.apply(courseId);
            quizzes = quizzes == null ? List.of() : quizzes;
            Quiz finalQuiz = courseLevelQuiz(quizzes);
            Map<UUID, List<QuizAttempt>> attemptsByUser = finalQuiz == null
                    ? Map.of()
                    : groupAttempts(finalAttempts(finalQuiz.getId()));
            result.putAll(percentagesByEnrollmentId(entry.getValue(), quizzes, finalQuiz, attemptsByUser));
        }
        return result;
    }

    private boolean finalQuizPassed(Quiz finalQuiz, List<QuizAttempt> attempts) {
        if (finalQuiz == null || attempts == null) {
            return false;
        }
        int passingScore = finalQuiz.getPassingScore() == null ? 0 : finalQuiz.getPassingScore();
        return attempts.stream().anyMatch(a -> a.getStatus() == AttemptStatusEnum.passed
                && a.getScore() != null
                && a.getScore().compareTo(BigDecimal.valueOf(passingScore)) >= 0);
    }

    private FinalQuizProgressResponse buildFinalQuizProgress(Quiz finalQuiz, List<QuizAttempt> attempts) {
        if (finalQuiz == null) {
            return null;
        }
        if (attempts == null) {
            attempts = List.of();
        }
        BigDecimal bestScore = attempts.stream()
                .filter(a -> a.getStatus() == AttemptStatusEnum.passed && a.getScore() != null)
                .map(QuizAttempt::getScore)
                .max(BigDecimal::compareTo)
                .orElse(null);
        return FinalQuizProgressResponse.builder()
                .attempted(!attempts.isEmpty())
                .passed(finalQuizPassed(finalQuiz, attempts))
                .score(bestScore)
                .attemptsUsed(attempts.size())
                .build();
    }

    // ---------------------------------------------------------------------
    // "Courses de cet instructeur"
    // ---------------------------------------------------------------------

    private List<Enrollment> otherCoursesOfInstructorForStudent(Course course, UUID studentId) {
        if (course.getInstructor() == null) {
            return List.of();
        }
        List<Course> instructorCourses = courseRepository
                .findByInstructorIdAndDeletedAtIsNullAndIsActiveTrueOrderByCreatedAtDesc(
                        course.getInstructor().getId());
        if (instructorCourses.isEmpty()) {
            return List.of();
        }
        List<UUID> courseIds = instructorCourses.stream()
                .map(Course::getId)
                .collect(Collectors.toList());
        return enrollmentRepository.findByUserIdAndCourseIdInOrderByEnrolledAtDesc(studentId, courseIds);
    }

    private Map<String, Certificate> otherCertificatesByCourseAndUser(Collection<UUID> courseIds) {
        if (courseIds.isEmpty()) {
            return Map.of();
        }
        Map<String, Certificate> result = new HashMap<>();
        for (Certificate certificate : certificateRepository.findByCourseIdInOrderByIssuedAtDesc(courseIds)) {
            result.put(certificate.getCourse().getId() + ":" + certificate.getUser().getId(), certificate);
        }
        return result;
    }

    // ---------------------------------------------------------------------
    // Access control + small helpers
    // ---------------------------------------------------------------------

    private Course requireCourseAccess(UUID courseId) {
        Course course = courseRepository.findByIdAndDeletedAtIsNull(courseId)
                .orElseThrow(() -> new CourseNotFoundException(courseId));
        User currentUser = authorizationService.requireCurrentUser();
        if (authorizationService.isAdministrator(currentUser)) {
            return course;
        }
        authorizationService.requireApprovedInstructor(currentUser);
        if (!authorizationService.ownsCourse(course, currentUser)) {
            throw new AccessDeniedException("You can only manage students of your own courses");
        }
        return course;
    }

    private List<Quiz> quizzesOf(UUID courseId) {
        List<Quiz> quizzes = quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId);
        return quizzes == null ? List.of() : quizzes;
    }

    private Quiz courseLevelQuiz(List<Quiz> quizzes) {
        if (quizzes == null) {
            return null;
        }
        return quizzes.stream().filter(q -> q.getLesson() == null).findFirst().orElse(null);
    }

    private List<QuizAttempt> finalAttempts(UUID quizId) {
        List<QuizAttempt> attempts = quizAttemptRepository.findByQuizIdOrderByStartedAtDesc(quizId);
        return attempts == null ? List.of() : attempts;
    }

    private Map<UUID, List<QuizAttempt>> groupAttempts(List<QuizAttempt> attempts) {
        Map<UUID, List<QuizAttempt>> grouped = new LinkedHashMap<>();
        for (QuizAttempt attempt : attempts) {
            grouped.computeIfAbsent(attempt.getUser().getId(), k -> new ArrayList<>()).add(attempt);
        }
        return grouped;
    }

    private Map<UUID, Certificate> groupByUser(List<Certificate> certificates) {
        Map<UUID, Certificate> grouped = new HashMap<>();
        for (Certificate certificate : certificates) {
            grouped.putIfAbsent(certificate.getUser().getId(), certificate);
        }
        return grouped;
    }

    private Map<UUID, Long> toLongMap(List<Object[]> rows) {
        Map<UUID, Long> map = new HashMap<>();
        if (rows == null) {
            return map;
        }
        for (Object[] row : rows) {
            if (row.length >= 2 && row[0] != null) {
                UUID userId = UUID.fromString(String.valueOf(row[0]));
                long count = ((Number) row[1]).longValue();
                map.put(userId, count);
            }
        }
        return map;
    }

    private StudentCertificateResponse toCertificateResponse(Certificate certificate) {
        if (certificate == null) {
            return null;
        }
        return StudentCertificateResponse.builder()
                .certificateCode(certificate.getCertificateCode())
                .issuedAt(toOffset(certificate.getIssuedAt()))
                .build();
    }

    private QuizInfo toQuizInfo(Quiz quiz) {
        if (quiz == null) {
            return null;
        }
        return QuizInfo.builder()
                .id(quiz.getId())
                .title(quiz.getTitle())
                .passingScore(quiz.getPassingScore())
                .maxAttempts(quiz.getMaxAttempts())
                .status(quiz.getStatus())
                .build();
    }

    private InstructorCourseStudentDetailResponse.StudentFinalQuizResponse toDetailFinalQuiz(
            Quiz finalQuiz, List<QuizAttempt> attempts) {
        if (finalQuiz == null) {
            return null;
        }
        FinalQuizProgressResponse progress = buildFinalQuizProgress(finalQuiz, attempts);
        return InstructorCourseStudentDetailResponse.StudentFinalQuizResponse.builder()
                .id(finalQuiz.getId())
                .title(finalQuiz.getTitle())
                .passingScore(finalQuiz.getPassingScore())
                .maxAttempts(finalQuiz.getMaxAttempts())
                .status(finalQuiz.getStatus())
                .attempted(progress.isAttempted())
                .passed(progress.isPassed())
                .score(progress.getScore())
                .attemptsUsed(progress.getAttemptsUsed())
                .build();
    }

    private static OffsetDateTime toOffset(LocalDateTime dateTime) {
        return dateTime == null ? null : dateTime.atOffset(ZoneOffset.UTC);
    }
}