package com.awardsacademique.quizzes.service.impl;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.lessons.entity.Lesson;
import com.awardsacademique.questions.Repository.QuestionRepository;
import com.awardsacademique.quizzes.Repository.QuizRepository;
import com.awardsacademique.quizzes.dto.request.CreateQuizRequest;
import com.awardsacademique.quizzes.dto.request.UpdateQuizRequest;
import com.awardsacademique.quizzes.dto.response.QuizResponse;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import com.awardsacademique.quizzes.exception.QuizNotFoundException;
import com.awardsacademique.quizzes.mapper.QuizMapper;
import com.awardsacademique.quizzes.service.interfaces.QuizService;
import com.awardsacademique.quizzes.validation.QuizValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizServiceImpl implements QuizService {

    private final QuizRepository quizRepository;
    private final QuizMapper quizMapper;
    private final CourseRepository courseRepository;
    private final QuestionRepository questionRepository;
    private final AuthorizationService authorizationService;
    private final QuizValidator quizValidator;

    private QuizResponse toResponseWithCount(Quiz quiz) {
        QuizResponse response = quizMapper.toResponse(quiz);
        response.setQuestionCount(questionRepository.countByQuizId(quiz.getId()));
        return response;
    }

    private Quiz resolve(UUID id) {
        return quizRepository.findById(id)
                .orElseThrow(() -> new QuizNotFoundException(id));
    }

    private void requireCanManage(Course course, User user) {
        if (authorizationService.isAdministrator(user)) {
            return;
        }
        authorizationService.requireApprovedInstructor(user);
        if (!authorizationService.ownsCourse(course, user)) {
            throw new AccessDeniedException("You can only manage quizzes for your own courses");
        }
    }

    @Override
    @Transactional
    public QuizResponse create(CreateQuizRequest request) {
        User currentUser = authorizationService.requireCurrentUser();
        Course course = quizValidator.resolveCourse(request.getCourseId());
        requireCanManage(course, currentUser);

        Lesson lesson = quizValidator.resolveLesson(request.getLessonId(), course.getId());

        // A course-level quiz (no lesson link) is the course's final exam: only one is allowed
        // per course. Duplicate final exams would make the completion model ambiguous.
        if (lesson == null && quizRepository.existsByCourseIdAndLessonIsNull(course.getId())) {
            throw new IllegalArgumentException(
                    "This course already has a final exam; only one course-level quiz is allowed");
        }

        QuizStatusEnum status = request.getStatus() == null ? QuizStatusEnum.draft : request.getStatus();
        if (status == QuizStatusEnum.published) {
            authorizationService.requireCanPublishLesson(currentUser);
        }

        Quiz quiz = Quiz.builder()
                .course(course)
                .lesson(lesson)
                .title(request.getTitle())
                .status(status)
                .passingScore(request.getPassingScore() != null ? request.getPassingScore() : 70)
                .maxAttempts(request.getMaxAttempts() != null ? request.getMaxAttempts() : 3)
                .build();

        return toResponseWithCount(quizRepository.save(quiz));
    }

    @Override
    @Transactional
    public QuizResponse update(UUID id, UpdateQuizRequest request) {
        Quiz quiz = resolve(id);
        User currentUser = authorizationService.requireCurrentUser();
        requireCanManage(quiz.getCourse(), currentUser);

        if (quiz.getStatus() == QuizStatusEnum.published && !authorizationService.isAdministrator(currentUser)) {
            throw new AccessDeniedException("Published quizzes can only be modified by administrators");
        }

        if (request.getTitle() != null) {
            quiz.setTitle(request.getTitle());
        }
        if (request.getPassingScore() != null) {
            quiz.setPassingScore(request.getPassingScore());
        }
        if (request.getMaxAttempts() != null) {
            quiz.setMaxAttempts(request.getMaxAttempts());
        }
        if (request.getLessonId() != null) {
            quiz.setLesson(quizValidator.resolveLesson(request.getLessonId(), quiz.getCourse().getId()));
        }
        if (request.getStatus() != null) {
            if (request.getStatus() == QuizStatusEnum.published) {
                authorizationService.requireCanPublishLesson(currentUser);
            }
            quiz.setStatus(request.getStatus());
        }

        return toResponseWithCount(quizRepository.save(quiz));
    }

    @Override
    @Transactional(readOnly = true)
    public QuizResponse getById(UUID id) {
        Quiz quiz = resolve(id);
        User currentUser = authorizationService.requireCurrentUser();
        requireCanManage(quiz.getCourse(), currentUser);
        return toResponseWithCount(quiz);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuizResponse> getByCourse(UUID courseId) {
        Course course = quizValidator.resolveCourse(courseId);
        User currentUser = authorizationService.requireCurrentUser();
        requireCanManage(course, currentUser);
        return quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId).stream()
                .map(this::toResponseWithCount)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuizResponse> getAll() {
        User currentUser = authorizationService.requireCurrentUser();
        List<Quiz> quizzes;
        if (authorizationService.isAdministrator(currentUser)) {
            quizzes = quizRepository.findAll();
        } else if (authorizationService.isInstructor(currentUser)) {
            List<UUID> instructorCourseIds = courseRepository
                    .findByInstructorIdAndDeletedAtIsNullAndIsActiveTrueOrderByCreatedAtDesc(currentUser.getId())
                    .stream()
                    .map(Course::getId)
                    .collect(Collectors.toList());
            quizzes = quizRepository.findByCourseIdInOrderByCreatedAtDesc(instructorCourseIds);
        } else {
            throw new AccessDeniedException("Students cannot manage quizzes");
        }
        return quizzes.stream()
                .map(this::toResponseWithCount)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public QuizResponse publish(UUID id) {
        authorizationService.requireAdministrator();
        Quiz quiz = resolve(id);
        quizValidator.validatePublish(quiz.getStatus());
        quiz.setStatus(QuizStatusEnum.published);
        return toResponseWithCount(quizRepository.save(quiz));
    }

    @Override
    @Transactional
    public QuizResponse archive(UUID id) {
        authorizationService.requireAdministrator();
        Quiz quiz = resolve(id);
        quizValidator.validateArchive(quiz.getStatus());
        quiz.setStatus(QuizStatusEnum.archived);
        return toResponseWithCount(quizRepository.save(quiz));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Quiz quiz = resolve(id);
        User currentUser = authorizationService.requireCurrentUser();
        authorizationService.requireCanModifyCourse(quiz.getCourse(), currentUser);

        questionRepository.deleteAll(questionRepository.findByQuizIdOrderByDisplayOrderAsc(id));
        quizRepository.delete(quiz);
    }
}


