import React from "react";
import { User, GraduationCap, FileText } from "lucide-react";
import { colors } from "../../colors";

interface StudentInfoSectionProps {
  studentNumber: string;
  setStudentNumber: (value: string) => void;
  studentName: string;
  setStudentName: (value: string) => void;
  program: string;
  setProgram: (value: string) => void;
  studentFetchError: string;
  isFetchingStudent: boolean;
  inputClasses: string;
}

export const StudentInfoSection: React.FC<StudentInfoSectionProps> = ({
  studentNumber,
  setStudentNumber,
  studentName,
  setStudentName,
  program,
  setProgram,
  studentFetchError,
  isFetchingStudent,
  inputClasses,
}) => {
  return (
    <div
      className="rounded-2xl shadow-lg p-6 mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-100"
      style={{
        backgroundColor: "white",
        border: `1px solid ${colors.accent}30`,
      }}
    >
      <div className="flex items-center gap-4 mb-6">
        <div
          className="p-2 rounded-xl shadow-sm"
          style={{
            backgroundColor: `${colors.secondary}15`,
          }}
        >
          <User className="w-5 h-5" style={{ color: colors.secondary }} />
        </div>
        <div className="flex-1">
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
            Enter student details for assessment
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="group">
          <label
            className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1"
            style={{ color: colors.primary }}
          >
            <FileText
              className="w-4 h-4"
              style={{ color: colors.secondary }}
            />
            Student Number
          </label>
          <div className="relative">
            <input
              type="text"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              className={inputClasses}
              style={{
                borderColor: studentFetchError
                  ? "#ef4444"
                  : colors.tertiary + "30",
                color: colors.primary,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.secondary;
                e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = studentFetchError
                  ? "#ef4444"
                  : colors.tertiary + "30";
                e.currentTarget.style.boxShadow = "none";
              }}
              placeholder="Enter student number"
            />
            {isFetchingStudent && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
              </div>
            )}
          </div>
          {studentFetchError && (
            <p className="text-xs text-red-500 mt-1 ml-1">{studentFetchError}</p>
          )}
        </div>
        <div className="group">
          <label
            className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1"
            style={{ color: colors.primary }}
          >
            <User className="w-4 h-4" style={{ color: colors.secondary }} />
            Student Name
          </label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className={inputClasses}
            style={{
              borderColor: colors.tertiary + "30",
              color: colors.primary,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.secondary;
              e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.tertiary + "30";
              e.currentTarget.style.boxShadow = "none";
            }}
            placeholder="Enter student name"
          />
        </div>
        <div className="group">
          <label
            className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1"
            style={{ color: colors.primary }}
          >
            <GraduationCap
              className="w-4 h-4"
              style={{ color: colors.secondary }}
            />
            Program
          </label>
          <input
            type="text"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            className={inputClasses}
            style={{
              borderColor: colors.tertiary + "30",
              color: colors.primary,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.secondary;
              e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.tertiary + "30";
              e.currentTarget.style.boxShadow = "none";
            }}
            placeholder="Enter program"
          />
        </div>
      </div>
    </div>
  );
};




