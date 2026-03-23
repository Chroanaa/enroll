"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  Clock3,
  Loader2,
  Search,
  User,
} from "lucide-react";
import { colors } from "../colors";
import { useAcademicTerm } from "../hooks/useAcademicTerm";
import { useProgramsWithMajors } from "../hooks/useProgramsWithMajors";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";
import ConfirmationModal from "./common/ConfirmationModal";
import Pagination from "./common/Pagination";

type StudentListItem = {
  studentNumber: string;
  studentName: string;
  programCode: string;
  yearLevel: number | null;
  enrolledSubjectCount: number;
};

type ProgramItem = {
  id: number;
  code: string;
  name: string;
  status?: string;
};

type MajorItem = {
  id: number;
  code: string;
  name: string;
  program_id: number;
};

type ProgramShiftRequestRow = {
  id: number;
  studentNumber: string;
  studentName: string;
  academicYear: string;
  semester: number;
  fromProgramCode?: string | null;
  fromProgramName?: string | null;
  fromMajorName?: string | null;
  toProgramCode?: string | null;
  toProgramName?: string | null;
  toMajorName?: string | null;
  reason?: string | null;
  status: string;
  requestedByName?: string | null;
  requestedAt?: string | null;
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  border: `1px solid ${colors.neutralBorder}`,
  boxShadow: `0 14px 32px ${colors.neutralBorder}55`,
};

function semesterToNumber(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "first" || normalized === "1" || normalized === "1st semester") return 1;
  if (normalized === "second" || normalized === "2" || normalized === "2nd semester") return 2;
  if (normalized === "summer" || normalized === "third" || normalized === "3") return 3;
  return 2;
}

function semesterLabel(value: number) {
  if (value === 1) return "First";
  if (value === 2) return "Second";
  if (value === 3) return "Summer";
  return `Sem ${value}`;
}

export default function ProgramShiftingManagement() {
  const { data: session } = useSession();
  const roleId = Number((session?.user as any)?.role) || 0;
  const canApprove = roleId === 1 || roleId === 5;

  const { currentTerm, loading: termLoading } = useAcademicTerm();
  const { programs: programMajorOptions, loading: programMajorOptionsLoading } =
    useProgramsWithMajors();
  const [studentSearch, setStudentSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [yearLevelFilter, setYearLevelFilter] = useState("");
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
  const [selectedStudentProgramId, setSelectedStudentProgramId] = useState<number | null>(null);

  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [majors, setMajors] = useState<MajorItem[]>([]);
  const [toProgramId, setToProgramId] = useState<number | null>(null);
  const [toMajorId, setToMajorId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const [requests, setRequests] = useState<ProgramShiftRequestRow[]>([]);

  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingMajors, setLoadingMajors] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const [studentPage, setStudentPage] = useState(1);
  const [studentItemsPerPage, setStudentItemsPerPage] = useState(10);

  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: "", details: "" });

  const semesterNum = useMemo(() => {
    if (!currentTerm) return 2;
    return semesterToNumber(currentTerm.semesterCode || currentTerm.semester);
  }, [currentTerm]);

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
    const start = (studentPage - 1) * studentItemsPerPage;
    return filteredStudents.slice(start, start + studentItemsPerPage);
  }, [filteredStudents, studentPage, studentItemsPerPage]);

  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / studentItemsPerPage));

  const availablePrograms = useMemo(() => {
    if (!selectedStudentProgramId) return programs;
    return programs.filter((program) => program.id !== selectedStudentProgramId);
  }, [programs, selectedStudentProgramId]);

  const selectedToProgram = useMemo(
    () => programs.find((program) => program.id === toProgramId) || null,
    [programs, toProgramId],
  );

  const loadStudents = async () => {
    if (!currentTerm) return;
    setLoadingStudents(true);
    try {
      const response = await fetch(
        `/api/auth/enrolled-subjects/students?academicYear=${encodeURIComponent(
          currentTerm.academicYear,
        )}&semester=${semesterNum}&includeDetails=true${programFilter ? `&programId=${encodeURIComponent(programFilter)}` : ""}${yearLevelFilter ? `&yearLevel=${encodeURIComponent(yearLevelFilter)}` : ""}`,
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load students.");
      setStudents(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      setStudents([]);
      setErrorModal({
        isOpen: true,
        message: error instanceof Error ? error.message : "Failed to load students.",
        details: "",
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadPrograms = async () => {
    setLoadingPrograms(true);
    try {
      const response = await fetch("/api/auth/program");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load programs.");
      const rows = Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : [];
      setPrograms(rows.filter((row: any) => String(row.status || "active").toLowerCase() === "active"));
    } catch (error) {
      setPrograms([]);
      setErrorModal({
        isOpen: true,
        message: error instanceof Error ? error.message : "Failed to load programs.",
        details: "",
      });
    } finally {
      setLoadingPrograms(false);
    }
  };

  const loadMajors = async (programId: number | null) => {
    if (!programId) {
      setMajors([]);
      return;
    }
    setLoadingMajors(true);
    try {
      const response = await fetch(`/api/auth/major/by-program/${programId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load majors.");
      setMajors(Array.isArray(result) ? result : []);
    } catch (error) {
      setMajors([]);
      setErrorModal({
        isOpen: true,
        message: error instanceof Error ? error.message : "Failed to load majors.",
        details: "",
      });
    } finally {
      setLoadingMajors(false);
    }
  };

  const loadRequests = async () => {
    if (!currentTerm) return;
    setLoadingRequests(true);
    try {
      const response = await fetch(
        `/api/auth/program-shift?academicYear=${encodeURIComponent(currentTerm.academicYear)}&semester=${semesterNum}&status=all`,
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load program shift requests.");
      setRequests(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      setRequests([]);
      setErrorModal({
        isOpen: true,
        message: error instanceof Error ? error.message : "Failed to load program shift requests.",
        details: "",
      });
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (!currentTerm) return;
    loadStudents();
    loadPrograms();
    loadRequests();
  }, [currentTerm, semesterNum, programFilter, yearLevelFilter]);

  useEffect(() => {
    setStudentPage(1);
  }, [studentSearch, students.length, studentItemsPerPage, programFilter, yearLevelFilter]);

  useEffect(() => {
    setToMajorId(null);
    loadMajors(toProgramId);
  }, [toProgramId]);

  const handleSelectStudent = async (student: StudentListItem) => {
    setSelectedStudent(student);
    setToProgramId(null);
    setToMajorId(null);
    setReason("");

    try {
      const response = await fetch(`/api/students/${encodeURIComponent(student.studentNumber)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load student details.");

      const programId = result?.program?.id
        ? Number(result.program.id)
        : /^\d+$/.test(String(result?.course_program || ""))
          ? Number(result.course_program)
          : null;
      setSelectedStudentProgramId(programId);
    } catch (error) {
      setSelectedStudentProgramId(null);
      setErrorModal({
        isOpen: true,
        message: error instanceof Error ? error.message : "Failed to load student details.",
        details: "",
      });
    }
  };

  const handleSubmitProgramShift = async () => {
    if (!selectedStudent || !currentTerm || !toProgramId) return;
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/program-shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber: selectedStudent.studentNumber,
          academicYear: currentTerm.academicYear,
          semester: semesterNum,
          toProgramId,
          toMajorId,
          reason: reason.trim() || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to submit program shift.");

      setSuccessModal({
        isOpen: true,
        message: result.message || "Program shift submitted successfully.",
      });
      setConfirmationOpen(false);
      setReason("");
      await loadRequests();
    } catch (error) {
      setErrorModal({
        isOpen: true,
        message: error instanceof Error ? error.message : "Failed to submit program shift.",
        details: "",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: number) => {
    setApprovingId(id);
    try {
      const response = await fetch("/api/auth/program-shift", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "approve" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to approve program shift.");

      setSuccessModal({
        isOpen: true,
        message: result.message || "Program shift approved successfully.",
      });
      await loadRequests();
    } catch (error) {
      setErrorModal({
        isOpen: true,
        message: error instanceof Error ? error.message : "Failed to approve program shift.",
        details: "",
      });
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="min-h-screen p-6 font-sans" style={{ backgroundColor: colors.paper, color: colors.primary }}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-[24px] font-semibold leading-tight" style={{ color: colors.primary }}>
              Program Shifting
            </h1>
            <p className="max-w-2xl text-sm leading-6" style={{ color: colors.tertiary }}>
              Submit and manage student program shift requests for the active term.
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

        {!selectedStudent && (
          <section className="overflow-hidden rounded-2xl" style={cardStyle}>
            <div className="flex flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between" style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}>
              <div>
                <h2 className="text-[20px] font-semibold" style={{ color: colors.primary }}>Student Directory</h2>
                <p className="mt-1 text-sm leading-6" style={{ color: colors.tertiary }}>
                  Select a student, then choose the target program/major.
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
                    style={{
                      border: `1px solid ${colors.neutralBorder}`,
                      backgroundColor: "white",
                      color: colors.primary,
                    }}
                  />
                </div>
                <select
                  value={programFilter}
                  onChange={(event) => setProgramFilter(event.target.value)}
                  disabled={programMajorOptionsLoading}
                  className="h-11 w-full rounded-xl px-3 text-sm outline-none lg:max-w-sm"
                  style={{ border: `1px solid ${colors.neutralBorder}`, backgroundColor: "white", color: colors.primary }}
                >
                  <option value="">All Programs / Majors</option>
                  {programMajorOptions.map((option) => (
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

            {loadingStudents || termLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-20">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.secondary }} />
                <p className="text-sm font-medium" style={{ color: colors.tertiary }}>
                  Loading students...
                </p>
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
                          <td className="px-6 py-4 text-sm" style={{ color: colors.tertiary }}>{item.enrolledSubjectCount}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleSelectStudent(item)}
                              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
                              style={{ backgroundColor: colors.secondary }}
                            >
                              <User className="h-4 w-4" />
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={studentPage}
                  totalPages={totalStudentPages}
                  itemsPerPage={studentItemsPerPage}
                  totalItems={filteredStudents.length}
                  itemName="students"
                  onPageChange={setStudentPage}
                  onItemsPerPageChange={setStudentItemsPerPage}
                />
              </>
            )}
          </section>
        )}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {selectedStudent && (
          <div className="rounded-2xl p-6" style={cardStyle}>
            <div className="mb-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setSelectedStudentProgramId(null);
                  setToProgramId(null);
                  setToMajorId(null);
                  setReason("");
                }}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
                style={{
                  backgroundColor: colors.neutralLight,
                  color: colors.primary,
                  border: `1px solid ${colors.neutralBorder}`,
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back To Student List
              </button>
            </div>
            <h2 className="text-[20px] font-semibold" style={{ color: colors.primary }}>
              Shift Request Form
            </h2>
            <p className="mt-1 text-sm leading-6" style={{ color: colors.tertiary }}>
              Submit a program shift request for the selected student.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: colors.neutral }}>
                  Selected Student
                </label>
                <div className="rounded-xl border px-3 py-3 text-sm" style={{ borderColor: colors.neutralBorder, color: colors.primary }}>
                  {selectedStudent ? `${selectedStudent.studentName} (${selectedStudent.studentNumber})` : "No student selected"}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: colors.neutral }}>
                  Target Program
                </label>
                <select
                  value={toProgramId ?? ""}
                  onChange={(event) => setToProgramId(event.target.value ? Number(event.target.value) : null)}
                  disabled={loadingPrograms || !selectedStudent}
                  className="h-11 w-full rounded-xl px-3 text-sm outline-none"
                  style={{ border: `1px solid ${colors.neutralBorder}`, backgroundColor: "white", color: colors.primary }}
                >
                  <option value="">Select target program</option>
                  {availablePrograms.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.code} - {program.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: colors.neutral }}>
                  Target Major (Optional)
                </label>
                <select
                  value={toMajorId ?? ""}
                  onChange={(event) => setToMajorId(event.target.value ? Number(event.target.value) : null)}
                  disabled={loadingMajors || !toProgramId}
                  className="h-11 w-full rounded-xl px-3 text-sm outline-none"
                  style={{ border: `1px solid ${colors.neutralBorder}`, backgroundColor: "white", color: colors.primary }}
                >
                  <option value="">No major</option>
                  {majors.map((major) => (
                    <option key={major.id} value={major.id}>
                      {major.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: colors.neutral }}>
                  Reason
                </label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explain why this student needs a program shift."
                  className="w-full rounded-xl px-3 py-3 text-sm outline-none"
                  style={{
                    border: `1px solid ${colors.neutralBorder}`,
                    backgroundColor: "white",
                    color: colors.primary,
                    resize: "none",
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => setConfirmationOpen(true)}
                disabled={!selectedStudent || !toProgramId || submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
                style={{ backgroundColor: colors.primary }}
              >
                <ArrowLeftRight className="h-4 w-4" />
                Submit Program Shift
              </button>
            </div>
          </div>
          )}

          <div className="rounded-2xl p-6" style={cardStyle}>
            <h2 className="text-[20px] font-semibold" style={{ color: colors.primary }}>
              Request Queue
            </h2>
            <p className="mt-1 text-sm leading-6" style={{ color: colors.tertiary }}>
              Pending and processed program shift requests for the active term.
            </p>

            {loadingRequests ? (
              <div className="mt-6 flex items-center gap-2 text-sm" style={{ color: colors.tertiary }}>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading requests...
              </div>
            ) : requests.length === 0 ? (
              <div className="mt-6 rounded-xl border px-4 py-5 text-sm" style={{ borderColor: colors.neutralBorder, color: colors.tertiary }}>
                No requests yet for this term.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {requests.slice(0, 12).map((request) => {
                  const isPending = String(request.status || "").toLowerCase() === "pending_approval";
                  return (
                    <div key={request.id} className="rounded-xl border px-4 py-4" style={{ borderColor: colors.neutralBorder }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: colors.primary }}>
                            {request.studentName} ({request.studentNumber})
                          </p>
                          <p className="mt-1 text-xs" style={{ color: colors.tertiary }}>
                            {request.fromProgramCode || "N/A"} {"->"} {request.toProgramCode || "N/A"} ({semesterLabel(request.semester)})
                          </p>
                          <p className="mt-1 text-xs" style={{ color: colors.tertiary }}>
                            {request.reason || "No reason provided."}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                            style={{
                              backgroundColor: isPending ? `${colors.warning}16` : `${colors.success}16`,
                              color: isPending ? colors.warning : colors.success,
                            }}
                          >
                            {isPending ? <Clock3 className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                            {String(request.status || "").replace(/_/g, " ")}
                          </span>

                          {canApprove && isPending && (
                            <button
                              type="button"
                              onClick={() => handleApprove(request.id)}
                              disabled={approvingId === request.id}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                              style={{ backgroundColor: colors.secondary }}
                            >
                              {approvingId === request.id ? "Approving..." : "Approve"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <ConfirmationModal
        isOpen={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={handleSubmitProgramShift}
        title="Confirm Program Shift"
        description="Review the student and destination program before submitting."
        confirmText="Submit Request"
        cancelText="Cancel"
        variant="info"
        isLoading={submitting}
        customContent={
          <div className="space-y-3 text-sm" style={{ color: colors.primary }}>
            <p><strong>Student:</strong> {selectedStudent?.studentName || "N/A"}</p>
            <p><strong>Student Number:</strong> {selectedStudent?.studentNumber || "N/A"}</p>
            <p><strong>To Program:</strong> {selectedToProgram ? `${selectedToProgram.code} - ${selectedToProgram.name}` : "N/A"}</p>
            <p><strong>To Major:</strong> {majors.find((m) => m.id === toMajorId)?.name || "None"}</p>
          </div>
        }
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: "" })}
        message={successModal.message}
        autoClose
        autoCloseDelay={3000}
      />

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: "", details: "" })}
        message={errorModal.message}
        details={errorModal.details}
      />
    </div>
  );
}
