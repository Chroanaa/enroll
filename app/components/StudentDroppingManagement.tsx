"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  Search,
  User,
  UserMinus,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { colors } from "../colors";
import { useAcademicTerm } from "../hooks/useAcademicTerm";
import { useProgramsWithMajors } from "../hooks/useProgramsWithMajors";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";
import ConfirmationModal from "./common/ConfirmationModal";
import Pagination from "./common/Pagination";
import type { EnrolledSubject } from "./assessmentManagement/types";

interface StudentListItem {
  studentNumber: string;
  studentName: string;
  programCode: string;
  yearLevel: number | null;
  enrolledSubjectCount: number;
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

const StudentDroppingManagement: React.FC = () => {
  const { data: session } = useSession();
  const requesterRoleId = Number((session?.user as any)?.role) || 0;
  const canDirectDrop = requesterRoleId === 1 || requesterRoleId === 5; // Admin/Dean

  const { currentTerm, loading: termLoading } = useAcademicTerm();
  const { programs, loading: programsLoading } = useProgramsWithMajors();
  const [studentSearch, setStudentSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [yearLevelFilter, setYearLevelFilter] = useState("");
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isFetchingStudent, setIsFetchingStudent] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isDroppingStudent, setIsDroppingStudent] = useState(false);
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [enrolledSubjects, setEnrolledSubjects] = useState<EnrolledSubject[]>([]);
  const [subjectsError, setSubjectsError] = useState("");
  const [dropReason, setDropReason] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: "", details: "" });
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [studentItemsPerPage, setStudentItemsPerPage] = useState(10);
  const [subjectCurrentPage, setSubjectCurrentPage] = useState(1);
  const [subjectItemsPerPage, setSubjectItemsPerPage] = useState(6);

  const isStudentSelected = Boolean(student) || isFetchingStudent;
  const semesterNum = currentTerm?.semester === "First" ? 1 : 2;

  const currentTermLabel = useMemo(() => {
    if (!currentTerm) return "Loading current term...";
    return `${currentTerm.semester} Semester, ${currentTerm.academicYear}`;
  }, [currentTerm]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students;
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

  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / studentItemsPerPage));
  const totalSubjectPages = Math.max(1, Math.ceil(enrolledSubjects.length / subjectItemsPerPage));

  const pendingDropCount = useMemo(
    () =>
      enrolledSubjects.filter(
        (subject) => String(subject.drop_status || "").toLowerCase() === "pending_approval",
      ).length,
    [enrolledSubjects],
  );

  useEffect(() => {
    const fetchStudents = async () => {
      if (!currentTerm) return;
      setIsLoadingStudents(true);

      try {
        const response = await fetch(
          `/api/auth/enrolled-subjects/students?academicYear=${encodeURIComponent(
            currentTerm.academicYear,
          )}&semester=${semesterNum}&includeDetails=true${programFilter ? `&programId=${encodeURIComponent(programFilter)}` : ""}${yearLevelFilter ? `&yearLevel=${encodeURIComponent(yearLevelFilter)}` : ""}`,
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load students.");
        }

        const data = Array.isArray(result.data) ? result.data : [];
        setStudents(data);
      } catch (error) {
        setErrorModal({
          isOpen: true,
          message: error instanceof Error ? error.message : "Failed to load students.",
          details: "",
        });
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [currentTerm, semesterNum, programFilter, yearLevelFilter]);

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
      const response = await fetch(
        `/api/auth/enrolled-subjects?studentNumber=${encodeURIComponent(studentNumber)}&academicYear=${encodeURIComponent(
          currentTerm.academicYear,
        )}&semester=${semesterNum}`,
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to load enrolled subjects.");
      }
      setEnrolledSubjects(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      setSubjectsError(error instanceof Error ? error.message : "Failed to load enrolled subjects.");
      setEnrolledSubjects([]);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const handleStudentSelect = async (studentNumber: string) => {
    setIsFetchingStudent(true);
    setSubjectsError("");
    try {
      const response = await fetch(`/api/students/${encodeURIComponent(studentNumber)}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to load student details.");
      }

      const fullName = [result.last_name, result.first_name, result.middle_name]
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
      setStudent(null);
      setEnrolledSubjects([]);
      setErrorModal({
        isOpen: true,
        message: error instanceof Error ? error.message : "Failed to load student details.",
        details: "",
      });
    } finally {
      setIsFetchingStudent(false);
    }
  };

  const handleDropStudent = async () => {
    if (!student || !currentTerm) return;
    setIsDroppingStudent(true);
    try {
      const response = await fetch("/api/auth/enrolled-subjects/drop-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber: student.studentNumber,
          academicYear: currentTerm.academicYear,
          semester: semesterNum,
          reason: dropReason.trim() || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to drop student.");
      }

      await fetchEnrolledSubjects(student.studentNumber);
      setSuccessModal({
        isOpen: true,
        message:
          result.message ||
          (canDirectDrop
            ? "Student drop completed successfully."
            : "Student drop request submitted for approval."),
      });
    } catch (error) {
      setErrorModal({
        isOpen: true,
        message: error instanceof Error ? error.message : "Failed to drop student.",
        details: "",
      });
    } finally {
      setIsDroppingStudent(false);
      setConfirmationOpen(false);
      setDropReason("");
    }
  };

  const handleBackToStudentList = () => {
    setStudent(null);
    setEnrolledSubjects([]);
    setSubjectsError("");
    setSubjectCurrentPage(1);
  };

  return (
    <div className="min-h-screen p-6 font-sans" style={{ backgroundColor: colors.paper, color: colors.primary }}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-[24px] font-semibold leading-tight" style={{ color: colors.primary }}>
              Student Dropping
            </h1>
            <p className="max-w-2xl text-sm leading-6" style={mutedTextStyle}>
              Drop all enrolled subjects of a selected student for the active term.
              Registrar requests require admin/dean approval.
            </p>
          </div>
          <div className="inline-flex items-center gap-3 rounded-xl px-4 py-3" style={cardStyle}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${colors.secondary}12`, color: colors.secondary }}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>
                Active Term
              </p>
              <p className="text-sm font-semibold" style={{ color: colors.primary }}>
                {currentTermLabel}
              </p>
            </div>
          </div>
        </header>

        {!isStudentSelected ? (
          <section className="overflow-hidden rounded-2xl" style={cardStyle}>
            <div className="flex flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between" style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}>
              <div>
                <h2 className="text-[20px] font-semibold" style={{ color: colors.primary }}>Student Directory</h2>
                <p className="mt-1 text-sm leading-6" style={mutedTextStyle}>
                  Select a student with enrolled subjects.
                </p>
              </div>
              <div className="flex w-full max-w-4xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                <div className="relative w-full lg:max-w-md">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: colors.neutral }} />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    placeholder="Search by student ID, name, or program"
                    className="h-11 w-full rounded-xl pl-11 pr-4 text-sm outline-none transition"
                    style={{ border: `1px solid ${colors.neutralBorder}`, backgroundColor: "white", color: colors.primary }}
                  />
                </div>
                <select
                  value={programFilter}
                  onChange={(event) => setProgramFilter(event.target.value)}
                  disabled={programsLoading}
                  className="h-11 w-full rounded-xl px-3 text-sm outline-none lg:max-w-sm"
                  style={{ border: `1px solid ${colors.neutralBorder}`, backgroundColor: "white", color: colors.primary }}
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
                  style={{ border: `1px solid ${colors.neutralBorder}`, backgroundColor: "white", color: colors.primary }}
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
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.secondary }} />
                <p className="text-sm font-medium" style={mutedTextStyle}>Loading student directory...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-20">
                <Search className="h-8 w-8" style={{ color: colors.neutral }} />
                <p className="text-sm font-medium" style={{ color: colors.primary }}>
                  No student records matched your search.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}>
                        <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>Student ID</th>
                        <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>Full Name</th>
                        <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>Program</th>
                        <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>Subjects</th>
                        <th className="px-6 py-4 text-right text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedStudents.map((item) => (
                        <tr key={item.studentNumber} style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}>
                          <td className="px-6 py-4 text-sm font-semibold" style={{ color: colors.primary }}>{item.studentNumber}</td>
                          <td className="px-6 py-4 text-sm" style={{ color: colors.primary }}>{item.studentName}</td>
                          <td className="px-6 py-4 text-sm" style={{ color: colors.tertiary }}>{item.programCode}</td>
                          <td className="px-6 py-4 text-sm font-semibold" style={{ color: colors.secondary }}>{item.enrolledSubjectCount}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleStudentSelect(item.studentNumber)}
                              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                              style={{ backgroundColor: colors.secondary }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.primary)}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.secondary)}
                            >
                              Select Record
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ borderTop: `1px solid ${colors.neutralBorder}`, backgroundColor: `${colors.neutralLight}66` }}>
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
        ) : (
          <>
            <button
              type="button"
              onClick={handleBackToStudentList}
              className="inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
              style={{ border: `1px solid ${colors.neutralBorder}`, color: colors.primary, backgroundColor: "white" }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Student Directory
            </button>

            <section className="grid gap-6 xl:grid-cols-[330px,1fr]">
              <div className="space-y-6">
                <div className="overflow-hidden rounded-2xl" style={cardStyle}>
                  <div className="border-b px-6 py-5" style={{ borderColor: colors.neutralBorder }}>
                    <h2 className="text-[18px] font-semibold" style={{ color: colors.primary }}>Student Profile</h2>
                  </div>
                  <div className="space-y-4 p-6">
                    {isFetchingStudent ? (
                      <div className="flex min-h-[180px] items-center justify-center">
                        <Loader2 className="h-7 w-7 animate-spin" style={{ color: colors.secondary }} />
                      </div>
                    ) : student ? (
                      <>
                        <div className="text-sm font-semibold" style={{ color: colors.primary }}>
                          <User className="mr-2 inline h-4 w-4" />
                          {student.studentName}
                        </div>
                        <div className="text-sm" style={{ color: colors.tertiary }}>{student.studentNumber}</div>
                        <div className="text-sm" style={{ color: colors.tertiary }}>
                          <Mail className="mr-2 inline h-4 w-4" />
                          {student.email}
                        </div>
                        <div className="text-sm" style={{ color: colors.tertiary }}>{student.programDisplay}</div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <section className="overflow-hidden rounded-2xl" style={cardStyle}>
                <div className="flex flex-col gap-4 border-b px-6 py-6 lg:flex-row lg:items-start lg:justify-between" style={{ borderColor: colors.neutralBorder }}>
                  <div>
                    <h2 className="text-[20px] font-semibold" style={{ color: colors.primary }}>Enrolled Subjects</h2>
                    <p className="mt-1 text-sm leading-6" style={mutedTextStyle}>
                      This action drops all currently enrolled subjects for this term.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: colors.neutralLight, color: colors.primary }}>
                      {enrolledSubjects.length} subjects
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDropReason("");
                        setConfirmationOpen(true);
                      }}
                      disabled={isLoadingSubjects || enrolledSubjects.length === 0 || isDroppingStudent}
                      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ backgroundColor: colors.danger }}
                    >
                      <UserMinus className="h-4 w-4" />
                      Drop Student
                    </button>
                  </div>
                </div>

                {pendingDropCount > 0 && (
                  <div className="mx-6 mt-6 flex items-start gap-3 rounded-xl px-4 py-4" style={{ backgroundColor: `${colors.warning}10`, border: `1px solid ${colors.warning}33` }}>
                    <Clock3 className="h-5 w-5" style={{ color: colors.warning }} />
                    <p className="text-sm" style={{ color: colors.warning }}>
                      {pendingDropCount} subject(s) already pending approval.
                    </p>
                  </div>
                )}

                {subjectsError ? (
                  <div className="mx-6 my-6 rounded-xl px-5 py-5" style={{ backgroundColor: `${colors.danger}10`, border: `1px solid ${colors.danger}33` }}>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5" style={{ color: colors.danger }} />
                      <p className="text-sm" style={{ color: colors.danger }}>{subjectsError}</p>
                    </div>
                  </div>
                ) : isLoadingSubjects ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-20">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.secondary }} />
                    <p className="text-sm font-medium" style={mutedTextStyle}>Loading enrolled subjects...</p>
                  </div>
                ) : enrolledSubjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-20">
                    <BookOpen className="h-8 w-8" style={{ color: colors.neutral }} />
                    <p className="text-sm font-medium" style={{ color: colors.primary }}>No subjects are currently enrolled for this term.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto px-6 py-6">
                      <table className="min-w-full">
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}>
                            <th className="px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>Code</th>
                            <th className="px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>Subject Title</th>
                            <th className="px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>Units</th>
                            <th className="px-4 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedEnrolledSubjects.map((subject) => {
                            const isPending =
                              String(subject.drop_status || "").toLowerCase() === "pending_approval";
                            const totalUnits =
                              subject.units_total ??
                              Number(subject.units_lec || 0) + Number(subject.units_lab || 0);

                            return (
                              <tr key={subject.id} style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}>
                                <td className="px-4 py-4 text-sm font-semibold" style={{ color: colors.primary }}>{subject.course_code}</td>
                                <td className="px-4 py-4 text-sm" style={{ color: colors.primary }}>{subject.descriptive_title}</td>
                                <td className="px-4 py-4 text-sm" style={{ color: colors.tertiary }}>{totalUnits}</td>
                                <td className="px-4 py-4 text-sm">
                                  {isPending ? (
                                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${colors.warning}16`, color: colors.warning }}>
                                      <Clock3 className="h-3.5 w-3.5" />
                                      Pending Approval
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${colors.success}16`, color: colors.success }}>
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Enrolled
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ borderTop: `1px solid ${colors.neutralBorder}`, backgroundColor: `${colors.neutralLight}66` }}>
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
            </section>
          </>
        )}

        <ConfirmationModal
          isOpen={confirmationOpen}
          onClose={() => setConfirmationOpen(false)}
          onConfirm={handleDropStudent}
          title="Confirm Student Dropping"
          description={
            canDirectDrop
              ? "Admin/Dean action is auto-approved and will remove all enrolled subjects for this term."
              : "Registrar action will submit all enrolled subjects for approval."
          }
          confirmText={canDirectDrop ? "Drop Student" : "Submit For Approval"}
          cancelText="Cancel"
          variant="danger"
          isLoading={isDroppingStudent}
          customContent={
            <div className="space-y-4">
              <div className="rounded-xl border p-4" style={{ borderColor: `${colors.accent}20`, backgroundColor: colors.paper }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: colors.tertiary }}>Student</p>
                <p className="mt-2 text-sm font-semibold" style={{ color: colors.primary }}>{student?.studentName}</p>
                <p className="mt-1 text-sm leading-6" style={{ color: colors.tertiary }}>{student?.studentNumber}</p>
              </div>
              <div className="rounded-xl border p-4" style={{ borderColor: `${colors.neutralBorder}` }}>
                <p className="text-sm" style={{ color: colors.primary }}>
                  This will process <strong>{enrolledSubjects.length}</strong> enrolled subject(s).
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="student-drop-reason" className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: colors.tertiary }}>
                  Reason
                </label>
                <textarea
                  id="student-drop-reason"
                  value={dropReason}
                  onChange={(event) => setDropReason(event.target.value)}
                  rows={4}
                  placeholder="Enter reason for dropping student..."
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={{ border: `1px solid ${colors.neutralBorder}`, backgroundColor: "white", color: colors.primary, resize: "none" }}
                />
              </div>
            </div>
          }
        />

        <SuccessModal
          isOpen={successModal.isOpen}
          onClose={() => setSuccessModal({ isOpen: false, message: "" })}
          message={successModal.message}
          autoClose
          autoCloseDelay={3500}
        />

        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() => setErrorModal({ isOpen: false, message: "", details: "" })}
          message={errorModal.message}
          details={errorModal.details}
        />
      </div>
    </div>
  );
};

export default StudentDroppingManagement;
