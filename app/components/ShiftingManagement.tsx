"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRightLeft,
  Calendar,
  FileText,
  GraduationCap,
  Loader2,
  Search,
  User,
} from "lucide-react";
import { colors } from "../colors";
import { useAcademicTerm } from "../hooks/useAcademicTerm";
import { shiftStudent } from "../utils/sectionApi";
import Pagination from "./common/Pagination";
import ConfirmationModal from "./common/ConfirmationModal";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";
import RegistrationPDFViewer from "./enrollment/RegistrationPDFViewer";

type StudentResult = {
  studentNumber: string;
  studentName: string;
  programCode: string;
  yearLevel: number | null;
  enrolledSubjectCount: number;
};

type AssignmentResult = {
  id: number;
  studentNumber: string;
  sectionId: number;
  academicYear: string;
  semester: string;
  assignmentType: string;
  subjectCount: number;
};

type SectionResult = {
  id: number;
  sectionName: string;
  status: string;
  academicYear: string;
  semester: string;
  maxCapacity: number;
  studentCount: number;
  programId: number;
  yearLevel: number;
};

type DirectoryRow = StudentResult & {
  assignment: AssignmentResult | null;
};

type StudentProfile = {
  studentNumber: string;
  studentName: string;
  programDisplay: string;
  programId: number | null;
  majorId: number | null;
  yearLevel: number | null;
};

type ManualSubjectRow = {
  student_section_subject_id: number;
  class_schedule_id: number;
  section_id: number;
  section_name: string;
  course_code: string;
  descriptive_title: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
};

type ManualAlternativeRow = {
  class_schedule_id: number;
  section_id: number;
  section_name: string;
  course_code: string;
  descriptive_title: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  border: `1px solid ${colors.neutralBorder}`,
  boxShadow: `0 14px 32px ${colors.neutralBorder}55`,
};

const normalizeSemester = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "first" || normalized === "first semester") return "first";
  if (normalized === "2" || normalized === "second" || normalized === "second semester") return "second";
  if (normalized === "3" || normalized === "summer") return "summer";
  return "second";
};

const semesterToNumber = (semester: string) => {
  const normalized = normalizeSemester(semester);
  if (normalized === "first") return 1;
  if (normalized === "second") return 2;
  return 3;
};

export default function ShiftingManagement() {
  const { currentTerm, loading: termLoading } = useAcademicTerm();

  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("second");

  const [students, setStudents] = useState<DirectoryRow[]>([]);
  const [sections, setSections] = useState<SectionResult[]>([]);

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<DirectoryRow | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [assignment, setAssignment] = useState<AssignmentResult | null>(null);
  const [toSectionId, setToSectionId] = useState<number | null>(null);

  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [selectingStudentNumber, setSelectingStudentNumber] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [studentItemsPerPage, setStudentItemsPerPage] = useState(10);

  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: "", details: "" });

  const [registrationViewer, setRegistrationViewer] = useState<{ open: boolean; data: any | null; loading: boolean }>({
    open: false,
    data: null,
    loading: false,
  });
  const [manualSubjects, setManualSubjects] = useState<ManualSubjectRow[]>([]);
  const [manualAlternatives, setManualAlternatives] = useState<ManualAlternativeRow[]>([]);
  const [selectedManualSubjectRowId, setSelectedManualSubjectRowId] = useState<number | null>(null);
  const [selectedManualClassScheduleId, setSelectedManualClassScheduleId] = useState<number | null>(null);
  const [selectedAlternativeScheduleId, setSelectedAlternativeScheduleId] = useState<number | null>(null);
  const [loadingManualSubjects, setLoadingManualSubjects] = useState(false);
  const [loadingManualAlternatives, setLoadingManualAlternatives] = useState(false);
  const [submittingManualTransfer, setSubmittingManualTransfer] = useState(false);

  const formatScheduleTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

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

  const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / studentItemsPerPage));

  const currentTermLabel = useMemo(() => {
    if (!currentTerm) return "Loading current term...";
    return `${currentTerm.semester} Semester, ${currentTerm.academicYear}`;
  }, [currentTerm]);

  const currentSection = useMemo(
    () => sections.find((section) => section.id === assignment?.sectionId) ?? null,
    [sections, assignment],
  );

  const destinationSections = useMemo(() => {
    const base = sections.filter((section) => section.id !== assignment?.sectionId);

    return base.filter((section) => {
      const sameProgram = studentProfile?.programId ? section.programId === studentProfile.programId : true;
      const sameYearLevel = studentProfile?.yearLevel ? Number(section.yearLevel) === Number(studentProfile.yearLevel) : true;
      return sameProgram && sameYearLevel;
    });
  }, [sections, assignment, studentProfile]);

  const loadDirectory = async (targetAcademicYear: string, targetSemester: string) => {
    setLoadingDirectory(true);

    try {
      const semesterNumber = semesterToNumber(targetSemester);

      const [studentsResponse, assignmentsResponse, sectionsResponse] = await Promise.all([
        fetch(
          `/api/auth/enrolled-subjects/students?academicYear=${encodeURIComponent(targetAcademicYear)}&semester=${semesterNumber}&includeDetails=true`,
        ),
        fetch(`/api/student-section?academicYear=${encodeURIComponent(targetAcademicYear)}&semester=${encodeURIComponent(targetSemester)}`),
        fetch(`/api/sections?academicYear=${encodeURIComponent(targetAcademicYear)}&semester=${encodeURIComponent(targetSemester)}&status=active`),
      ]);

      const [studentsJson, assignmentsJson, sectionsJson] = await Promise.all([
        studentsResponse.json(),
        assignmentsResponse.json(),
        sectionsResponse.json(),
      ]);

      if (!studentsResponse.ok) {
        throw new Error(studentsJson?.error || "Failed to load students with enrolled subjects.");
      }
      if (!assignmentsResponse.ok) {
        throw new Error(assignmentsJson?.message || "Failed to load student assignments.");
      }
      if (!sectionsResponse.ok) {
        throw new Error(sectionsJson?.message || "Failed to load sections.");
      }

      const assignmentMap = new Map<string, AssignmentResult>();
      const assignmentRows = Array.isArray(assignmentsJson?.data) ? (assignmentsJson.data as AssignmentResult[]) : [];
      for (const row of assignmentRows) assignmentMap.set(row.studentNumber, row);

      const studentRows = Array.isArray(studentsJson?.data) ? (studentsJson.data as StudentResult[]) : [];

      const nextRows: DirectoryRow[] = studentRows
        .filter((student) => {
          const existingAssignment = assignmentMap.get(student.studentNumber) || null;
          return Number(student.enrolledSubjectCount) > 0 && Number(existingAssignment?.subjectCount || 0) > 0;
        })
        .map((student) => ({
          ...student,
          assignment: assignmentMap.get(student.studentNumber) || null,
        }));

      const nextSections = Array.isArray(sectionsJson?.data)
        ? sectionsJson.data.map((section: any) => ({
            id: section.id,
            sectionName: section.sectionName,
            status: section.status,
            academicYear: section.academicYear,
            semester: section.semester,
            maxCapacity: section.maxCapacity,
            studentCount: section.studentCount,
            programId: section.programId,
            yearLevel: section.yearLevel,
          }))
        : [];

      setStudents(nextRows);
      setSections(nextSections);
    } catch (err) {
      setStudents([]);
      setSections([]);
      setErrorModal({
        isOpen: true,
        message: err instanceof Error ? err.message : "Failed to load student directory.",
        details: "",
      });
    } finally {
      setLoadingDirectory(false);
    }
  };

  useEffect(() => {
    if (!currentTerm) return;

    const nextAcademicYear = currentTerm.academicYear;
    const nextSemester = normalizeSemester(currentTerm.semesterCode || currentTerm.semester);

    setAcademicYear(nextAcademicYear);
    setSemester(nextSemester);
    loadDirectory(nextAcademicYear, nextSemester).catch(() => {});
  }, [currentTerm]);

  useEffect(() => {
    setStudentCurrentPage(1);
  }, [studentSearch, students.length, studentItemsPerPage]);

  const handleStudentSelect = async (row: DirectoryRow) => {
    setSelectingStudentNumber(row.studentNumber);
    setLoadingStudent(true);

    try {
      const assignmentParams = new URLSearchParams({
        studentNumber: row.studentNumber,
        academicYear,
        semester,
      });

      const [assignmentResponse, studentResponse] = await Promise.all([
        fetch(`/api/student-section?${assignmentParams.toString()}`),
        fetch(`/api/students/${encodeURIComponent(row.studentNumber)}`),
      ]);

      const [assignmentJson, studentJson] = await Promise.all([
        assignmentResponse.json(),
        studentResponse.json(),
      ]);

      if (!assignmentResponse.ok) {
        throw new Error(assignmentJson?.message || "Failed to load current assignment.");
      }
      if (!studentResponse.ok) {
        throw new Error(studentJson?.error || "Failed to load student profile.");
      }

      const currentAssignment = (assignmentJson?.data || [])[0] as AssignmentResult | undefined;
      if (!currentAssignment) {
        throw new Error("Student has no section assignment for this term.");
      }

      if (!row.enrolledSubjectCount || row.enrolledSubjectCount <= 0) {
        throw new Error("Student has no enrolled subjects yet. Complete assessment/enrollment first before shifting.");
      }

      if (!currentAssignment.subjectCount || currentAssignment.subjectCount <= 0) {
        throw new Error("Student has no student section subjects yet. Please assign section subjects first before shifting.");
      }

      const fullName = [studentJson.last_name, studentJson.first_name, studentJson.middle_name]
        .filter(Boolean)
        .join(", ");

      const programDisplay = studentJson.major?.name
        ? `${studentJson.program?.code || studentJson.course_program || "N/A"} - ${studentJson.major.name}`
        : studentJson.program?.code || studentJson.course_program || "N/A";

      setSelectedStudent(row);
      setStudentProfile({
        studentNumber: studentJson.student_number,
        studentName: fullName || row.studentName,
        programDisplay,
        programId: studentJson.program?.id ?? null,
        majorId: studentJson.major?.id ?? null,
        yearLevel: studentJson.year_level ?? row.yearLevel ?? null,
      });
      setAssignment(currentAssignment);
      setToSectionId(null);

      setLoadingManualSubjects(true);
      const manualResponse = await fetch(
        `/api/student-section/manual-subject?studentNumber=${encodeURIComponent(row.studentNumber)}&academicYear=${encodeURIComponent(academicYear)}&semester=${encodeURIComponent(semester)}`,
      );
      const manualJson = await manualResponse.json();
      if (!manualResponse.ok || !manualJson?.success) {
        throw new Error(manualJson?.error || "Failed to load student's section subjects.");
      }

      setManualSubjects(Array.isArray(manualJson?.data?.subjects) ? manualJson.data.subjects : []);
      setManualAlternatives([]);
      setSelectedManualSubjectRowId(null);
      setSelectedManualClassScheduleId(null);
      setSelectedAlternativeScheduleId(null);
    } catch (err) {
      setErrorModal({
        isOpen: true,
        message: err instanceof Error ? err.message : "Failed to load selected student.",
        details: "",
      });
    } finally {
      setSelectingStudentNumber(null);
      setLoadingStudent(false);
      setLoadingManualSubjects(false);
    }
  };

  const handleSelectManualSubject = async (studentSectionSubjectId: number, classScheduleId: number) => {
    if (!selectedStudent) return;

    setSelectedManualSubjectRowId(studentSectionSubjectId);
    setSelectedManualClassScheduleId(classScheduleId);
    setSelectedAlternativeScheduleId(null);
    setLoadingManualAlternatives(true);

    try {
      const response = await fetch(
        `/api/student-section/manual-subject?studentNumber=${encodeURIComponent(selectedStudent.studentNumber)}&academicYear=${encodeURIComponent(academicYear)}&semester=${encodeURIComponent(semester)}&selectedClassScheduleId=${classScheduleId}`,
      );
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Failed to load subject alternatives.");
      }
      setManualAlternatives(Array.isArray(result?.data?.alternatives) ? result.data.alternatives : []);
    } catch (error) {
      setManualAlternatives([]);
      setErrorModal({
        isOpen: true,
        message: error instanceof Error ? error.message : "Failed to load subject alternatives.",
        details: "",
      });
    } finally {
      setLoadingManualAlternatives(false);
    }
  };

  const handleSubmitManualTransfer = async () => {
    if (!selectedStudent || !selectedManualSubjectRowId || !selectedAlternativeScheduleId) return;

    setSubmittingManualTransfer(true);
    try {
      const response = await fetch("/api/student-section/manual-subject", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber: selectedStudent.studentNumber,
          academicYear,
          semester,
          studentSectionSubjectId: selectedManualSubjectRowId,
          toClassScheduleId: selectedAlternativeScheduleId,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Failed to transfer subject schedule.");
      }

      setSuccessModal({
        isOpen: true,
        message: "Subject schedule changed successfully.",
      });

      const refreshResponse = await fetch(
        `/api/student-section/manual-subject?studentNumber=${encodeURIComponent(selectedStudent.studentNumber)}&academicYear=${encodeURIComponent(academicYear)}&semester=${encodeURIComponent(semester)}`,
      );
      const refreshJson = await refreshResponse.json();
      if (refreshResponse.ok && refreshJson?.success) {
        setManualSubjects(Array.isArray(refreshJson?.data?.subjects) ? refreshJson.data.subjects : []);
      }
      setManualAlternatives([]);
      setSelectedManualSubjectRowId(null);
      setSelectedManualClassScheduleId(null);
      setSelectedAlternativeScheduleId(null);
    } catch (error) {
      setErrorModal({
        isOpen: true,
        message: error instanceof Error ? error.message : "Failed to transfer subject schedule.",
        details: "",
      });
    } finally {
      setSubmittingManualTransfer(false);
    }
  };

  const handleOpenRegistration = async () => {
    if (!selectedStudent) return;

    setRegistrationViewer({ open: true, data: null, loading: true });

    try {
      const params = new URLSearchParams({
        studentNumber: selectedStudent.studentNumber,
        academicYear,
        semester,
      });
      const response = await fetch(`/api/auth/enrollment/registration?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Failed to load registration PDF data.");

      setRegistrationViewer({ open: true, data: result.data ?? result, loading: false });
    } catch (err) {
      setRegistrationViewer({ open: false, data: null, loading: false });
      setErrorModal({
        isOpen: true,
        message: err instanceof Error ? err.message : "Failed to load registration PDF data.",
        details: "",
      });
    }
  };

  const executeShift = async () => {
    if (!selectedStudent || !assignment || !toSectionId) return;

    setSubmitting(true);

    try {
      const result = await shiftStudent({
        studentNumber: selectedStudent.studentNumber,
        toSectionId,
        academicYear,
        semester,
      });

      const destination = sections.find((section) => section.id === toSectionId);
      if (result?.requiresApproval) {
        setSuccessModal({
          isOpen: true,
          message: `${selectedStudent.studentName} shift request to ${destination?.sectionName || "destination section"} was submitted for admin/dean approval.`,
        });
      } else {
        setSuccessModal({
          isOpen: true,
          message: `${selectedStudent.studentName} is now in section ${destination?.sectionName || "destination section"}.`,
        });
      }

      await loadDirectory(academicYear, semester);

      setSelectedStudent(null);
      setStudentProfile(null);
      setAssignment(null);
      setToSectionId(null);
      setStudentSearch("");
      setStudentCurrentPage(1);
      setConfirmationOpen(false);
    } catch (err) {
      setErrorModal({
        isOpen: true,
        message: err instanceof Error ? err.message : "Failed to process section shifting.",
        details: "",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDestination = sections.find((section) => section.id === toSectionId) ?? null;

  return (
    <div className="min-h-screen p-6 font-sans" style={{ backgroundColor: colors.paper, color: colors.primary }}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-[24px] font-semibold leading-tight" style={{ color: colors.primary }}>
              Section Shifting
            </h1>
            <p className="max-w-2xl text-sm leading-6" style={{ color: colors.tertiary }}>
              Manage section shifting for students with enrolled subjects and section-subject links.
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

        {!selectedStudent ? (
          <section className="overflow-hidden rounded-2xl" style={cardStyle}>
            <div
              className="flex flex-col gap-4 px-6 py-6 lg:flex-row lg:items-center lg:justify-between"
              style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}
            >
              <div>
                <h2 className="text-[20px] font-semibold" style={{ color: colors.primary }}>
                  Student Directory
                </h2>
                <p className="mt-1 text-sm leading-6" style={{ color: colors.tertiary }}>
                  Students shown here already have enrolled subjects and student section subjects.
                </p>
              </div>

              <div className="relative w-full max-w-md">
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
                />
              </div>
            </div>

            {loadingDirectory || termLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-20">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.secondary }} />
                <p className="text-sm font-medium" style={{ color: colors.tertiary }}>
                  Loading student directory...
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-20">
                <Search className="h-7 w-7" style={{ color: colors.neutral }} />
                <p className="text-sm font-medium" style={{ color: colors.primary }}>
                  No students found.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}>
                        <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>
                          Student ID
                        </th>
                        <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>
                          Full Name
                        </th>
                        <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>
                          Program
                        </th>
                        <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>
                          Level
                        </th>
                        <th className="px-6 py-4 text-left text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>
                          Subjects
                        </th>
                        <th className="px-6 py-4 text-right text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedStudents.map((item) => {
                        const isSelecting = selectingStudentNumber === item.studentNumber;
                        return (
                          <tr
                            key={item.studentNumber}
                            style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}
                            onMouseEnter={(event) => {
                              event.currentTarget.style.backgroundColor = `${colors.secondary}08`;
                            }}
                            onMouseLeave={(event) => {
                              event.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            <td className="px-6 py-4 text-sm font-semibold" style={{ color: colors.primary }}>
                              {item.studentNumber}
                            </td>
                            <td className="px-6 py-4 text-sm" style={{ color: colors.primary }}>
                              {item.studentName}
                            </td>
                            <td className="px-6 py-4 text-sm" style={{ color: colors.tertiary }}>
                              {item.programCode}
                            </td>
                            <td className="px-6 py-4 text-sm" style={{ color: colors.tertiary }}>
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
                            <td className="px-6 py-4 text-sm" style={{ color: colors.tertiary }}>
                              {item.enrolledSubjectCount}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleStudentSelect(item)}
                                disabled={Boolean(selectingStudentNumber)}
                                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
                                style={{ backgroundColor: colors.secondary }}
                              >
                                {isSelecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {isSelecting ? "Loading..." : "Select Record"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={studentCurrentPage}
                  totalPages={totalStudentPages}
                  itemsPerPage={studentItemsPerPage}
                  totalItems={filteredStudents.length}
                  itemName="students"
                  onPageChange={setStudentCurrentPage}
                  onItemsPerPageChange={setStudentItemsPerPage}
                />
              </>
            )}
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl" style={cardStyle}>
            <div
              className="flex flex-col gap-4 px-6 py-6 lg:flex-row lg:items-start lg:justify-between"
              style={{ borderBottom: `1px solid ${colors.neutralBorder}` }}
            >
              <div>
                <h2 className="text-[20px] font-semibold" style={{ color: colors.primary }}>
                  Section Shifting Details
                </h2>
                <p className="mt-1 text-sm leading-6" style={{ color: colors.tertiary }}>
                  Destination sections are filtered by student program and year level.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenRegistration}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
                  style={{
                    backgroundColor: `${colors.primary}12`,
                    color: colors.primary,
                    border: `1px solid ${colors.primary}25`,
                  }}
                >
                  <FileText className="h-4 w-4" />
                  View Registration PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentProfile(null);
                    setAssignment(null);
                    setToSectionId(null);
                    setManualSubjects([]);
                    setManualAlternatives([]);
                    setSelectedManualSubjectRowId(null);
                    setSelectedManualClassScheduleId(null);
                    setSelectedAlternativeScheduleId(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
                  style={{
                    backgroundColor: colors.neutralLight,
                    color: colors.primary,
                    border: `1px solid ${colors.neutralBorder}`,
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back To Directory
                </button>
              </div>
            </div>

            {loadingStudent ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.secondary }} />
                <p className="text-sm font-medium" style={{ color: colors.tertiary }}>
                  Loading selected student...
                </p>
              </div>
            ) : (
              <div className="space-y-4 px-6 py-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: colors.neutralBorder }}>
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: colors.primary }}>
                      <User className="h-4 w-4" />
                      Student Profile
                    </div>
                    <p className="text-sm" style={{ color: colors.primary }}>{studentProfile?.studentName || selectedStudent.studentName}</p>
                    <p className="text-sm" style={{ color: colors.tertiary }}>{selectedStudent.studentNumber}</p>
                    <p className="text-sm" style={{ color: colors.tertiary }}>{studentProfile?.programDisplay || selectedStudent.programCode}</p>
                    <p className="text-sm" style={{ color: colors.tertiary }}>Current Section: {currentSection?.sectionName || "Not assigned"}</p>
                    <p className="text-sm" style={{ color: colors.tertiary }}>Enrolled Subjects: {selectedStudent.enrolledSubjectCount}</p>
                  </div>

                  <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: colors.neutralBorder }}>
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: colors.primary }}>
                      <GraduationCap className="h-4 w-4" />
                      Destination Section
                    </div>

                    <select
                      className="h-11 w-full rounded-xl px-3 text-sm outline-none"
                      style={{
                        border: `1px solid ${colors.neutralBorder}`,
                        backgroundColor: "white",
                        color: colors.primary,
                      }}
                      value={toSectionId ?? ""}
                      onChange={(event) => setToSectionId(event.target.value ? Number.parseInt(event.target.value, 10) : null)}
                    >
                      <option value="">Select destination section</option>
                      {destinationSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.sectionName} ({section.studentCount}/{section.maxCapacity || "unlimited"})
                        </option>
                      ))}
                    </select>

                    {destinationSections.length === 0 && (
                      <p className="text-xs" style={{ color: colors.warning }}>
                        No destination sections match this student's program/year level for the active term.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => setConfirmationOpen(true)}
                      disabled={submitting || !toSectionId || !assignment}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                      {submitting ? "Processing..." : "Submit Section Shift"}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border p-4" style={{ borderColor: colors.neutralBorder }}>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold" style={{ color: colors.primary }}>
                      Manual Subject Transfer (Conflict Resolution)
                    </h3>
                    <p className="text-xs" style={{ color: colors.tertiary }}>
                      Select one current subject (e.g. CPRO2), then choose the same subject from another section schedule.
                    </p>
                  </div>

                  {loadingManualSubjects ? (
                    <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: colors.tertiary }}>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading student section subjects...
                    </div>
                  ) : manualSubjects.length === 0 ? (
                    <p className="mt-4 text-sm" style={{ color: colors.warning }}>
                      No student section subjects found for this student.
                    </p>
                  ) : (
                    <>
                      <div className="mt-4">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: colors.neutral }}>
                          Select current subject schedule
                        </label>
                        <select
                          className="h-11 w-full rounded-xl px-3 text-sm outline-none"
                          style={{
                            border: `1px solid ${colors.neutralBorder}`,
                            backgroundColor: "white",
                            color: colors.primary,
                          }}
                          value={selectedManualSubjectRowId ?? ""}
                          onChange={(event) => {
                            const rowId = event.target.value ? Number.parseInt(event.target.value, 10) : null;
                            const selectedRow = manualSubjects.find((item) => item.student_section_subject_id === rowId);
                            if (!rowId || !selectedRow) {
                              setSelectedManualSubjectRowId(null);
                              setSelectedManualClassScheduleId(null);
                              setManualAlternatives([]);
                              setSelectedAlternativeScheduleId(null);
                              return;
                            }
                            handleSelectManualSubject(rowId, selectedRow.class_schedule_id).catch(() => {});
                          }}
                        >
                          <option value="">Choose subject schedule</option>
                          {manualSubjects.map((item) => (
                            <option key={item.student_section_subject_id} value={item.student_section_subject_id}>
                              {item.course_code} - {item.descriptive_title} | {item.section_name} | {item.day_of_week} {formatScheduleTime(item.start_time)}-{formatScheduleTime(item.end_time)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-4 overflow-x-auto rounded-xl border" style={{ borderColor: colors.neutralBorder }}>
                        <table className="min-w-full">
                          <thead style={{ backgroundColor: `${colors.secondary}08` }}>
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: colors.neutral }}>
                                Subject
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: colors.neutral }}>
                                Section
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: colors.neutral }}>
                                Day
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: colors.neutral }}>
                                Start
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: colors.neutral }}>
                                End
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: colors.neutral }}>
                                Select
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {loadingManualAlternatives ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-sm" style={{ color: colors.tertiary }}>
                                  Loading available schedules...
                                </td>
                              </tr>
                            ) : manualAlternatives.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-sm" style={{ color: colors.tertiary }}>
                                  {selectedManualSubjectRowId
                                    ? "No available schedules found for this subject in other sections."
                                    : "Select a subject above to view available schedules from other sections."}
                                </td>
                              </tr>
                            ) : (
                              manualAlternatives.map((option) => (
                                <tr key={option.class_schedule_id} style={{ borderTop: `1px solid ${colors.neutralBorder}` }}>
                                  <td className="px-4 py-3 text-sm" style={{ color: colors.primary }}>
                                    {option.course_code}
                                  </td>
                                  <td className="px-4 py-3 text-sm" style={{ color: colors.primary }}>
                                    {option.section_name}
                                  </td>
                                  <td className="px-4 py-3 text-sm" style={{ color: colors.tertiary }}>
                                    {option.day_of_week}
                                  </td>
                                  <td className="px-4 py-3 text-sm" style={{ color: colors.tertiary }}>
                                    {formatScheduleTime(option.start_time)}
                                  </td>
                                  <td className="px-4 py-3 text-sm" style={{ color: colors.tertiary }}>
                                    {formatScheduleTime(option.end_time)}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="radio"
                                      name="manual-transfer-schedule"
                                      checked={selectedAlternativeScheduleId === option.class_schedule_id}
                                      onChange={() => setSelectedAlternativeScheduleId(option.class_schedule_id)}
                                    />
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={handleSubmitManualTransfer}
                          disabled={!selectedManualSubjectRowId || !selectedAlternativeScheduleId || submittingManualTransfer}
                          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
                          style={{ backgroundColor: colors.secondary }}
                        >
                          {submittingManualTransfer ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {submittingManualTransfer ? "Applying..." : "Apply Subject Transfer"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={executeShift}
        title="Confirm Section Shift"
        description="Please review the student and section movement before submitting."
        confirmText="Confirm Shift"
        cancelText="Cancel"
        variant="info"
        isLoading={submitting}
        customContent={
          <div className="space-y-3 text-sm" style={{ color: colors.primary }}>
            <p>
              <strong>Student:</strong> {studentProfile?.studentName || selectedStudent?.studentName}
            </p>
            <p>
              <strong>Current Section:</strong> {currentSection?.sectionName || "Not assigned"}
            </p>
            <p>
              <strong>New Section:</strong> {selectedDestination?.sectionName || "N/A"}
            </p>
          </div>
        }
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: "" })}
        message={successModal.message}
        autoClose={true}
        autoCloseDelay={3000}
      />

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: "", details: "" })}
        message={errorModal.message}
        details={errorModal.details}
      />

      {registrationViewer.loading && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <div className="rounded-xl bg-white px-8 py-8 shadow-2xl">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.secondary }} />
              <p className="text-sm" style={{ color: colors.tertiary }}>
                Loading registration PDF...
              </p>
            </div>
          </div>
        </div>
      )}

      {registrationViewer.open && registrationViewer.data && !registrationViewer.loading && (
        <RegistrationPDFViewer
          data={registrationViewer.data}
          onClose={() => setRegistrationViewer({ open: false, data: null, loading: false })}
          auditContext="section_shifting"
        />
      )}
    </div>
  );
}
