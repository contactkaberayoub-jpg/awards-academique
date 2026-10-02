package com.awardsacademique.instructorstudent.service.interfaces;

import com.awardsacademique.instructorstudent.dto.response.InstructorCourseStudentDetailResponse;
import com.awardsacademique.instructorstudent.dto.response.InstructorCourseStudentsResponse;

import java.util.UUID;

/**
 * Read-only instructor view of the students enrolled in one of the instructor's courses.
 * The instructor may only ever see students of courses they own (administrators may see any).
 */
public interface InstructorCourseStudentService {

    InstructorCourseStudentsResponse getCourseStudents(UUID courseId);

    InstructorCourseStudentDetailResponse getCourseStudentDetail(UUID courseId, UUID studentId);
}