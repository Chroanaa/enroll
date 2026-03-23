"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  Mail,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { colors } from "../colors";
import { useAcademicTerm } from "../hooks/useAcademicTerm";
import { useProgramsWithMajors } from "../hooks/useProgramsWithMajors";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";
import ConfirmationModal from "./common/ConfirmationModal";
import Pagination from "./common/Pagination";
import ActiveTermCard from "./common/ActiveTermCard";
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

const surfaceShadow = `0 14px 32px ${colors.neutralBorder}55`;

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  border: `1px solid ${colors.neutralBorder}`,
  boxShadow: surfaceShadow,
};

const mutedTextStyle: React.CSSProperties = {
  color: colors.tertiary,
};

const ProfileField: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  mono?: boolean;
}> = ({ icon, label, value, mono }) => (
  <div
    className="flex items-start gap-3 rounded-xl px-4 py-3"
    style={{
      backgroundColor: "white",
      border: `1px solid ${colors.neutralBorder}`,
    }}
  >
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      style={{
        backgroundColor: `${colors.secondary}12`,
        color: colors.secondary,
      }}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: colors.neutral }}
      >
        {label}
      </p>
      <p
        className={`mt-1 break-words text-sm font-semibold leading-6 ${
          mono ? "font-mono" : ""
        }`}
        style={{ color: colors.primary }}
      >
        {value || "N/A"}
      </p>
    </div>
  </div>
);

const SubjectDroppingManagement: React.FC = () => {
  const { currentTerm, loading: termLoading } = useAcademicTerm();
  const { programs, loading: programsLoading } = useProgramsWithMajors();
  const [studentSearch, setStudentSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [yearLevelFilter, setYearLevelFilter] = useState("");
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
  const [dropReason, setDropReason] = useState("");
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    message: "",
  });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
    details: "",
  });
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [studentItemsPerPage, setStudentItemsPerPage] = useState(10);
  const [subjectCurrentPage, setSubjectCurrentPage] = useState(1);
  const [subjectItemsPerPage, setSubjectItemsPerPage] = useState(5);

  const isStudentSelected = Boolean(student) || isFetchingStudent;

  const currentTermLabel = useMemo(() => {
    if (!currentTerm) {
      return "Loading current term...";
    }

    return `${currentTerm.semester} Semester, ${currentTerm.academicYear}`;
  }, [currentTerm]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter((item) => {
      return (
        item.studentNumber.toLowerCase().includes(query) ||
        item.studentName.toLowerCase().includes(query) ||
        item.programCode.toLowerCase().includes(query)
      );
    });
  }, [studentSearch, students]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (studentCurrentPage - 1) * studentItemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + studentItemsPerPage);
  }, [filteredStudents, studentCurrentPage, studentItemsPerPage]);

  const paginatedEnrolledSubjects = useMemo(() => {
    const startIndex = (subjectCurrentPage - 1) * subjectItemsPerPage;
    return enrolledSubjects.slice(startIndex, startIndex + subjectItemsPerPage);
  }, [enrolledSubjects, subjectCurrentPage, subjectItemsPerPage]);

  const totalStudentPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / studentItemsPerPage),
  );
  const totalSubjectPages = Math.max(
    1,
    Math.ceil(enrolledSubjects.length / subjectItemsPerPage),
  );

  const pendingDropCount = useMemo(() => {
    return enrolledSubjects.filter(
      (subject) =>
        String(subject.drop_status || "").toLowerCase() === "pending_approval",
    ).length;
  }, [enrolledSubjects]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!currentTerm) {
        return;
      }

      setIsLoadingStudents(true);

      try {
        const semesterNum = currentTerm.semester === "First" ? "1" : "2";
        const params = new URLSearchParams({
          academicYear: currentTerm.academicYear,
          semester: semesterNum,
          includeNotAssessed: "true",
        });
        if (programFilter) {
          params.set("programId", programFilter);
        }
        if (yearLevelFilter) {
          params.set("yearLevel", yearLevelFilter);
        }

        const [summaryResponse, enrolledStudentsResponse] = await Promise.all([
          fetch(`/api/auth/assessment/all-summaries?${params.toString()}`),
          fetch(
            `/api/auth/enrolled-subjects/students?academicYear=${encodeURIComponent(
              currentTerm.academicYear,
            )}&semester=${semesterNum}`,
          ),
        ]);
        const [result, enrolledStudentsResult] = await Promise.all([
          summaryResponse.json(),
          enrolledStudentsResponse.json(),
        ]);

        if (!summaryResponse.ok) {
          throw new Error(result.error || "Failed to load students.");
        }

        if (!enrolledStudentsResponse.ok) {
          throw new Error(
            enrolledStudentsResult.error ||
              "Failed to load enrolled subject students.",
          );
        }

        const enrolledStudentNumbers = new Set<string>(
          Array.isArray(enrolledStudentsResult.data)
            ? enrolledStudentsResult.data
            : [],
        );
        const rawData: any[] = result.data || [];
        const nextStudents = rawData
          .filter(
            (item) =>
              item.student_number &&
              enrolledStudentNumbers.has(String(item.student_number)),
          )
          .map((item) => {
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
  }, [currentTerm, programFilter, yearLevelFilter]);

  useEffect(() => {
    setStudentCurrentPage(1);
  }, [studentSearch, students.length, programFilter, yearLevelFilter]);

  useEffect(() => {
    setSubjectCurrentPage(1);
  }, [student?.studentNumber, enrolledSubjects.length]);

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
        error instanceof Error
          ? error.message
          : "Failed to load enrolled subjects.";
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
        email: result.email_address || "No email available",
        programDisplay,
        yearLevel: result.year_level ?? null,
      });

      await fetchEnrolledSubjects(result.student_number);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load student details.";
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
          reason: dropReason.trim() || null,
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
      setDropReason("");
    }
  };

  useEffect(() => {
    if (student?.studentNumber && currentTerm) {
      fetchEnrolledSubjects(student.studentNumber);
    }
  }, [student?.studentNumber, currentTerm]);

  const handleBackToStudentList = () => {
    setStudent(null);
    setEnrolledSubjects([]);
    setSubjectsError("");
    setSubjectCurrentPage(1);
  };

  return (
    <div
      className="min-h-screen p-6 font-sans"
      style={{ backgroundColor: colors.paper, color: colors.primary }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1
              className="text-[24px] font-semibold leading-tight"
              style={{ color: colors.primary }}
            >
              Subject Dropping
            </h1>
            <p className="max-w-2xl text-sm leading-6" style={mutedTextStyle}>
              Review active student enrollments and manage subject drop requests
              for the current academic term.
            </p>
          </div>

          <ActiveTermCard value={currentTermLabel} />
        </header>

        {!isStudentSelected && (
          <section className="overflow-hidden rounded-2xl" style={cardStyle}>
            <div
              className="flex flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between"
              style={{
                borderBottom: `1px solid ${colors.neutralBorder}`,
              }}
            >
              <div>
                <h2
                  className="text-[20px] font-semibold"
                  style={{ color: colors.primary }}
                >
                  Student Directory
                </h2>
                <p className="mt-1 text-sm leading-6" style={mutedTextStyle}>
                  Search and select a student record before processing any
                  subject drop request.
                </p>
              </div>

              <div className="flex w-full max-w-4xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                <div className="relative w-full lg:max-w-md">
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: colors.neutral }}
                  />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    placeholder="Search by student ID, name, or program"
                    className="h-11 w-full rounded-xl pl-11 pr-4 text-sm outline-none transition"
                    style={{
                      border: `1px solid ${colors.neutralBorder}`,
                      backgroundColor: "white",
                      color: colors.primary,
                    }}
                    onFocus={(event) => {
                      event.currentTarget.style.borderColor = colors.secondary;
                      event.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accent}22`;
                    }}
                    onBlur={(event) => {
                      event.currentTarget.style.borderColor = colors.neutralBorder;
                      event.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>
                <select
                  value={programFilter}
                  onChange={(event) => setProgramFilter(event.target.value)}
                  disabled={programsLoading}
                  className="h-11 w-full rounded-xl px-3 text-sm outline-none lg:max-w-sm"
                  style={{
                    border: `1px solid ${colors.neutralBorder}`,
                    backgroundColor: "white",
                    color: colors.primary,
                  }}
                >
                  <option value="">All Programs / Majors</option>
                  {programs.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={yearLevelFilter}
                  onChange={(event) => setYearLevelFilter(event.target.value)}
                  className="h-11 w-full rounded-xl px-3 text-sm outline-none lg:max-w-[180px]"
                  style={{
                    border: `1px solid ${colors.neutralBorder}`,
                    backgroundColor: "white",
                    color: colors.primary,
                  }}
                >
                  <option value="">All Year Levels</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
            </div>

            {isLoadingStudents || termLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-20">
                <Loader2
                  className="h-8 w-8 animate-spin"
                  style={{ color: colors.secondary }}
                />
                <p className="text-sm font-medium" style={mutedTextStyle}>
                  Loading student directory...
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-20">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.neutralLight }}
                >
                  <Search className="h-6 w-6" style={{ color: colors.neutral }} />
                </div>
                <p className="text-sm font-medium" style={{ color: colors.primary }}>
                  No student records matched your search.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr
                        style={{
                          borderBottom: `1px solid ${colors.neutralBorder}`,
                        }}
                      >
                        <th
                          className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]"
                          style={{ color: colors.neutral }}
                        >
                          Student ID
                        </th>
                        <th
                          className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]"
                          style={{ color: colors.neutral }}
                        >
                          Full Name
                        </th>
                        <th
                          className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]"
                          style={{ color: colors.neutral }}
                        >
                          Program
                        </th>
                        <th
                          className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]"
                          style={{ color: colors.neutral }}
                        >
                          Level
                        </th>
                        <th
                          className="px-6 py-4 text-right text-[12px] font-semibold uppercase tracking-[0.18em]"
                          style={{ color: colors.neutral }}
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedStudents.map((item) => (
                        <tr
                          key={item.studentNumber}
                          style={{
                            borderBottom: `1px solid ${colors.neutralBorder}`,
                          }}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.backgroundColor = `${colors.secondary}08`;
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.backgroundColor = "transparent";
                          }}
                        >
                          <td
                            className="px-6 py-4 text-sm font-semibold"
                            style={{ color: colors.primary }}
                          >
                            {item.studentNumber}
                          </td>
                          <td
                            className="px-6 py-4 text-sm"
                            style={{ color: colors.primary }}
                          >
                            {item.studentName}
                          </td>
                          <td
                            className="px-6 py-4 text-sm"
                            style={{ color: colors.neutralDark }}
                          >
                            {item.programCode}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                              style={{
                                backgroundColor: colors.neutralLight,
                                color: colors.primary,
                              }}
                            >
                              Year {item.yearLevel ?? "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleStudentSelect(item.studentNumber)}
                              disabled={isFetchingStudent}
                              className="rounded-lg px-4 py-2 text-sm font-semibold transition"
                              style={{
                                backgroundColor: colors.secondary,
                                color: colors.paper,
                                opacity: isFetchingStudent ? 0.6 : 1,
                              }}
                              onMouseEnter={(event) => {
                                if (!isFetchingStudent) {
                                  event.currentTarget.style.backgroundColor =
                                    colors.tertiary;
                                }
                              }}
                              onMouseLeave={(event) => {
                                if (!isFetchingStudent) {
                                  event.currentTarget.style.backgroundColor =
                                    colors.secondary;
                                }
                              }}
                            >
                              Select Record
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    borderTop: `1px solid ${colors.neutralBorder}`,
                    backgroundColor: `${colors.neutralLight}66`,
                  }}
                >
                  <Pagination
                    currentPage={studentCurrentPage}
                    totalPages={totalStudentPages}
                    itemsPerPage={studentItemsPerPage}
                    totalItems={filteredStudents.length}
                    itemName="students"
                    onPageChange={setStudentCurrentPage}
                    onItemsPerPageChange={setStudentItemsPerPage}
                  />
                </div>
              </>
            )}
          </section>
        )}

        {isStudentSelected && (
          <>
            <div>
              <button
                type="button"
                onClick={handleBackToStudentList}
                disabled={isFetchingStudent || isDroppingSubject}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition"
                style={{
                  ...cardStyle,
                  color: colors.primary,
                  opacity: isFetchingStudent || isDroppingSubject ? 0.7 : 1,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = `${colors.secondary}08`;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = "white";
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Student List
              </button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
              <section className="rounded-2xl p-6" style={cardStyle}>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2
                      className="text-[20px] font-semibold"
                      style={{ color: colors.primary }}
                    >
                      Student Details
                    </h2>
                    <p className="mt-1 text-sm leading-6" style={mutedTextStyle}>
                      Selected student profile for the active term.
                    </p>
                  </div>
                </div>

                {isFetchingStudent ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
                    <Loader2
                      className="h-8 w-8 animate-spin"
                      style={{ color: colors.secondary }}
                    />
                    <p className="text-sm font-medium" style={mutedTextStyle}>
                      Loading student details...
                    </p>
                  </div>
                ) : student ? (
                  <div className="space-y-4">
                    <ProfileField
                      icon={<User className="h-4 w-4" />}
                      label="Full Name"
                      value={student.studentName}
                    />
                    <ProfileField
                      icon={<AlertCircle className="h-4 w-4" />}
                      label="Student Number"
                      value={student.studentNumber}
                      mono
                    />
                    <ProfileField
                      icon={<Mail className="h-4 w-4" />}
                      label="Email"
                      value={student.email}
                    />
                    <ProfileField
                      icon={<BookOpen className="h-4 w-4" />}
                      label="Program"
                      value={student.programDisplay}
                    />
                    <ProfileField
                      icon={<GraduationCap className="h-4 w-4" />}
                      label="Year Level"
                      value={`Year ${student.yearLevel ?? "N/A"}`}
                    />
                  </div>
                ) : null}
              </section>

              <section className="overflow-hidden rounded-2xl" style={cardStyle}>
                <div
                  className="flex flex-col gap-4 px-6 py-6 lg:flex-row lg:items-start lg:justify-between"
                  style={{
                    borderBottom: `1px solid ${colors.neutralBorder}`,
                  }}
                >
                  <div>
                    <h2
                      className="text-[20px] font-semibold"
                      style={{ color: colors.primary }}
                    >
                      Enrolled Subjects
                    </h2>
                    <p className="mt-1 text-sm leading-6" style={mutedTextStyle}>
                      Only subjects from the current academic term can be
                      requested for dropping.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div
                      className="rounded-full px-4 py-2 text-sm font-semibold"
                      style={{
                        backgroundColor: colors.neutralLight,
                        color: colors.primary,
                      }}
                    >
                      {enrolledSubjects.length} subjects
                    </div>
                    {pendingDropCount > 0 && (
                      <div
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                        style={{
                          backgroundColor: `${colors.warning}14`,
                          color: colors.warning,
                        }}
                      >
                        <Clock3 className="h-4 w-4" />
                        {pendingDropCount} pending approval
                      </div>
                    )}
                  </div>
                </div>

                {pendingDropCount > 0 && (
                  <div
                    className="mx-6 mt-6 flex items-start gap-3 rounded-xl px-4 py-4"
                    style={{
                      backgroundColor: `${colors.warning}10`,
                      border: `1px solid ${colors.warning}33`,
                    }}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${colors.warning}18`,
                        color: colors.warning,
                      }}
                    >
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: colors.primary }}>
                        Pending approval request detected
                      </p>
                      <p className="mt-1 text-sm leading-6" style={mutedTextStyle}>
                        Requests already submitted for approval are locked until
                        an authorized reviewer completes the process.
                      </p>
                    </div>
                  </div>
                )}

                {subjectsError ? (
                  <div
                    className="mx-6 my-6 rounded-xl px-5 py-5"
                    style={{
                      backgroundColor: `${colors.danger}10`,
                      border: `1px solid ${colors.danger}33`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        className="mt-0.5 h-5 w-5"
                        style={{ color: colors.danger }}
                      />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: colors.danger }}>
                          Unable to load enrolled subjects
                        </p>
                        <p className="mt-1 text-sm" style={{ color: colors.danger }}>
                          {subjectsError}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : isLoadingSubjects ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-20">
                    <Loader2
                      className="h-8 w-8 animate-spin"
                      style={{ color: colors.secondary }}
                    />
                    <p className="text-sm font-medium" style={mutedTextStyle}>
                      Loading enrolled subjects...
                    </p>
                  </div>
                ) : enrolledSubjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-20">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-full"
                      style={{ backgroundColor: colors.neutralLight }}
                    >
                      <BookOpen className="h-6 w-6" style={{ color: colors.neutral }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: colors.primary }}>
                      No subjects are currently enrolled for this term.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto px-6 py-6">
                      <table className="min-w-full">
                        <thead>
                          <tr
                            style={{
                              borderBottom: `1px solid ${colors.neutralBorder}`,
                            }}
                          >
                            <th
                              className="px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]"
                              style={{ color: colors.neutral }}
                            >
                              Code
                            </th>
                            <th
                              className="px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]"
                              style={{ color: colors.neutral }}
                            >
                              Subject Title
                            </th>
                            <th
                              className="px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]"
                              style={{ color: colors.neutral }}
                            >
                              Units
                            </th>
                            <th
                              className="px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]"
                              style={{ color: colors.neutral }}
                            >
                              Prerequisite
                            </th>
                            <th
                              className="px-4 py-4 text-right text-[12px] font-semibold uppercase tracking-[0.18em]"
                              style={{ color: colors.neutral }}
                            >
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedEnrolledSubjects.map((subject) => {
                            const isPendingApproval =
                              String(subject.drop_status || "").toLowerCase() ===
                              "pending_approval";
                            const totalUnits =
                              subject.units_total ??
                              (Number(subject.units_lec || 0) +
                                Number(subject.units_lab || 0));

                            return (
                              <tr
                                key={subject.id}
                                style={{
                                  borderBottom: `1px solid ${colors.neutralBorder}`,
                                  backgroundColor: isPendingApproval
                                    ? `${colors.warning}08`
                                    : "transparent",
                                }}
                              >
                                <td
                                  className="px-4 py-4 text-sm font-semibold"
                                  style={{ color: colors.primary }}
                                >
                                  {subject.course_code}
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  <div className="flex flex-col gap-2">
                                    <span
                                      className="font-semibold"
                                      style={{ color: colors.primary }}
                                    >
                                      {subject.descriptive_title}
                                    </span>
                                    {isPendingApproval && (
                                      <span
                                        className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                                        style={{
                                          backgroundColor: `${colors.warning}16`,
                                          color: colors.warning,
                                        }}
                                      >
                                        <Clock3 className="h-3.5 w-3.5" />
                                        Pending Approval
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td
                                  className="px-4 py-4 text-sm"
                                  style={{ color: colors.neutralDark }}
                                >
                                  {totalUnits}
                                </td>
                                <td
                                  className="px-4 py-4 text-sm"
                                  style={{ color: colors.neutralDark }}
                                >
                                  {subject.prerequisite || "None"}
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmation({
                                        isOpen: true,
                                        subject,
                                      });
                                      setDropReason("");
                                    }}
                                    disabled={isPendingApproval}
                                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition"
                                    style={
                                      isPendingApproval
                                        ? {
                                            backgroundColor: colors.neutralLight,
                                            color: colors.neutral,
                                            cursor: "not-allowed",
                                          }
                                        : {
                                            backgroundColor: `${colors.danger}12`,
                                            color: colors.danger,
                                          }
                                    }
                                    onMouseEnter={(event) => {
                                      if (!isPendingApproval) {
                                        event.currentTarget.style.backgroundColor =
                                          `${colors.danger}20`;
                                      }
                                    }}
                                    onMouseLeave={(event) => {
                                      if (!isPendingApproval) {
                                        event.currentTarget.style.backgroundColor =
                                          `${colors.danger}12`;
                                      }
                                    }}
                                  >
                                    {isPendingApproval ? (
                                      <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Submitted
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="h-4 w-4" />
                                        Drop
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div
                      style={{
                        borderTop: `1px solid ${colors.neutralBorder}`,
                        backgroundColor: `${colors.neutralLight}66`,
                      }}
                    >
                      <Pagination
                        currentPage={subjectCurrentPage}
                        totalPages={totalSubjectPages}
                        itemsPerPage={subjectItemsPerPage}
                        totalItems={enrolledSubjects.length}
                        itemName="subjects"
                        onPageChange={setSubjectCurrentPage}
                        onItemsPerPageChange={setSubjectItemsPerPage}
                      />
                    </div>
                  </>
                )}
              </section>
            </div>
          </>
        )}

        <ConfirmationModal
          isOpen={confirmation.isOpen}
          onClose={() => {
            setConfirmation({ isOpen: false, subject: null });
            setDropReason("");
          }}
          onConfirm={handleDropSubject}
          title="Confirm Subject Drop"
          description="Review the subject information and provide a reason before submitting the drop request."
          confirmText="Proceed"
          cancelText="Cancel"
          variant="danger"
          isLoading={isDroppingSubject}
          customContent={
            <div className="space-y-4">
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor: `${colors.accent}20`,
                  backgroundColor: colors.paper,
                }}
              >
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: colors.tertiary }}
                >
                  Subject
                </p>
                <p className="mt-2 text-sm font-semibold" style={{ color: colors.primary }}>
                  {confirmation.subject?.course_code}
                </p>
                <p className="mt-1 text-sm leading-6" style={{ color: colors.tertiary }}>
                  {confirmation.subject?.descriptive_title}
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="drop-reason"
                  className="text-[11px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: colors.tertiary }}
                >
                  Reason For Dropping
                </label>
                <textarea
                  id="drop-reason"
                  value={dropReason}
                  onChange={(event) => setDropReason(event.target.value)}
                  rows={4}
                  placeholder="Enter the reason for dropping this subject..."
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={{
                    border: `1px solid ${colors.neutralBorder}`,
                    backgroundColor: "white",
                    color: colors.primary,
                    resize: "none",
                  }}
                  onFocus={(event) => {
                    event.currentTarget.style.borderColor = colors.secondary;
                    event.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}15`;
                  }}
                  onBlur={(event) => {
                    event.currentTarget.style.borderColor = colors.neutralBorder;
                    event.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>
          }
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
          onClose={() =>
            setErrorModal({ isOpen: false, message: "", details: "" })
          }
          message={errorModal.message}
          details={errorModal.details}
        />
      </div>
    </div>
  );
};

export default SubjectDroppingManagement;
