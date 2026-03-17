"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Search, Trash2, UserRoundX } from "lucide-react";
import { colors } from "../colors";
import { useAcademicTerm } from "../hooks/useAcademicTerm";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";
import ConfirmationModal from "./common/ConfirmationModal";
import type { EnrolledSubject } from "./assessmentManagement/types";

interface StudentListItem {
  studentNumber: string;
  studentName: string;
  programCode: string;
  yearLevel: number | null;
}

interface StudentDetails {
  studentNumber: string;
  studentName: string;
  email: string;
  programDisplay: string;
  yearLevel: number | null;
}

const SubjectDroppingManagement: React.FC = () => {
  const { currentTerm, loading: termLoading } = useAcademicTerm();
  const [studentSearch, setStudentSearch] = useState("");
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isFetchingStudent, setIsFetchingStudent] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isDroppingSubject, setIsDroppingSubject] = useState(false);
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [enrolledSubjects, setEnrolledSubjects] = useState<EnrolledSubject[]>([]);
  const [subjectsError, setSubjectsError] = useState("");
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    subject: EnrolledSubject | null;
  }>({
    isOpen: false,
    subject: null,
  });
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    message: "",
  });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
    details: "",
  });

  const currentTermLabel = useMemo(() => {
    if (!currentTerm) {
      return "Loading academic term...";
    }

    return `${currentTerm.semester} Semester, ${currentTerm.academicYear}`;
  }, [currentTerm]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter((item) =>
      item.studentNumber.toLowerCase().includes(query) ||
      item.studentName.toLowerCase().includes(query) ||
      item.programCode.toLowerCase().includes(query),
    );
  }, [studentSearch, students]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!currentTerm) {
        return;
      }

      setIsLoadingStudents(true);

      try {
        const params = new URLSearchParams({
          academicYear: currentTerm.academicYear,
          semester: currentTerm.semester === "First" ? "1" : "2",
          includeNotAssessed: "true",
        });
        const response = await fetch(
          `/api/auth/assessment/all-summaries?${params.toString()}`,
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load students.");
        }

        const rawData: any[] = result.data || [];
        const nextStudents = rawData.map((item) => {
          const studentName = [
            item.family_name,
            item.first_name ?? item.student_name,
            item.middle_name,
          ]
            .filter(Boolean)
            .join(", ");

          return {
            studentNumber: item.student_number,
            studentName,
            programCode: item.program_code ?? item.course_program ?? "N/A",
            yearLevel: item.year_level ?? null,
          };
        });

        setStudents(nextStudents);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load students.";
        setErrorModal({
          isOpen: true,
          message,
          details: "",
        });
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [currentTerm]);

  const fetchEnrolledSubjects = async (studentNumber: string) => {
    if (!currentTerm) {
      setSubjectsError("Academic term is not available yet.");
      return;
    }

    setIsLoadingSubjects(true);
    setSubjectsError("");

    try {
      const semesterNum = currentTerm.semester === "First" ? 1 : 2;
      const response = await fetch(
        `/api/auth/enrolled-subjects?studentNumber=${encodeURIComponent(studentNumber)}&academicYear=${encodeURIComponent(currentTerm.academicYear)}&semester=${semesterNum}`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load enrolled subjects.");
      }

      setEnrolledSubjects(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load enrolled subjects.";
      setSubjectsError(message);
      setEnrolledSubjects([]);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const handleStudentSelect = async (studentNumber: string) => {
    setIsFetchingStudent(true);
    setSubjectsError("");

    try {
      const response = await fetch(
        `/api/students/${encodeURIComponent(studentNumber)}`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load student details.");
      }

      const fullName = [
        result.last_name,
        result.first_name,
        result.middle_name,
      ]
        .filter(Boolean)
        .join(", ");
      const programDisplay = result.major?.name
        ? `${result.program?.code || result.course_program || "N/A"} - ${result.major.name}`
        : result.program?.code || result.course_program || "N/A";

      setStudent({
        studentNumber: result.student_number,
        studentName: fullName || result.student_number,
        email: result.email_address || "No email",
        programDisplay,
        yearLevel: result.year_level ?? null,
      });

      await fetchEnrolledSubjects(result.student_number);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load student details.";
      setStudent(null);
      setEnrolledSubjects([]);
      setErrorModal({
        isOpen: true,
        message,
        details: "",
      });
    } finally {
      setIsFetchingStudent(false);
    }
  };

  const handleDropSubject = async () => {
    if (!confirmation.subject) {
      return;
    }

    setIsDroppingSubject(true);

    try {
      const response = await fetch("/api/auth/enrolled-subjects/drop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enrolledSubjectId: confirmation.subject.id,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to drop subject.");
      }

      if (student) {
        await fetchEnrolledSubjects(student.studentNumber);
      }

      setSuccessModal({
        isOpen: true,
        message: result.message || "Subject dropped successfully.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to drop subject.";
      setErrorModal({
        isOpen: true,
        message,
        details: "",
      });
    } finally {
      setIsDroppingSubject(false);
      setConfirmation({
        isOpen: false,
        subject: null,
      });
    }
  };

  useEffect(() => {
    if (student?.studentNumber && currentTerm) {
      fetchEnrolledSubjects(student.studentNumber);
    }
  }, [student?.studentNumber, currentTerm]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ color: colors.primary }}
          >
            Subject Dropping
          </h1>
          <p className="mt-2 text-lg" style={{ color: colors.tertiary }}>
            Registrar-friendly subject dropping with refundable window checking.
          </p>
          <p className="mt-1 text-sm font-medium" style={{ color: colors.secondary }}>
            {currentTermLabel}
          </p>
        </div>
      </div>

      <section
        className="rounded-2xl border bg-white p-6 shadow-sm"
        style={{ borderColor: `${colors.accent}25` }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: colors.primary }}>
              Student List
            </h2>
            <p className="mt-1 text-sm" style={{ color: colors.tertiary }}>
              Select a student first, then continue to subject dropping below.
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: colors.tertiary }}
            />
            <input
              type="text"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Search student, number, or program..."
              className="w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none transition-all"
              style={{
                borderColor: `${colors.accent}25`,
                color: colors.primary,
              }}
            />
          </div>
        </div>

        {isLoadingStudents || termLoading ? (
          <div className="flex items-center gap-3 py-12 text-sm" style={{ color: colors.tertiary }}>
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading student list...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: colors.tertiary }}>
            No students found for the current term.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border" style={{ borderColor: `${colors.accent}20` }}>
            <table className="min-w-full border-collapse">
              <thead>
                <tr style={{ backgroundColor: `${colors.accent}08` }}>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                    Student Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                    Student Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                    Program
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                    Year
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((item, index) => {
                  const isSelected = student?.studentNumber === item.studentNumber;

                  return (
                    <tr
                      key={item.studentNumber}
                      className="border-t"
                      style={{
                        borderColor: `${colors.accent}15`,
                        backgroundColor: isSelected
                          ? `${colors.secondary}08`
                          : index % 2 === 0
                            ? "white"
                            : `${colors.paper}40`,
                      }}
                    >
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: colors.primary }}>
                        {item.studentNumber}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: colors.primary }}>
                        {item.studentName}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: colors.primary }}>
                        {item.programCode}
                      </td>
                      <td className="px-4 py-3 text-center text-sm" style={{ color: colors.primary }}>
                        {item.yearLevel ?? "N/A"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleStudentSelect(item.studentNumber)}
                          disabled={isFetchingStudent}
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
                          style={{ backgroundColor: isSelected ? colors.primary : colors.secondary }}
                          type="button"
                        >
                          {isSelected ? "Selected" : "Select"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section
          className="rounded-2xl border bg-white p-6 shadow-sm"
          style={{ borderColor: `${colors.accent}25` }}
        >
          <h2 className="text-lg font-bold" style={{ color: colors.primary }}>
            Student Details
          </h2>

          {isFetchingStudent ? (
            <div className="flex items-center gap-3 py-12 text-sm" style={{ color: colors.tertiary }}>
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading student information...
            </div>
          ) : student ? (
            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="font-semibold" style={{ color: colors.tertiary }}>
                  Student Number
                </p>
                <p className="mt-1 text-base font-bold" style={{ color: colors.primary }}>
                  {student.studentNumber}
                </p>
              </div>
              <div>
                <p className="font-semibold" style={{ color: colors.tertiary }}>
                  Student Name
                </p>
                <p className="mt-1 text-base font-bold" style={{ color: colors.primary }}>
                  {student.studentName}
                </p>
              </div>
              <div>
                <p className="font-semibold" style={{ color: colors.tertiary }}>
                  Email
                </p>
                <p className="mt-1 text-base" style={{ color: colors.primary }}>
                  {student.email}
                </p>
              </div>
              <div>
                <p className="font-semibold" style={{ color: colors.tertiary }}>
                  Program / Major
                </p>
                <p className="mt-1 text-base" style={{ color: colors.primary }}>
                  {student.programDisplay}
                </p>
              </div>
              <div>
                <p className="font-semibold" style={{ color: colors.tertiary }}>
                  Year Level
                </p>
                <p className="mt-1 text-base" style={{ color: colors.primary }}>
                  {student.yearLevel ?? "N/A"}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-14 text-center">
              <UserRoundX
                className="mx-auto h-12 w-12"
                style={{ color: `${colors.tertiary}80` }}
              />
              <p className="mt-4 text-sm font-medium" style={{ color: colors.tertiary }}>
                Select a student to start subject dropping.
              </p>
            </div>
          )}
        </section>

        <section
          className="rounded-2xl border bg-white p-6 shadow-sm"
          style={{ borderColor: `${colors.accent}25` }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.primary }}>
                Enrolled Subjects
              </h2>
              <p className="mt-1 text-sm" style={{ color: colors.tertiary }}>
                Only subjects in the current academic term can be dropped here.
              </p>
            </div>
            {student && (
              <div
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
                style={{
                  borderColor: `${colors.accent}25`,
                  backgroundColor: `${colors.accent}08`,
                  color: colors.primary,
                }}
              >
                {enrolledSubjects.length} subject{enrolledSubjects.length === 1 ? "" : "s"}
              </div>
            )}
          </div>

          {subjectsError ? (
            <div
              className="mt-6 flex items-start gap-3 rounded-xl border px-4 py-4 text-sm"
              style={{
                borderColor: `${colors.danger}25`,
                backgroundColor: `${colors.danger}08`,
                color: colors.danger,
              }}
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{subjectsError}</span>
            </div>
          ) : isLoadingSubjects ? (
            <div className="flex items-center gap-3 py-12 text-sm" style={{ color: colors.tertiary }}>
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading enrolled subjects...
            </div>
          ) : !student ? (
            <div className="py-16 text-center text-sm" style={{ color: colors.tertiary }}>
              Student selection is required before subjects can be shown.
            </div>
          ) : enrolledSubjects.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: colors.tertiary }}>
              No enrolled subjects found for the current term.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-xl border" style={{ borderColor: `${colors.accent}20` }}>
              <table className="min-w-full border-collapse">
                <thead>
                  <tr style={{ backgroundColor: `${colors.accent}08` }}>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                      Subject Title
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                      Units
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                      Hours
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                      Prerequisite
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide" style={{ color: colors.primary }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledSubjects.map((subject, index) => (
                    <tr
                      key={subject.id}
                      className="border-t"
                      style={{
                        borderColor: `${colors.accent}15`,
                        backgroundColor: index % 2 === 0 ? "white" : `${colors.paper}40`,
                      }}
                    >
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: colors.primary }}>
                        {subject.course_code}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: colors.primary }}>
                        {subject.descriptive_title}
                      </td>
                      <td className="px-4 py-3 text-center text-sm" style={{ color: colors.primary }}>
                        {subject.units_lec || 0}/{subject.units_lab || 0}
                      </td>
                      <td className="px-4 py-3 text-center text-sm" style={{ color: colors.primary }}>
                        {(subject.lecture_hour || 0)}/{(subject.lab_hour || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: colors.tertiary }}>
                        {subject.prerequisite || "None"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() =>
                            setConfirmation({
                              isOpen: true,
                              subject,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-all"
                          style={{
                            borderColor: `${colors.danger}30`,
                            backgroundColor: `${colors.danger}08`,
                            color: colors.danger,
                          }}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                          Drop
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={() => setConfirmation({ isOpen: false, subject: null })}
        onConfirm={handleDropSubject}
        title="Drop Subject"
        message={`Are you sure you want to drop ${confirmation.subject?.course_code || "this subject"}?`}
        description="The system will automatically check the semester start date and determine whether the drop is still refundable."
        confirmText="Drop Subject"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDroppingSubject}
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: "" })}
        message={successModal.message}
        autoClose={true}
        autoCloseDelay={3500}
      />

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: "", details: "" })}
        message={errorModal.message}
        details={errorModal.details}
      />
    </div>
  );
};

export default SubjectDroppingManagement;
