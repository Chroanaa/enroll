import React, { useState, useEffect, useRef } from "react";
import { BookOpen, Plus, X, Save, Edit } from "lucide-react";
import { colors } from "../../colors";
import type { EnrolledSubject } from "./types";
import { SubjectManagementModal } from "./SubjectManagementModal";

interface EnrolledSubjectsTabProps {
  currentTerm: {
    semester: string;
    academicYear: string;
  };
  program: string;
  programId: number | null;
  studentNumber: string;
  totalUnits: number;
  isLoadingSubjects: boolean;
  subjectsError: string;
  enrolledSubjects: EnrolledSubject[];
  onAddSubject: (subjects: any[]) => void;
  onEditSubject: (subject: EnrolledSubject) => void;
  onRemoveSubject: (subjectId: number) => void;
  onSaveSubjects: () => Promise<boolean>;
  onRestoreSubjects?: (subjects: EnrolledSubject[]) => void;
}

export const EnrolledSubjectsTab: React.FC<EnrolledSubjectsTabProps> = ({
  currentTerm,
  program,
  programId,
  studentNumber,
  totalUnits,
  isLoadingSubjects,
  subjectsError,
  enrolledSubjects,
  onAddSubject,
  onEditSubject,
  onRemoveSubject,
  onSaveSubjects,
  onRestoreSubjects,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<EnrolledSubject | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const originalSubjectsRef = useRef<EnrolledSubject[]>([]);
  const isEditModeRef = useRef(false);

  const semesterNum = currentTerm.semester === "First" ? 1 : 2;
  // Track enrolled subjects by curriculum_course_id (if available) or id to prevent duplicates across all semesters
  const enrolledSubjectIds = new Set(
    enrolledSubjects.map((s) => (s as any).curriculum_course_id || s.id)
  );

  const handleOpenAddModal = () => {
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (subject: EnrolledSubject) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleModalAdd = (subjects: any[]) => {
    onAddSubject(subjects);
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  // Track edit mode in ref for cleanup
  useEffect(() => {
    isEditModeRef.current = isEditMode;
  }, [isEditMode]);

  // Reset edit mode and restore original subjects ONLY when component unmounts (e.g., tab switch)
  useEffect(() => {
    return () => {
      // Only restore on actual unmount, not on dependency changes
      if (isEditModeRef.current && originalSubjectsRef.current.length > 0 && onRestoreSubjects) {
        onRestoreSubjects(originalSubjectsRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run cleanup on unmount

  const handleToggleEditMode = async () => {
    if (isEditMode) {
      // Save changes
      const success = await onSaveSubjects();
      if (success) {
        setIsEditMode(false);
        originalSubjectsRef.current = [];
      }
    } else {
      // Enter edit mode - store original state
      originalSubjectsRef.current = JSON.parse(JSON.stringify(enrolledSubjects));
      setIsEditMode(true);
    }
  };

  const formatHours = (lec?: number | null, lab?: number | null) => {
    const lecHrs = lec || 0;
    const labHrs = lab || 0;
    if (lecHrs === 0 && labHrs === 0) return "0";
    if (lecHrs === 0) return `${labHrs} hrs`;
    if (labHrs === 0) return `${lecHrs} hrs`;
    return `${lecHrs} hrs / ${labHrs} hrs`;
  };

  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3
              className="text-xl font-bold tracking-tight"
              style={{ color: colors.primary }}
            >
              Enrolled Subjects
            </h3>
          </div>
          <p
            className="text-sm mt-1 font-medium"
            style={{ color: colors.tertiary }}
          >
            {currentTerm.semester} Semester, {currentTerm.academicYear} -{" "}
            {program}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalUnits > 0 && (
            <div
              className="px-4 py-2 rounded-xl border"
              style={{
                backgroundColor: colors.accent + "05",
                borderColor: colors.accent + "10",
              }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: colors.primary }}
              >
                Total Units:{" "}
                <strong style={{ color: colors.secondary }}>{totalUnits}</strong>
              </span>
            </div>
          )}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: colors.secondary,
              color: "white",
            }}
          >
            <Plus className="w-4 h-4" />
            Add Subject
          </button>
          {enrolledSubjects.length > 0 && (
            <button
              onClick={handleToggleEditMode}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border"
              style={{
                borderColor: colors.secondary + "30",
                color: colors.secondary,
                backgroundColor: "white",
              }}
            >
              {isEditMode ? (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  Edit Subject
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {isLoadingSubjects ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading subjects...</p>
        </div>
      ) : subjectsError ? (
        <div className="text-center py-12">
          <p className="text-sm text-red-500">{subjectsError}</p>
        </div>
      ) : enrolledSubjects.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <BookOpen
            className="w-12 h-12 mx-auto mb-3"
            style={{ color: colors.tertiary }}
          />
          <p className="text-sm text-gray-500 font-medium">
            No enrolled subjects. Click 'Add Subject' to begin.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Select subjects from the curriculum to enroll
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Enrolled Subjects Table */}
          {enrolledSubjects.length > 0 && (
            <div
              className="overflow-x-auto rounded-xl border"
              style={{ borderColor: colors.accent + "20" }}
            >
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ backgroundColor: colors.accent + "05" }}>
                    <th
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                      style={{ color: colors.primary }}
                    >
                      Code
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                      style={{ color: colors.primary }}
                    >
                      Course Title
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                      style={{ color: colors.primary }}
                    >
                      Units
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                      style={{ color: colors.primary }}
                    >
                      Lecture / Lab Hours
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                      style={{ color: colors.primary }}
                    >
                      Prerequisite
                    </th>
                    {isEditMode && (
                      <th
                        className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                        style={{ color: colors.primary }}
                      >
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {enrolledSubjects.map((subject, index) => (
                    <tr
                      key={subject.id}
                      className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? "transparent" : colors.paper + "30",
                      }}
                    >
                      <td
                        className="px-4 py-3 text-sm font-medium"
                        style={{ color: colors.primary }}
                      >
                        {subject.course_code}
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: colors.tertiary }}
                      >
                        {subject.descriptive_title}
                      </td>
                      <td
                        className="px-4 py-3 text-center text-sm font-semibold"
                        style={{ color: colors.primary }}
                      >
                        {subject.units_total}
                      </td>
                      <td
                        className="px-4 py-3 text-center text-sm"
                        style={{ color: colors.tertiary }}
                      >
                        {formatHours(subject.lecture_hour, subject.lab_hour)}
                      </td>
                      <td
                        className="px-4 py-3 text-sm italic"
                        style={{ color: colors.tertiary + "90" }}
                      >
                        {subject.prerequisite || "None"}
                      </td>
                      {isEditMode && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveSubject(subject.id);
                              }}
                              className="p-1.5 rounded-lg transition-all hover:bg-red-50 cursor-pointer relative z-10"
                              style={{ color: "#ef4444" }}
                              title="Remove subject"
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: colors.accent + "05" }}>
                    <td
                      colSpan={isEditMode ? 5 : 4}
                      className="px-4 py-3 text-right text-sm font-bold"
                      style={{ color: colors.primary }}
                    >
                      Total Units:
                    </td>
                    <td
                      className="px-4 py-3 text-center text-sm font-bold"
                      style={{ color: colors.secondary }}
                    >
                      {totalUnits}
                    </td>
                    {isEditMode && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Subject Management Modal */}
      {programId && (
        <SubjectManagementModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAddSubjects={handleModalAdd}
          programId={programId}
          currentSemester={semesterNum}
          enrolledSubjectIds={enrolledSubjectIds}
          mode={editingSubject ? "edit" : "add"}
          editingSubject={editingSubject}
        />
      )}
    </div>
  );
};
