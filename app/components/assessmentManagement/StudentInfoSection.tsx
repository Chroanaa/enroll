import React from "react";
import { User, GraduationCap, FileText, Search, Loader2 } from "lucide-react";
import { colors } from "../../colors";

interface StudentInfoSectionProps {
  studentNumber: string;
  studentName: string;
  program: string;
  isFetchingStudent: boolean;
  onSelectStudent: () => void;
}

export const StudentInfoSection: React.FC<StudentInfoSectionProps> = ({
  studentNumber,
  studentName,
  program,
  isFetchingStudent,
  onSelectStudent,
}) => {
  const hasStudent = studentNumber.trim().length > 0 && studentName.trim().length > 0;

  return (
    <div
      className="rounded-2xl shadow-lg p-6 mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-100"
      style={{
        backgroundColor: "white",
        border: `1px solid ${colors.accent}30`,
      }}
    >
      {!hasStudent ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-12">
          <div
            className="p-4 rounded-full mb-4"
            style={{
              backgroundColor: `${colors.secondary}10`,
            }}
          >
            <User className="w-12 h-12" style={{ color: colors.secondary }} />
          </div>
          <h3
            className="text-xl font-bold mb-2"
            style={{ color: colors.primary }}
          >
            No student selected
          </h3>
          <p
            className="text-sm mb-6 text-center max-w-md"
            style={{ color: colors.tertiary }}
          >
            Select a student to begin assessment management
          </p>
          <button
            onClick={onSelectStudent}
            className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            style={{ backgroundColor: colors.secondary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.tertiary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.secondary;
            }}
          >
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              <span>Select Student</span>
            </div>
          </button>
        </div>
      ) : (
        // Student Summary Header
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div
                className="p-2 rounded-xl shadow-sm"
                style={{
                  backgroundColor: `${colors.secondary}15`,
                }}
              >
                <User className="w-5 h-5" style={{ color: colors.secondary }} />
              </div>
              <div>
                <h2
                  className="text-xl font-bold tracking-tight"
                  style={{ color: colors.primary }}
                >
                  Student Information
                </h2>
                <p
                  className="text-xs mt-0.5 font-medium"
                  style={{ color: colors.tertiary }}
                >
                  Selected student details
                </p>
              </div>
            </div>
            <button
              onClick={onSelectStudent}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
              style={{
                color: colors.secondary,
                border: `1px solid ${colors.secondary}30`,
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${colors.secondary}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Change Student
            </button>
          </div>

          {isFetchingStudent ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.secondary }} />
              <span className="ml-3 text-sm" style={{ color: colors.tertiary }}>
                Loading student information...
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="group">
                <label
                  className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1"
                  style={{ color: colors.tertiary }}
                >
                  <FileText
                    className="w-4 h-4"
                    style={{ color: colors.secondary }}
                  />
                  Student Number
                </label>
                <div
                  className="px-4 py-3 rounded-xl border bg-gray-50"
                  style={{
                    borderColor: colors.tertiary + "30",
                  }}
                >
                  <span
                    className="text-base font-semibold"
                    style={{ color: colors.primary }}
                  >
                    {studentNumber}
                  </span>
                </div>
              </div>
              <div className="group">
                <label
                  className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1"
                  style={{ color: colors.tertiary }}
                >
                  <User className="w-4 h-4" style={{ color: colors.secondary }} />
                  Student Name
                </label>
                <div
                  className="px-4 py-3 rounded-xl border bg-gray-50"
                  style={{
                    borderColor: colors.tertiary + "30",
                  }}
                >
                  <span
                    className="text-base font-bold"
                    style={{ color: colors.primary }}
                  >
                    {studentName}
                  </span>
                </div>
              </div>
              <div className="group">
                <label
                  className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1"
                  style={{ color: colors.tertiary }}
                >
                  <GraduationCap
                    className="w-4 h-4"
                    style={{ color: colors.secondary }}
                  />
                  Program
                </label>
                <div
                  className="px-4 py-3 rounded-xl border bg-gray-50"
                  style={{
                    borderColor: colors.tertiary + "30",
                  }}
                >
                  <span
                    className="text-base font-medium"
                    style={{ color: colors.primary }}
                  >
                    {program || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};




