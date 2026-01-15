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

    // Sort by year and semester
    const sorted: { year: number; semester: 1 | 2; courses: CurriculumCourse[] }[] = [];
    
    for (let year = 1; year <= 4; year++) {
      for (let sem = 1; sem <= 2; sem++) {
        const key = `Y${year}_S${sem}`;
        if (grouped[key] && grouped[key].length > 0) {
          sorted.push({
            year,
            semester: sem as 1 | 2,
            courses: grouped[key],
          });
        }
      }
    }

    return sorted;
  }, [courses]);

  const getSemesterName = (semester: 1 | 2) => {
    return semester === 1 ? "Semester 1" : "Semester 2";
  };

  const calculateSemesterUnits = (semesterCourses: CurriculumCourse[]) => {
    return semesterCourses.reduce((total, course) => total + course.units_total, 0);
  };

  // Show empty state message if no courses, but still show the Add Subjects buttons
  const showEmptyState = courses.length === 0;

  return (
    <div className="space-y-6">
      {showEmptyState && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="flex flex-col items-center justify-center gap-3">
            <div
              className="p-3 rounded-full"
              style={{ backgroundColor: `${colors.primary}05` }}
            >
              <BookOpen className="w-6 h-6" style={{ color: colors.primary }} />
            </div>
            <p className="text-gray-500 font-medium">No subjects added yet</p>
            <p className="text-sm text-gray-400">
              Click "Add Subjects" below to start building your curriculum
            </p>
          </div>
        </div>
      )}
      
      {groupedCourses.length > 0 && (
        groupedCourses.map(({ year, semester, courses: semesterCourses }) => {
          const semesterUnits = calculateSemesterUnits(semesterCourses);
          
          return (
            <div
              key={`Y${year}_S${semester}`}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              {/* Semester Header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{
                  backgroundColor: `${colors.primary}05`,
                  borderBottom: `1px solid ${colors.primary}10`,
                }}
              >
                <div className="flex items-center gap-3">
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: colors.primary }}
                  >
                    Year {year} - {getSemesterName(semester)}
                  </h3>
                  <span className="text-sm text-gray-600">
                    ({semesterCourses.length} subject{semesterCourses.length !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">
                    Total Units: <strong>{semesterUnits}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onAddSubjects(year, semester)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-all hover:shadow-md"
                    style={{ backgroundColor: colors.secondary }}
                  >
                    <Plus className="w-4 h-4" />
                    Add Subjects
                  </button>
                </div>
              </div>

              {/* Subjects List */}
              <div className="bg-white">
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
                    {semesterCourses.map((course) => (
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
              </div>
            </div>
          );
        })
      )}

      {/* Add Subjects Button for Empty State or New Semester */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((year) =>
          [1, 2].map((sem) => {
            const key = `Y${year}_S${sem}`;
            const hasSubjects = groupedCourses.some(
              (g) => g.year === year && g.semester === sem
            );

            if (hasSubjects) return null;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onAddSubjects(year, sem as 1 | 2)}
                className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all"
              >
                <Plus className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">
                  Year {year}
                </span>
                <span className="text-xs text-gray-500">
                  {getSemesterName(sem as 1 | 2)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CurriculumStructureTable;

