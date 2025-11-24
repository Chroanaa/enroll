"use client";

import React from "react";
import { FileText, Trash2 } from "lucide-react";
import { CurriculumCourse } from "../../types";
import { colors } from "../../colors";

interface CourseListProps {
  courses: CurriculumCourse[];
  onEditCourse: (index: number) => void;
  onDeleteCourse: (index: number) => void;
}

const CourseList: React.FC<CourseListProps> = ({
  courses,
  onEditCourse,
  onDeleteCourse,
}) => {
  if (courses.length === 0) return null;

  return (
    <div className='space-y-2 max-h-64 overflow-y-auto'>
      {courses.map((course, index) => (
        <div
          key={course.id || index}
          className='flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg'
        >
          <div className='flex-1'>
            <div className='flex items-center gap-2'>
              <span className='font-medium text-sm' style={{ color: colors.primary }}>
                {course.course_code}
              </span>
              <span className='text-sm text-gray-600'>
                - {course.descriptive_title}
              </span>
            </div>
            <div className='text-xs text-gray-500 mt-1'>
              Year {course.year_level}, Sem {course.semester} |{" "}
              {course.units_total} units
              {course.prerequisite && ` | Pre: ${course.prerequisite}`}
            </div>
          </div>
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={() => onEditCourse(index)}
              className='p-1.5 rounded text-blue-600 hover:bg-blue-50'
            >
              <FileText className='w-4 h-4' />
            </button>
            <button
              type='button'
              onClick={() => onDeleteCourse(index)}
              className='p-1.5 rounded text-red-600 hover:bg-red-50'
            >
              <Trash2 className='w-4 h-4' />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CourseList;

