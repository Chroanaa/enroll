import React, { useEffect, useState } from "react";
import { User, GraduationCap, FileText, Search, Loader2, CheckCircle, Calendar } from "lucide-react";
import { colors } from "../../colors";

interface StudentInfoSectionProps {
  studentNumber: string;
  studentName: string;
  program: string;
  majorName?: string | null;
  yearLevel?: number | null;
  academicStatus?: string;
  isFetchingStudent: boolean;
  onSelectStudent: () => void;
  onAcademicStatusChange?: (status: string) => void;
}

export const StudentInfoSection: React.FC<StudentInfoSectionProps> = ({
  studentNumber,
  studentName,
  program,
  majorName,
  yearLevel,
  academicStatus = "",
  isFetchingStudent,
  onSelectStudent,
  onAcademicStatusChange,
}) => {
  const hasStudent = studentNumber.trim().length > 0 && studentName.trim().length > 0;
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [prevStudentNumber, setPrevStudentNumber] = useState("");

  // Trigger animation when student is selected
  useEffect(() => {
    if (hasStudent && studentNumber !== prevStudentNumber && prevStudentNumber !== "") {
      setShowSuccessAnimation(true);
      const timer = setTimeout(() => setShowSuccessAnimation(false), 1500);
      return () => clearTimeout(timer);
    }
    setPrevStudentNumber(studentNumber);
  }, [studentNumber, hasStudent, prevStudentNumber]);

  const fieldBorderColor = showSuccessAnimation ? "#86EFAC" : colors.tertiary + "30";
  const fieldBackgroundColor = showSuccessAnimation ? "#F0FDF4" : "white";

  return (
    <div
      className={`rounded-2xl shadow-lg p-4 md:p-4 mb-5 transition-all duration-500 ${
        showSuccessAnimation ? "ring-2 ring-green-400 ring-offset-2" : ""
      } ${hasStudent ? "animate-in fade-in slide-in-from-bottom-4 duration-500" : "animate-in slide-in-from-bottom-4 duration-500 delay-100"}`}
      style={{
        backgroundColor: showSuccessAnimation ? "#F0FDF4" : "white",
        border: `1px solid ${showSuccessAnimation ? "#86EFAC" : colors.accent + "30"}`,
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
          <h3 className="text-xl font-bold mb-2" style={{ color: colors.primary }}>
            No student selected
          </h3>
          <p className="text-sm mb-6 text-center max-w-md" style={{ color: colors.tertiary }}>
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
            <div className="flex items-center gap-4">
              <div
                className={`p-2 rounded-xl shadow-sm transition-all duration-300 ${
                  showSuccessAnimation ? "scale-110" : ""
                }`}
                style={{
                  backgroundColor: showSuccessAnimation ? "#DCFCE7" : `${colors.secondary}15`,
                }}
              >
                {showSuccessAnimation ? (
                  <CheckCircle className="w-5 h-5 text-green-600 animate-in zoom-in duration-300" />
                ) : (
                  <User className="w-5 h-5" style={{ color: colors.secondary }} />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight" style={{ color: colors.primary }}>
                  Student Information
                </h2>
                <p
                  className={`text-xs mt-0.5 font-medium transition-all duration-300 ${
                    showSuccessAnimation ? "text-green-600" : ""
                  }`}
                  style={{ color: showSuccessAnimation ? undefined : colors.tertiary }}
                >
                  {showSuccessAnimation ? "Student loaded successfully!" : "Selected student details"}
                </p>
              </div>
            </div>
            <button
              onClick={onSelectStudent}
              className="px-4 py-1.5 rounded-lg font-semibold text-sm transition-all duration-200 self-start sm:self-auto"
              style={{
                color: colors.secondary,
                border: `1px solid ${colors.secondary}30`,
                backgroundColor: `${colors.secondary}08`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${colors.secondary}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${colors.secondary}08`;
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
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-2.5 transition-all duration-500 ${
                showSuccessAnimation ? "animate-in fade-in slide-in-from-bottom-2 duration-300" : ""
              }`}
            >
              <div className="group">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-1.5 ml-1" style={{ color: colors.tertiary }}>
                  <FileText className="w-4 h-4" style={{ color: colors.secondary }} />
                  Student Number
                </label>
                <div
                  className="px-4 py-2.5 rounded-xl border transition-all duration-300 min-h-[60px] flex items-center"
                  style={{
                    borderColor: fieldBorderColor,
                    backgroundColor: fieldBackgroundColor,
                  }}
                >
                  <span className="text-base font-semibold" style={{ color: colors.primary }}>
                    {studentNumber}
                  </span>
                </div>
              </div>

              <div className="group">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-1.5 ml-1" style={{ color: colors.tertiary }}>
                  <User className="w-4 h-4" style={{ color: colors.secondary }} />
                  Student Name
                </label>
                <div
                  className="px-4 py-2.5 rounded-xl border transition-all duration-300 min-h-[60px] flex items-center"
                  style={{
                    borderColor: fieldBorderColor,
                    backgroundColor: fieldBackgroundColor,
                  }}
                >
                  <span className="text-base font-bold" style={{ color: colors.primary }}>
                    {studentName}
                  </span>
                </div>
              </div>

              <div className="group">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-1.5 ml-1" style={{ color: colors.tertiary }}>
                  <GraduationCap className="w-4 h-4" style={{ color: colors.secondary }} />
                  Program
                </label>
                <div
                  className="px-4 py-2.5 rounded-xl border transition-all duration-300 min-h-[60px] flex items-center"
                  style={{
                    borderColor: fieldBorderColor,
                    backgroundColor: fieldBackgroundColor,
                  }}
                >
                  <span className="text-base font-medium" style={{ color: colors.primary }}>
                    {program ? `${program}${majorName ? ` - ${majorName}` : ""}` : "N/A"}
                  </span>
                </div>
              </div>

              <div className="group">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-1.5 ml-1" style={{ color: colors.tertiary }}>
                  <Calendar className="w-4 h-4" style={{ color: colors.secondary }} />
                  Year Level
                </label>
                <div
                  className="px-4 py-2.5 rounded-xl border transition-all duration-300 min-h-[60px] flex items-center"
                  style={{
                    borderColor: fieldBorderColor,
                    backgroundColor: fieldBackgroundColor,
                  }}
                >
                  <span className="text-base font-medium" style={{ color: colors.primary }}>
                    {yearLevel ? `Year ${yearLevel}` : "N/A"}
                  </span>
                </div>
              </div>

              <div className="group">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-1.5 ml-1" style={{ color: colors.tertiary }}>
                  <GraduationCap className="w-4 h-4" style={{ color: colors.secondary }} />
                  Academic Status
                </label>
                <select
                  value={academicStatus || ""}
                  onChange={(event) => onAcademicStatusChange?.(event.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-base font-medium min-h-[60px] focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: fieldBorderColor,
                    backgroundColor: fieldBackgroundColor,
                    color: colors.primary,
                  }}
                >
                  <option value="">Select Status</option>
                  <option value="regular">Regular</option>
                  <option value="irregular">Irregular</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
