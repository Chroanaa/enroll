"use client";

import React, { useState, useEffect } from "react";
import { CurriculumCourse, Subject } from "../../types";
import { colors } from "../../colors";
import { getSubjects } from "../../utils/subjectUtils";

interface CourseFormSectionProps {
  courseForm: Partial<CurriculumCourse> & { selectedSubjectId?: number };
  editingCourseIndex: number | null;
  onSubjectChange: (subjectId: number) => void;
  onUnitsChange: (units: number) => void;
  onYearLevelChange: (yearLevel: number) => void;
  onSemesterChange: (semester: 1 | 2) => void;
  onPrerequisiteChange: (prerequisite: string) => void;
  onAddCourse: () => void;
  onCancelEdit: () => void;
}

const CourseFormSection: React.FC<CourseFormSectionProps> = ({
  courseForm,
  editingCourseIndex,
  onSubjectChange,
  onUnitsChange,
  onYearLevelChange,
  onSemesterChange,
  onPrerequisiteChange,
  onAddCourse,
  onCancelEdit,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        const subjectsData = await getSubjects();
        const subjectsArray: Subject[] = Array.isArray(subjectsData)
          ? subjectsData
          : (Object.values(subjectsData) as Subject[]);
        // Filter only active subjects
        setSubjects(subjectsArray.filter((s) => s.status === "active"));
      } catch (error) {
        console.error("Error fetching subjects:", error);
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  return (
    <div className='bg-gray-50 p-4 rounded-xl mb-4 space-y-4'>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
        <select
          value={courseForm.selectedSubjectId || ""}
          onChange={(e) => {
            const subjectId = e.target.value ? parseInt(e.target.value) : 0;
            if (subjectId > 0) {
              onSubjectChange(subjectId);
            }
          }}
          className='rounded-lg px-3 py-2 border border-gray-200 text-sm bg-white md:col-span-3'
          style={{ color: "#6B5B4F" }}
          disabled={loading}
        >
          <option value=''>{loading ? "Loading subjects..." : "Select Subject"}</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name} ({subject.code}) - {subject.units} units
            </option>
          ))}
        </select>
      </div>

      {(courseForm.course_code || courseForm.descriptive_title) && (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white rounded-lg border border-gray-200'>
          <div>
            <span className='text-xs text-gray-500'>Course Code:</span>
            <p
              className='text-sm font-medium'
              style={{ color: colors.primary }}
            >
              {courseForm.course_code}
            </p>
          </div>
          <div>
            <span className='text-xs text-gray-500'>Descriptive Title:</span>
            <p
              className='text-sm font-medium'
              style={{ color: colors.primary }}
            >
              {courseForm.descriptive_title}
            </p>
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
        <input
          type='number'
          placeholder='Units'
          min='0'
          value={courseForm.units_total || 0}
          onChange={(e) => onUnitsChange(parseInt(e.target.value) || 0)}
          className='rounded-lg px-3 py-2 border border-gray-200 text-sm'
          style={{ color: "#6B5B4F" }}
        />
        <select
          value={courseForm.year_level || 1}
          onChange={(e) => onYearLevelChange(parseInt(e.target.value))}
          className='rounded-lg px-3 py-2 border border-gray-200 text-sm bg-white'
          style={{ color: "#6B5B4F" }}
        >
          <option value={1}>Year 1</option>
          <option value={2}>Year 2</option>
          <option value={3}>Year 3</option>
          <option value={4}>Year 4</option>
        </select>
        <select
          value={courseForm.semester || 1}
          onChange={(e) => onSemesterChange(parseInt(e.target.value) as 1 | 2)}
          className='rounded-lg px-3 py-2 border border-gray-200 text-sm bg-white'
          style={{ color: "#6B5B4F" }}
        >
          <option value={1}>Semester 1</option>
          <option value={2}>Semester 2</option>
        </select>
      </div>

      <div className='flex gap-2'>
        <input
          type='text'
          placeholder='Prerequisite (optional)'
          value={courseForm.prerequisite || ""}
          onChange={(e) => onPrerequisiteChange(e.target.value)}
          className='flex-1 rounded-lg px-3 py-2 border border-gray-200 text-sm'
          style={{ color: "#6B5B4F" }}
        />
        <button
          type='button'
          onClick={onAddCourse}
          className='px-4 py-2 rounded-lg text-white text-sm font-medium'
          style={{ backgroundColor: colors.secondary }}
        >
          {editingCourseIndex !== null ? "Update" : "Add"} Course
        </button>
        {editingCourseIndex !== null && (
          <button
            type='button'
            onClick={onCancelEdit}
            className='px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium'
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default CourseFormSection;
