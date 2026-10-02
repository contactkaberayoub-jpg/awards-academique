package com.awardsacademique.progress.service.interfaces;

import com.awardsacademique.progress.dto.request.CreateLessonProgressRequest;
import com.awardsacademique.progress.dto.request.UpdateLessonProgressRequest;
import com.awardsacademique.progress.dto.response.CourseProgressResponse;
import com.awardsacademique.progress.dto.response.LessonProgressResponse;

import java.util.List;
import java.util.UUID;

public interface LessonProgressService {

    LessonProgressResponse create(CreateLessonProgressRequest request);

    LessonProgressResponse markLessonCompleted(UUID lessonId);

    LessonProgressResponse markLessonStarted(UUID lessonId);

    LessonProgressResponse update(UUID id, UpdateLessonProgressRequest request);

    LessonProgressResponse getByLesson(UUID lessonId);

    List<LessonProgressResponse> getByEnrollment(UUID enrollmentId);

    CourseProgressResponse getCourseProgressByCourse(UUID courseId);

    CourseProgressResponse getCourseProgressByEnrollment(UUID enrollmentId);

    void delete(UUID id);
}
