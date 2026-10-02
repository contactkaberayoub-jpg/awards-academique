package com.awardsacademique.lessons.validation;

import com.awardsacademique.courses.Repository.CourseRepository;
import com.awardsacademique.courses.entity.Course;
import com.awardsacademique.courses.exception.CourseNotFoundException;
import com.awardsacademique.lessons.entity.LessonTypeEnum;
import com.awardsacademique.lessons.entity.LessonStatusEnum;
import com.awardsacademique.lessons.utils.LessonHtmlSanitizer;
import com.awardsacademique.lessons.utils.LessonUtils;
import com.awardsacademique.sections.Repository.SectionRepository;
import com.awardsacademique.sections.entity.Section;
import com.awardsacademique.sections.exception.SectionNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LessonValidator {

    private final SectionRepository sectionRepository;
    private final CourseRepository courseRepository;

    public Section resolveSection(UUID sectionId) {
        return sectionRepository.findByIdAndDeletedAtIsNull(sectionId)
                .orElseThrow(() -> new SectionNotFoundException(sectionId));
    }

    public Course resolveCourse(UUID courseId) {
        return courseRepository.findByIdAndDeletedAtIsNull(courseId)
                .orElseThrow(() -> new CourseNotFoundException(courseId));
    }

    public void validateLessonContent(LessonTypeEnum lessonType, LessonStatusEnum status, String content, String videoUrl) {
        if (lessonType == LessonTypeEnum.video
                && status == LessonStatusEnum.published
                && !LessonUtils.hasText(videoUrl)) {
            throw new IllegalArgumentException("A video URL is required before publishing a video lesson");
        }

        if (lessonType != LessonTypeEnum.video && !LessonHtmlSanitizer.hasMeaningfulText(content)) {
            throw new IllegalArgumentException("Content is required for " + lessonType + " lessons");
        }

        if (lessonType != LessonTypeEnum.video && LessonUtils.hasText(videoUrl)) {
            throw new IllegalArgumentException("A video URL can only be attached to a video lesson");
        }
    }
}
