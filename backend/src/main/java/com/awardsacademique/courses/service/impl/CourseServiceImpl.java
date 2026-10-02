package com.awardsacademique.courses.service.impl;

import com.awardsacademique.authentification.entity.User;
import com.awardsacademique.categories.Repository.CategoryRepository;
import com.awardsacademique.categories.entity.Category;
import com.awardsacademique.common.rbac.AuthorizationService;
import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.dto.request.CreateCourseRequest;
import com.awardsacademique.courses.dto.request.UpdateCourseRequest;
import com.awardsacademique.courses.dto.response.CourseResponse;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.entity.CourseLevelEnum;
import com.awardsacademique.courses.entity.CourseStatusEnum;
import com.awardsacademique.courses.exception.CourseNotFoundException;
import com.awardsacademique.courses.mapper.CourseMapper;
import com.awardsacademique.courses.service.interfaces.CourseService;
import com.awardsacademique.lessons.Repository.LessonRepository;
import com.awardsacademique.lessons.entity.Lesson;
import com.awardsacademique.lessons.entity.LessonStatusEnum;
import com.awardsacademique.quizzes.Repository.QuizRepository;
import com.awardsacademique.quizzes.entity.Quiz;
import com.awardsacademique.quizzes.entity.QuizStatusEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final CourseMapper courseMapper;
    private final CategoryRepository categoryRepository;
    private final AuthorizationService authorizationService;
    private final LessonRepository lessonRepository;
    private final QuizRepository quizRepository;

    private String listToString(List<String> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        return String.join(CourseMapper.OBJECTIVE_SEPARATOR, list);
    }

    @Override
    @Transactional
    public CourseResponse create(CreateCourseRequest request) {
        User instructor = authorizationService.requireCurrentUser();
        if (!authorizationService.isAdministrator(instructor)) {
            authorizationService.requireApprovedInstructor(instructor);
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Category not found"));

        Course course = courseMapper.toEntity(request);
        course.setInstructor(instructor);
        course.setCategory(category);
        course.setStatus(CourseStatusEnum.pending);
        course.setPublished(false);
        course.setAverageRating(BigDecimal.ZERO);
        course.setReviewsCount(0);
        course.setEnrollmentsCount(0);
        course.setActive(true);
        if (course.getPrice() == null) {
            course.setPrice(BigDecimal.ZERO);
        }
        course.setCreatedAt(LocalDateTime.now());
        course.setUpdatedAt(LocalDateTime.now());

        Course saved = courseRepository.save(course);
        return courseMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public CourseResponse update(UUID id, UpdateCourseRequest request) {
        Course course = courseRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new CourseNotFoundException(id));

        User currentUser = authorizationService.requireCurrentUser();
        authorizationService.requireCanModifyCourse(course, currentUser);

        if (request.getTitle() != null) {
            course.setTitle(request.getTitle());
        }
        if (request.getSubtitle() != null) {
            course.setSubtitle(request.getSubtitle());
        }
        if (request.getDescription() != null) {
            course.setDescription(request.getDescription());
        }
        if (request.getLearningObjectives() != null) {
            course.setLearningObjectives(listToString(request.getLearningObjectives()));
        }
        if (request.getLevel() != null) {
            course.setLevel(request.getLevel());
        }
        if (request.getIsFree() != null) {
            course.setFree(request.getIsFree());
        }
        if (request.getPrice() != null) {
            course.setPrice(request.getPrice());
        } else if (course.getPrice() == null) {
            course.setPrice(BigDecimal.ZERO);
        }
        if (request.getCurrency() != null) {
            course.setCurrency(request.getCurrency());
        }
if (request.getThumbnailUrl() != null) {
              course.setThumbnailUrl(request.getThumbnailUrl());
          }
          if (request.getLogoUrl() != null) {
              course.setLogoUrl(request.getLogoUrl());
          }
          if (request.getPromoVideoUrl() != null) {
            course.setPromoVideoUrl(request.getPromoVideoUrl());
        }
        if (request.getDurationMinutes() != null) {
            course.setDurationMinutes(request.getDurationMinutes());
        }
        if (request.getIsActive() != null) {
            if (!authorizationService.isAdministrator(currentUser)) {
                throw new AccessDeniedException("Only administrators can change course activity");
            }
            course.setActive(request.getIsActive());
        }
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found"));
            course.setCategory(category);
        }

        course.setUpdatedAt(LocalDateTime.now());
        Course updated = courseRepository.save(course);
        return courseMapper.toResponse(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public CourseResponse getById(UUID id) {
        Course course = courseRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new CourseNotFoundException(id));
        authorizationService.requireCanViewCourse(course);
        return courseMapper.toResponse(course);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseResponse> getAll() {
        return scopeGetAll(authorizationService.requireCurrentUser());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseResponse> getMine() {
        User currentUser = authorizationService.requireCurrentUser();
        if (authorizationService.isAdministrator(currentUser)) {
            return scopeGetAll(currentUser);
        }
        if (authorizationService.isInstructor(currentUser)) {
            return courseRepository.findByInstructorIdAndDeletedAtIsNullAndIsActiveTrueOrderByCreatedAtDesc(currentUser.getId()).stream()
                    .map(courseMapper::toResponse)
                    .collect(Collectors.toList());
        }
        throw new AccessDeniedException("Students cannot manage courses");
    }

    private List<CourseResponse> scopeGetAll(User user) {
        if (authorizationService.isAdministrator(user)) {
            return courseRepository.findByIsActiveTrueAndDeletedAtIsNullOrderByCreatedAtDesc().stream()
                    .map(courseMapper::toResponse)
                    .collect(Collectors.toList());
        }
        if (authorizationService.isInstructor(user)) {
            return courseRepository.findByInstructorIdAndDeletedAtIsNullAndIsActiveTrueOrderByCreatedAtDesc(user.getId()).stream()
                    .map(courseMapper::toResponse)
                    .collect(Collectors.toList());
        }
        return getPublished();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseResponse> getPublished() {
        return courseRepository.findByIsActiveTrueAndDeletedAtIsNullAndStatusOrderByCreatedAtDesc(CourseStatusEnum.published).stream()
                .map(courseMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CourseResponse> search(UUID categoryId, CourseLevelEnum level, BigDecimal minPrice, BigDecimal maxPrice, Boolean isFree, String title, Pageable pageable) {
        String query = title == null || title.isBlank() ? null : "%" + title.trim().toLowerCase() + "%";
        return courseRepository.findSearch(query, categoryId, level, minPrice, maxPrice, isFree, CourseStatusEnum.published, pageable)
                .map(courseMapper::toResponse);
    }

    @Override
    @Transactional
    public CourseResponse publish(UUID id) {
        authorizationService.requireAdministrator();
        Course course = courseRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new CourseNotFoundException(id));

        CourseStatusEnum status = course.getStatus();
        if (status != CourseStatusEnum.pending
                && status != CourseStatusEnum.rejected
                && status != CourseStatusEnum.draft) {
            throw new IllegalStateException("Only pending or rejected courses can be published");
        }

        course.setStatus(CourseStatusEnum.published);
        course.setPublished(true);
        if (course.getPublishedAt() == null) {
            course.setPublishedAt(LocalDateTime.now());
        }
        course.setUpdatedAt(LocalDateTime.now());
        courseRepository.save(course);
        cascadePublishContent(course.getId());
        return courseMapper.toResponse(course);
    }

    /**
     * Atomically publishes the course's eligible (draft) lessons and quizzes.
     * Runs within the same transaction as the course approval, so any failure
     * rolls the whole transition back. Archived content is never auto-published.
     */
    private void cascadePublishContent(UUID courseId) {
        List<Lesson> lessons = lessonRepository.findBySectionCourseIdAndDeletedAtIsNull(courseId);
        for (Lesson lesson : lessons) {
            if (lesson.getStatus() == LessonStatusEnum.draft) {
                lesson.setStatus(LessonStatusEnum.published);
                lesson.setUpdatedAt(LocalDateTime.now());
                lessonRepository.save(lesson);
            }
        }

        List<Quiz> quizzes = quizRepository.findByCourseIdOrderByCreatedAtDesc(courseId);
        for (Quiz quiz : quizzes) {
            if (quiz.getStatus() == QuizStatusEnum.draft) {
                quiz.setStatus(QuizStatusEnum.published);
                quizRepository.save(quiz);
            }
        }
    }

    @Override
    @Transactional
    public CourseResponse reject(UUID id) {
        authorizationService.requireAdministrator();
        Course course = courseRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new CourseNotFoundException(id));

        if (course.getStatus() != CourseStatusEnum.pending) {
            throw new IllegalStateException("Only pending courses can be rejected");
        }

        course.setStatus(CourseStatusEnum.rejected);
        course.setPublished(false);
        course.setUpdatedAt(LocalDateTime.now());
        return courseMapper.toResponse(courseRepository.save(course));
    }

    @Override
    @Transactional
    public CourseResponse archive(UUID id) {
        authorizationService.requireAdministrator();
        Course course = courseRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new CourseNotFoundException(id));

        if (course.getStatus() != CourseStatusEnum.published) {
            throw new IllegalStateException("Only published courses can be archived");
        }

        course.setStatus(CourseStatusEnum.archived);
        course.setPublished(false);
        course.setUpdatedAt(LocalDateTime.now());
        return courseMapper.toResponse(courseRepository.save(course));
    }

    @Override
    @Transactional
    public CourseResponse restore(UUID id) {
        authorizationService.requireAdministrator();
        Course course = courseRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new CourseNotFoundException(id));

        if (course.getStatus() != CourseStatusEnum.archived) {
            throw new IllegalStateException("Only archived courses can be restored");
        }

        course.setStatus(CourseStatusEnum.published);
        course.setPublished(true);
        course.setPublishedAt(LocalDateTime.now());
        course.setUpdatedAt(LocalDateTime.now());
        courseRepository.save(course);
        cascadePublishContent(course.getId());
        return courseMapper.toResponse(course);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Course course = courseRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new CourseNotFoundException(id));

        User currentUser = authorizationService.requireCurrentUser();
        authorizationService.requireCanModifyCourse(course, currentUser);

        course.setDeletedAt(LocalDateTime.now());
        courseRepository.save(course);
    }
}
