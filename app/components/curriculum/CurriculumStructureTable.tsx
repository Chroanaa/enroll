"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Plus, Trash2, BookOpen, Edit } from "lucide-react";
import { CurriculumCourse, Subject } from "../../types";
import { colors } from "../../colors";
import { parsePrerequisites, formatPrerequisites } from "./utils";
import { getSubjects } from "../../utils/subjectUtils";

interface CurriculumStructureTableProps {
  courses: CurriculumCourse[];
  onAddSubjects: (yearLevel: number, semester: 1 | 2) => void;
  onRemoveCourse: (courseId: number) => void;
  onEditPrerequisite?: (course: CurriculumCourse) => void;
}

const CurriculumStructureTable: React.FC<CurriculumStructureTableProps> = ({
  courses,
  onAddSubjects,
  onRemoveCourse,
  onEditPrerequisite,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);

  // Fetch subjects for displaying prerequisite codes
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const subjectsData = await getSubjects();
        const subjectsArray: Subject[] = Array.isArray(subjectsData)
          ? subjectsData
          : (Object.values(subjectsData) as Subject[]);
        setSubjects(subjectsArray);
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };
    fetchSubjects();
  }, []);

  // Group courses by year and semester
  const groupedCourses = useMemo(() => {
    const grouped: Record<string, CurriculumCourse[]> = {};
    
    courses.forEach((course) => {
      const key = `Y${course.year_level}_S${course.semester}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(course);
    });

    return grouped;
  }, [courses]);

  // Get courses for selected year and semester
  const currentSemesterCourses = useMemo(() => {
    const key = `Y${selectedYear}_S${selectedSemester}`;
    return groupedCourses[key] || [];
  }, [groupedCourses, selectedYear, selectedSemester]);

  // Calculate total units for current semester
  const currentSemesterUnits = useMemo(() => {
    return currentSemesterCourses.reduce((total, course) => total + course.units_total, 0);
  }, [currentSemesterCourses]);

  // Get available years (years that have at least one course)
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    courses.forEach((course) => {
      years.add(course.year_level);
    });
    // Always show at least Year 1
    if (years.size === 0) {
      return [1];
    }
    return Array.from(years).sort();
  }, [courses]);

  // Determine max year (up to 4, or highest year with courses)
  const maxYear = useMemo(() => {
    if (availableYears.length === 0) return 4;
    return Math.max(4, Math.max(...availableYears));
  }, [availableYears]);

  const getSemesterName = (semester: 1 | 2) => {
    return semester === 1 ? "Semester 1" : "Semester 2";
  };

  // Check if a year/semester combination has courses
  const hasCourses = (year: number, semester: 1 | 2) => {
    const key = `Y${year}_S${semester}`;
    return groupedCourses[key] && groupedCourses[key].length > 0;
  };

  // Auto-select first available year/semester only when courses change (not on manual selection)
  useEffect(() => {
    // Only auto-select if the current selection has no courses AND courses have changed
    const key = `Y${selectedYear}_S${selectedSemester}`;
    const hasCoursesInCurrentSelection = groupedCourses[key] && groupedCourses[key].length > 0;
    
    // If current selection has courses, don't change
    if (hasCoursesInCurrentSelection) {
      return;
    }
    
    // If no courses exist at all, default to Year 1, Semester 1
    if (courses.length === 0) {
      if (selectedYear !== 1 || selectedSemester !== 1) {
        setSelectedYear(1);
        setSelectedSemester(1);
      }
      return;
    }
    
    // Find first year/semester with courses (only if current selection is empty)
    for (let year = 1; year <= maxYear; year++) {
      for (let sem: 1 | 2 = 1; sem <= 2; sem++) {
        const checkKey = `Y${year}_S${sem}`;
        if (groupedCourses[checkKey] && groupedCourses[checkKey].length > 0) {
          // Only update if different from current selection
          if (selectedYear !== year || selectedSemester !== sem) {
            setSelectedYear(year);
            setSelectedSemester(sem);
          }
          return;
        }
      }
    }
  }, [courses, groupedCourses, maxYear]); // Removed selectedYear and selectedSemester from dependencies

  return (
    <div className="space-y-4">
      {/* Primary Tabs - Academic Year */}
      <div className="border-b border-gray-200 relative z-10">
        <nav className="flex space-x-1" aria-label="Year Tabs">
          {Array.from({ length: maxYear }, (_, i) => i + 1).map((year) => {
            const hasAnyCourses = hasCourses(year, 1) || hasCourses(year, 2);
            const isActive = selectedYear === year;
            
            return (
              <button
                key={year}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedYear(year);
                  // Auto-select first semester with courses, or default to semester 1
                  if (hasCourses(year, 1)) {
                    setSelectedSemester(1);
                  } else if (hasCourses(year, 2)) {
                    setSelectedSemester(2);
                  } else {
                    setSelectedSemester(1);
                  }
                }}
                className={`
                  px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all relative
                  cursor-pointer z-10
                  ${isActive
                    ? "text-white"
                    : hasAnyCourses
                    ? "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    : "text-gray-400 hover:text-gray-600"}
                `}
                style={{
                  backgroundColor: isActive ? colors.secondary : "transparent",
                  zIndex: isActive ? 20 : 10,
                }}
              >
                Year {year}
                {hasAnyCourses && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                      isActive ? "bg-white/20" : "bg-gray-200"
                    }`}
                    style={{
                      color: isActive ? "white" : colors.primary,
                    }}
                  >
                    {(() => {
                      const sem1 = groupedCourses[`Y${year}_S1`]?.length || 0;
                      const sem2 = groupedCourses[`Y${year}_S2`]?.length || 0;
                      return sem1 + sem2;
                    })()}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Secondary Tabs - Semester & Content Area */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Semester Tabs */}
        <div className="border-b border-gray-200 bg-gray-50 px-4">
          <div className="flex items-center justify-between">
            <nav className="flex space-x-1" aria-label="Semester Tabs">
              {([1, 2] as const).map((semester) => {
                const key = `Y${selectedYear}_S${semester}`;
                const semesterCourses = groupedCourses[key] || [];
                const isActive = selectedSemester === semester;
                const hasCoursesInSemester = semesterCourses.length > 0;

                return (
                  <button
                    key={semester}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSemester(semester);
                    }}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-t-lg transition-all
                      cursor-pointer relative z-10
                      ${isActive
                        ? "text-white"
                        : hasCoursesInSemester
                        ? "text-gray-700 hover:text-gray-900"
                        : "text-gray-400 hover:text-gray-600"}
                    `}
                    style={{
                      backgroundColor: isActive ? colors.secondary : "transparent",
                      zIndex: isActive ? 20 : 10,
                    }}
                  >
                    {getSemesterName(semester)}
                    {hasCoursesInSemester && (
                      <span
                        className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                          isActive ? "bg-white/20" : "bg-gray-200"
                        }`}
                        style={{
                          color: isActive ? "white" : colors.primary,
                        }}
                      >
                        {semesterCourses.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Contextual Actions - Add Subject Button & Total Units */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Total Units: </span>
                <strong className="text-lg" style={{ color: colors.primary }}>
                  {currentSemesterUnits}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => onAddSubjects(selectedYear, selectedSemester)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all hover:shadow-md"
                style={{ backgroundColor: colors.secondary }}
              >
                <Plus className="w-4 h-4" />
                Add Subjects
              </button>
            </div>
          </div>
        </div>

        {/* Subjects Table for Selected Year/Semester */}
        <div className="bg-white">
          {currentSemesterCourses.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg m-4">
              <div className="flex flex-col items-center justify-center gap-3">
                <div
                  className="p-3 rounded-full"
                  style={{ backgroundColor: `${colors.primary}05` }}
                >
                  <BookOpen className="w-6 h-6" style={{ color: colors.primary }} />
                </div>
                <p className="text-gray-500 font-medium">
                  No subjects in Year {selectedYear} - {getSemesterName(selectedSemester)}
                </p>
                <p className="text-sm text-gray-400">
                  Click "Add Subjects" above to add subjects to this semester
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr
                  className="text-left text-xs font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${colors.primary}02`,
                    color: colors.primary,
                  }}
                >
                  <th className="px-4 py-3">Course Code</th>
                  <th className="px-4 py-3">Descriptive Title</th>
                  <th className="px-4 py-3">Units</th>
                  <th className="px-4 py-3">Prerequisite</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentSemesterCourses.map((course) => (
                  <tr
                    key={course.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-sm" style={{ color: colors.primary }}>
                        {course.course_code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {course.descriptive_title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-700">
                        {course.units_total}
                        {course.lecture_hour || course.lab_hour ? (
                          <span className="text-gray-500 ml-1">
                            ({course.lecture_hour || 0}h/{course.lab_hour || 0}h)
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {course.prerequisite
                          ? formatPrerequisites(
                              parsePrerequisites(course.prerequisite, courses),
                              courses,
                              subjects
                            )
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onEditPrerequisite && (
                          <button
                            type="button"
                            onClick={() => onEditPrerequisite(course)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 transition-all"
                            style={{ color: colors.secondary }}
                            title="Edit Prerequisites"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveCourse(course.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-all text-red-600"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurriculumStructureTable;

