import React from "react";
import { BookOpen, Plus, X, Save, Search } from "lucide-react";
import { colors } from "../../colors";
import type { EnrolledSubject } from "./types";

interface EnrolledSubjectsTabProps {
  currentTerm: {
    semester: string;
    academicYear: string;
  };
  program: string;
  totalUnits: number;
  isResidentReturnee: boolean;
  isEditingSubjects: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveSubjects: () => void;
  isLoadingSubjects: boolean;
  subjectsError: string;
  enrolledSubjects: EnrolledSubject[];
  availableSubjects: EnrolledSubject[];
  showSubjectSelector: boolean;
  setShowSubjectSelector: (value: boolean) => void;
  subjectSearchTerm: string;
  setSubjectSearchTerm: (value: string) => void;
  addSubject: (subject: EnrolledSubject) => void;
  removeSubject: (subjectId: number) => void;
}

export const EnrolledSubjectsTab: React.FC<EnrolledSubjectsTabProps> = ({
  currentTerm,
  program,
  totalUnits,
  isResidentReturnee,
  isEditingSubjects,
  onStartEditing,
  onCancelEditing,
  onSaveSubjects,
  isLoadingSubjects,
  subjectsError,
  enrolledSubjects,
  availableSubjects,
  showSubjectSelector,
  setShowSubjectSelector,
  subjectSearchTerm,
  setSubjectSearchTerm,
  addSubject,
  removeSubject,
}) => {
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
            {isResidentReturnee && (
              <span
                className="px-2 py-1 text-xs font-semibold rounded-md"
                style={{
                  backgroundColor: colors.accent + "15",
                  color: colors.secondary,
                }}
              >
                Resident/Returnee
              </span>
            )}
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
          {isResidentReturnee && (
            <>
              {!isEditingSubjects ? (
                <button
                  onClick={onStartEditing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: colors.secondary,
                    color: "white",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Edit Subjects
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onCancelEditing}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border"
                    style={{
                      borderColor: colors.tertiary + "30",
                      color: colors.tertiary,
                      backgroundColor: "white",
                    }}
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={onSaveSubjects}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: colors.secondary,
                      color: "white",
                    }}
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </div>
              )}
            </>
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
      ) : enrolledSubjects.length === 0 && !isEditingSubjects ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <BookOpen
            className="w-12 h-12 mx-auto mb-3"
            style={{ color: colors.tertiary }}
          />
          <p className="text-sm text-gray-500 font-medium">
            {isResidentReturnee
              ? "No enrolled subjects. Click 'Edit Subjects' to add subjects."
              : "No subjects found for this program and semester"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isResidentReturnee
              ? "Select subjects from the curriculum to enroll"
              : "Please check the curriculum configuration"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Add Subject Button for Resident/Returnee in Edit Mode */}
          {isResidentReturnee && isEditingSubjects && (
            <div
              className="flex items-center justify-between p-4 rounded-lg border"
              style={{
                backgroundColor: colors.accent + "05",
                borderColor: colors.accent + "20",
              }}
            >
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: colors.primary }}
                >
                  Add Subject from Curriculum
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: colors.tertiary }}
                >
                  Search and select subjects to add to enrollment
                </p>
              </div>
              <button
                onClick={() => setShowSubjectSelector(!showSubjectSelector)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: showSubjectSelector
                    ? colors.tertiary + "20"
                    : colors.secondary,
                  color: showSubjectSelector ? colors.tertiary : "white",
                }}
              >
                <Plus className="w-4 h-4" />
                {showSubjectSelector ? "Close" : "Add Subject"}
              </button>
            </div>
          )}

          {/* Subject Selector Modal */}
          {isResidentReturnee && isEditingSubjects && showSubjectSelector && (
            <div
              className="p-4 rounded-lg border shadow-lg"
              style={{
                backgroundColor: "white",
                borderColor: colors.accent + "30",
                maxHeight: "400px",
                overflowY: "auto",
              }}
            >
              <div className="mb-4">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                    style={{ color: colors.tertiary }}
                  />
                  <input
                    type="text"
                    value={subjectSearchTerm}
                    onChange={(e) => setSubjectSearchTerm(e.target.value)}
                    placeholder="Search subjects by code or title..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
                    style={{
                      borderColor: colors.tertiary + "30",
                      color: colors.primary,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                {availableSubjects
                  .filter((subject) => {
                    const search = subjectSearchTerm.toLowerCase();
                    return (
                      !search ||
                      subject.course_code.toLowerCase().includes(search) ||
                      subject.descriptive_title.toLowerCase().includes(search)
                    );
                  })
                  .map((subject) => (
                    <div
                      key={subject.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                      style={{ borderColor: colors.accent + "20" }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: colors.primary }}
                          >
                            {subject.course_code}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: colors.accent + "10",
                              color: colors.tertiary,
                            }}
                          >
                            {subject.units_total} units
                          </span>
                        </div>
                        <p
                          className="text-xs mt-1"
                          style={{ color: colors.tertiary }}
                        >
                          {subject.descriptive_title}
                        </p>
                        {subject.prerequisite && (
                          <p
                            className="text-xs mt-1 italic"
                            style={{ color: colors.tertiary + "80" }}
                          >
                            Prerequisite: {subject.prerequisite}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => addSubject(subject)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          backgroundColor: colors.secondary,
                          color: "white",
                        }}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                {availableSubjects.filter((subject) => {
                  const search = subjectSearchTerm.toLowerCase();
                  return (
                    !search ||
                    subject.course_code.toLowerCase().includes(search) ||
                    subject.descriptive_title.toLowerCase().includes(search)
                  );
                }).length === 0 && (
                  <p
                    className="text-sm text-center py-4"
                    style={{ color: colors.tertiary }}
                  >
                    No available subjects found
                  </p>
                )}
              </div>
            </div>
          )}

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
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                      style={{ color: colors.primary }}
                    >
                      Prerequisite
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                      style={{ color: colors.primary }}
                    >
                      Year
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                      style={{ color: colors.primary }}
                    >
                      Lec Units
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                      style={{ color: colors.primary }}
                    >
                      Lab Units
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                      style={{ color: colors.primary }}
                    >
                      Total Units
                    </th>
                    {isResidentReturnee && isEditingSubjects && (
                      <th
                        className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                        style={{ color: colors.primary }}
                      >
                        Action
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
                        className="px-4 py-3 text-sm italic"
                        style={{ color: colors.tertiary + "90" }}
                      >
                        {subject.prerequisite || "None"}
                      </td>
                      <td
                        className="px-4 py-3 text-center text-sm"
                        style={{ color: colors.tertiary }}
                      >
                        {subject.year_level}
                      </td>
                      <td
                        className="px-4 py-3 text-center text-sm"
                        style={{ color: colors.tertiary }}
                      >
                        {subject.units_lec || 0}
                      </td>
                      <td
                        className="px-4 py-3 text-center text-sm"
                        style={{ color: colors.tertiary }}
                      >
                        {subject.units_lab || 0}
                      </td>
                      <td
                        className="px-4 py-3 text-center text-sm font-semibold"
                        style={{ color: colors.primary }}
                      >
                        {subject.units_total}
                      </td>
                      {isResidentReturnee && isEditingSubjects && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeSubject(subject.id)}
                            className="p-1.5 rounded-lg transition-all hover:bg-red-50"
                            style={{ color: "#ef4444" }}
                            title="Remove subject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: colors.accent + "05" }}>
                    <td
                      colSpan={
                        isResidentReturnee && isEditingSubjects ? 7 : 6
                      }
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
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


