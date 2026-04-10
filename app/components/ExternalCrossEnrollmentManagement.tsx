"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  GraduationCap,
  Loader2,
  Search,
  Send,
  User,
} from "lucide-react";
import { colors } from "../colors";
import { useAcademicTerm } from "../hooks/useAcademicTerm";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";
import Pagination from "./common/Pagination";

type StudentListItem = {
  student_number?: string;
  studentNumber?: string;
  name?: string;
  courseProgram?: string;
  programCode?: string;
  programName?: string;
  yearLevel?: number | null;
  email?: string;
};

type StudentDetails = {
  studentNumber: string;
  studentName: string;
  programDisplay: string;
  yearLevel: number | null;
  email?: string;
};

type SubjectItem = {
  id: number;
  code: string;
  name: string;
  units_lec?: number | null;
  units_lab?: number | null;
};

type ExternalRequest = {
  id: number;
  schoolName: string;
  subjectCode: string;
  subjectTitle: string;
  unitsTotal: number;
  academicYear: string;
  semester: number;
  status: string;
  reason?: string | null;
  requestedAt?: string | null;
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  border: `1px solid ${colors.neutralBorder}`,
  boxShadow: `0 10px 24px ${colors.neutralBorder}42`,
};

const secondaryCardStyle: React.CSSProperties = {
  backgroundColor: colors.paper,
  border: `1px solid ${colors.neutralBorder}`,
  boxShadow: `0 8px 18px ${colors.neutralBorder}24`,
};

const fieldClassName =
  "w-full rounded-2xl border bg-white text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#955A27] focus:ring-4 focus:ring-[#955A27]/10";

const primaryButtonClassName =
  "rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";

const sectionLabelClassName = "text-[11px] font-semibold uppercase tracking-[0.2em]";
const sectionDescriptionClassName = "text-[12px] leading-5";

function formatStatus(status: string | null | undefined) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "pending_approval") return "Pending Approval";
  if (normalized === "approved") return "Approved";
  if (normalized === "rejected") return "Rejected";
  return normalized || "Unknown";
}

function EmptyStateCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center sm:px-10">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${colors.secondary}10`, color: colors.secondary }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h4 className="mt-4 text-sm font-semibold" style={{ color: colors.primary }}>
        {title}
      </h4>
      <p className="mt-1 max-w-sm text-sm leading-6" style={{ color: colors.neutral }}>
        {description}
      </p>
    </div>
  );
}

export default function ExternalCrossEnrollmentManagement() {
  const { currentTerm, loading: termLoading } = useAcademicTerm();
  const [studentSearch, setStudentSearch] = useState("");
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [studentItemsPerPage, setStudentItemsPerPage] = useState(10);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [externalSchoolName, setExternalSchoolName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectTitle, setSubjectTitle] = useState("");
  const [unitsTotal, setUnitsTotal] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [reason, setReason] = useState("");
  const [requests, setRequests] = useState<ExternalRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: "" });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
    details: "",
  });

  const semesterNum = currentTerm?.semester === "First" ? 1 : 2;

  useEffect(() => {
    const fetchSubjects = async () => {
      setIsLoadingSubjects(true);
      try {
        const response = await fetch("/api/auth/subject");
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to load subjects.");
        }
        setSubjects(Array.isArray(result) ? result : []);
      } catch (error) {
        setErrorModal({
          isOpen: true,
          message: error instanceof Error ? error.message : "Failed to load subjects.",
          details: "",
        });
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!currentTerm) return;

      setIsLoadingStudents(true);
      try {
        const params = new URLSearchParams({
          listAll: "true",
          limit: "100",
          academicYear: currentTerm.academicYear,
          semester: currentTerm.semesterCode,
        });
        const response = await fetch(`/api/auth/students/search?${params.toString()}`);
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to load students.");
        }
        setStudents(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        setStudents([]);
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
  }, [currentTerm]);

  const filteredStudents = useMemo(() => {
    const needle = studentSearch.trim().toLowerCase();
    if (!needle) return students;

    return students.filter((item) => {
      const studentNumber = String(item.studentNumber || item.student_number || "").toLowerCase();
      const studentName = String(item.name || "").toLowerCase();
      const programDisplay = String(
        item.programCode || item.programName || item.courseProgram || "",
      ).toLowerCase();

      return (
        studentNumber.includes(needle) ||
        studentName.includes(needle) ||
        programDisplay.includes(needle)
      );
    });
  }, [studentSearch, students]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (studentCurrentPage - 1) * studentItemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + studentItemsPerPage);
  }, [filteredStudents, studentCurrentPage, studentItemsPerPage]);

  const totalStudentPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / studentItemsPerPage),
  );

  const pendingRequests = useMemo(
    () =>
      requests.filter(
        (request) => String(request.status || "").trim().toLowerCase() === "pending_approval",
      ),
    [requests],
  );

  const loadStudentContext = async (studentNumber: string) => {
    if (!currentTerm || !semesterNum) return;

    setIsLoadingRequests(true);
    try {
      const [studentResponse, requestResponse] = await Promise.all([
        fetch(`/api/students/${encodeURIComponent(studentNumber)}`),
        fetch(
          `/api/auth/external-cross-enrollment?studentNumber=${encodeURIComponent(
            studentNumber,
          )}&academicYear=${encodeURIComponent(currentTerm.academicYear)}&semester=${semesterNum}&status=all`,
        ),
      ]);
      const [studentResult, requestResult] = await Promise.all([
        studentResponse.json(),
        requestResponse.json(),
      ]);

      if (!studentResponse.ok) {
        throw new Error(studentResult.error || "Failed to load student details.");
      }
      if (!requestResponse.ok) {
        throw new Error(
          requestResult.error || "Failed to load external cross-enrollment requests.",
        );
      }

      const nameParts = [
        studentResult.first_name,
        studentResult.middle_name,
        studentResult.last_name,
      ].filter(Boolean);

      setSelectedStudent({
        studentNumber: studentResult.student_number,
        studentName: nameParts.join(" "),
        programDisplay:
          studentResult.program?.code && studentResult.program?.name
            ? `${studentResult.program.code} - ${studentResult.program.name}`
            : studentResult.course_program || "N/A",
        yearLevel: studentResult.year_level ?? null,
        email: studentResult.email_address || studentResult.email || "",
      });

      setYearLevel(
        studentResult.year_level !== null && studentResult.year_level !== undefined
          ? String(studentResult.year_level)
          : "",
      );

      setRequests(
        Array.isArray(requestResult.data)
          ? requestResult.data.map((item: any) => ({
              id: item.id,
              schoolName: item.schoolName || item.externalSchoolName || "N/A",
              subjectCode: item.subjectCode || "",
              subjectTitle: item.subjectTitle || "",
              unitsTotal: Number(item.unitsTotal || 0),
              academicYear: item.academicYear,
              semester: item.semester,
              status: item.status,
              reason: item.reason,
              requestedAt: item.requestedAt
                ? new Date(item.requestedAt).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : null,
            }))
          : [],
      );
    } catch (error) {
      setErrorModal({
        isOpen: true,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load external cross-enrollment context.",
        details: "",
      });
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const applySubjectSelection = (subject: SubjectItem | null) => {
    if (!subject) {
      setSubjectTitle("");
      setUnitsTotal("");
      return;
    }

    const lec = Number(subject.units_lec || 0);
    const lab = Number(subject.units_lab || 0);
    setSubjectCode(subject.code || "");
    setSubjectTitle(subject.name || "");
    setUnitsTotal(String(lec + lab));
  };

  const handleSubjectCodeChange = (value: string) => {
    const normalizedValue = value.toUpperCase();
    setSubjectCode(normalizedValue);

    const matchedSubject = subjects.find(
      (subject) => String(subject.code || "").toUpperCase() === normalizedValue,
    );

    if (matchedSubject) {
      applySubjectSelection(matchedSubject);
    } else {
      setSubjectTitle("");
      setUnitsTotal("");
    }
  };

  const handleSubjectTitleChange = (value: string) => {
    setSubjectTitle(value);

    const normalizedValue = value.trim().toLowerCase();
    const matchedSubject = subjects.find(
      (subject) => String(subject.name || "").trim().toLowerCase() === normalizedValue,
    );

    if (matchedSubject) {
      applySubjectSelection(matchedSubject);
    } else {
      setSubjectCode("");
      setUnitsTotal("");
    }
  };

  const handleSelectStudent = async (item: StudentListItem) => {
    const studentNumber = String(item.studentNumber || item.student_number || "").trim();
    if (!studentNumber) return;
    await loadStudentContext(studentNumber);
  };

  const resetForm = () => {
    setExternalSchoolName("");
    setSubjectCode("");
    setSubjectTitle("");
    setUnitsTotal("");
    setYearLevel(selectedStudent?.yearLevel ? String(selectedStudent.yearLevel) : "");
    setReason("");
  };

  const handleSubmit = async () => {
    if (!selectedStudent || !currentTerm || !semesterNum) {
      setErrorModal({ isOpen: true, message: "Select a student first.", details: "" });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/external-cross-enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber: selectedStudent.studentNumber,
          externalSchoolName,
          subjectCode,
          subjectTitle,
          unitsTotal: Number(unitsTotal),
          yearLevel: yearLevel ? Number(yearLevel) : null,
          academicYear: currentTerm.academicYear,
          semester: semesterNum,
          reason,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to submit external cross-enrollment request.");
      }

      setSuccessModal({
        isOpen: true,
        message: result.message || "External cross-enrollment request submitted successfully.",
      });
      resetForm();
      await loadStudentContext(selectedStudent.studentNumber);
    } catch (error) {
      setErrorModal({
        isOpen: true,
        message:
          error instanceof Error
            ? error.message
            : "Failed to submit external cross-enrollment request.",
        details: "",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-6 pb-6 pt-4" style={{ backgroundColor: colors.paper }}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <h1
              className="text-[2.35rem] font-bold tracking-[-0.03em]"
              style={{ color: colors.primary }}
            >
              External Cross Enrollment
            </h1>
            <p className="mt-1 text-[12px] leading-6" style={{ color: colors.neutral }}>
              Submit requests for students who will take a subject from another school, while
              keeping the same guided approval flow used in inter-program requests.
            </p>
          </div>

          <div className="inline-flex items-center gap-3 rounded-2xl px-5 py-4" style={cardStyle}>
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${colors.secondary}12`, color: colors.secondary }}
            >
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className={sectionLabelClassName} style={{ color: colors.neutral }}>
                Active Term
              </p>
              <p className="mt-1 text-[15px] font-semibold" style={{ color: colors.primary }}>
                {currentTerm
                  ? `${currentTerm.semester} Semester, ${currentTerm.academicYear}`
                  : "Loading current term..."}
              </p>
            </div>
          </div>
        </div>

        {!selectedStudent ? (
          <section className="rounded-2xl p-6" style={cardStyle}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-[1.15rem] font-semibold" style={{ color: colors.primary }}>
                  Student Directory
                </h2>
                <p
                  className={`${sectionDescriptionClassName} mt-1`}
                  style={{ color: colors.neutral }}
                >
                  Select a student first. The list is shown by default so the workflow matches the
                  inter-program screen.
                </p>
              </div>

              <div className="relative w-full lg:max-w-md">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: colors.tertiary }}
                />
                <input
                  value={studentSearch}
                  onChange={(event) => {
                    setStudentSearch(event.target.value);
                    setStudentCurrentPage(1);
                  }}
                  placeholder="Search student ID, name, or program"
                  className={`${fieldClassName} py-3 pl-11 pr-4`}
                  style={{ color: colors.primary }}
                />
              </div>
            </div>

            <div
              className="mt-6 overflow-x-auto rounded-2xl border"
              style={{ borderColor: colors.neutralBorder }}
            >
              <table className="min-w-full border-collapse">
                <thead>
                  <tr style={{ backgroundColor: `${colors.accent}08` }}>
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>
                      Student ID
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>
                      Full Name
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>
                      Program
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>
                      Level
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingStudents || termLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-sm"
                        style={{ color: colors.tertiary }}
                      >
                        Loading students...
                      </td>
                    </tr>
                  ) : paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-0 py-0">
                        <EmptyStateCard
                          icon={User}
                          title="No matching students"
                          description="Try a different student ID, name, or program keyword to continue with the request flow."
                        />
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student) => (
                      <tr
                        key={String(student.studentNumber || student.student_number || "")}
                        className="border-t transition-colors hover:bg-slate-50/70"
                        style={{ borderColor: colors.neutralBorder }}
                      >
                        <td className="px-4 py-4 text-sm font-semibold" style={{ color: colors.primary }}>
                          {student.studentNumber || student.student_number || "N/A"}
                        </td>
                        <td className="px-4 py-4 text-[14px] leading-6" style={{ color: colors.primary }}>
                          {student.name || "N/A"}
                        </td>
                        <td className="px-4 py-4 text-[14px] leading-6" style={{ color: colors.neutralDark }}>
                          {student.programCode || student.programName || student.courseProgram || "N/A"}
                        </td>
                        <td className="px-4 py-4 text-[14px]" style={{ color: colors.neutralDark }}>
                          {student.yearLevel ? `Year ${student.yearLevel}` : "N/A"}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleSelectStudent(student)}
                            className={primaryButtonClassName}
                            style={{ backgroundColor: colors.secondary }}
                          >
                            Select Student
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={studentCurrentPage}
              totalPages={totalStudentPages}
              totalItems={filteredStudents.length}
              itemsPerPage={studentItemsPerPage}
              onPageChange={setStudentCurrentPage}
              onItemsPerPageChange={(value) => {
                setStudentItemsPerPage(value);
                setStudentCurrentPage(1);
              }}
            />
          </section>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setSelectedStudent(null);
                setRequests([]);
                resetForm();
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all"
              style={{ ...cardStyle, color: colors.primary }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Student List
            </button>

            <section className="rounded-2xl px-5 py-4" style={cardStyle}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 xl:max-w-[280px]">
                  <p className={sectionLabelClassName} style={{ color: colors.neutral }}>
                    Student Summary
                  </p>
                  <h2
                    className="mt-1 line-clamp-2 text-[1.2rem] font-semibold leading-[1.35]"
                    style={{ color: colors.primary }}
                  >
                    {selectedStudent.studentName}
                  </h2>
                </div>

                <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="min-w-0">
                    <p className={sectionLabelClassName} style={{ color: colors.neutral }}>
                      Student ID
                    </p>
                    <p className="mt-1 text-[15px] font-semibold" style={{ color: colors.primary }}>
                      {selectedStudent.studentNumber}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className={sectionLabelClassName} style={{ color: colors.neutral }}>
                      Program
                    </p>
                    <p className="mt-1 line-clamp-2 text-[14px] font-semibold leading-6" style={{ color: colors.neutralDark }}>
                      {selectedStudent.programDisplay}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className={sectionLabelClassName} style={{ color: colors.neutral }}>
                      Year Level
                    </p>
                    <p className="mt-1 text-[15px] font-semibold" style={{ color: colors.primary }}>
                      {selectedStudent.yearLevel ? `Year ${selectedStudent.yearLevel}` : "N/A"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className={sectionLabelClassName} style={{ color: colors.neutral }}>
                      Email
                    </p>
                    <p className="mt-1 truncate text-[14px] font-semibold" style={{ color: colors.neutralDark }}>
                      {selectedStudent.email || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-2xl p-5" style={cardStyle}>
                <div className="flex flex-col gap-2 border-b pb-5" style={{ borderColor: colors.neutralBorder }}>
                  <p className={sectionLabelClassName} style={{ color: colors.neutral }}>
                    Guided Request Flow
                  </p>
                  <h2 className="text-[1.65rem] font-semibold tracking-tight" style={{ color: colors.primary }}>
                    External School Request
                  </h2>
                  <p className={sectionDescriptionClassName} style={{ color: colors.neutral }}>
                    Follow the same guided layout as inter-program: identify the external school,
                    match the subject from the subject table, then send the request for approval.
                  </p>
                </div>

                <div className="mt-6 space-y-5">
                  <div
                    className="grid gap-4 rounded-2xl border p-4 lg:grid-cols-[132px_minmax(0,1fr)] lg:items-start"
                    style={{
                      borderColor: externalSchoolName ? `${colors.secondary}40` : `${colors.secondary}50`,
                      backgroundColor: externalSchoolName ? `${colors.secondary}04` : `${colors.secondary}05`,
                    }}
                  >
                    <div className="relative">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                        style={{
                          backgroundColor: `${colors.secondary}14`,
                          color: colors.secondary,
                        }}
                      >
                        1
                      </div>
                      <div
                        className="ml-[17px] mt-2 hidden h-[calc(100%-2.25rem)] w-px lg:block"
                        style={{ backgroundColor: colors.neutralBorder }}
                      />
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: colors.secondary }}>
                        Step 1
                      </p>
                      <p className="mt-1 text-[13px] font-semibold" style={{ color: colors.primary }}>
                        Enter external school
                      </p>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-[12px] leading-5" style={{ color: colors.neutral }}>
                        <Building2 className="h-4 w-4" />
                        <span>Type the school where the student will take the subject.</span>
                      </div>
                      <input
                        value={externalSchoolName}
                        onChange={(event) => setExternalSchoolName(event.target.value)}
                        placeholder="Enter external school name"
                        className={`${fieldClassName} px-3 py-3`}
                        style={{ color: colors.primary }}
                      />
                    </div>
                  </div>

                  <div
                    className="grid gap-4 rounded-2xl border p-4 lg:grid-cols-[132px_minmax(0,1fr)] lg:items-start"
                    style={{
                      borderColor:
                        subjectCode || subjectTitle ? `${colors.secondary}40` : colors.neutralBorder,
                      backgroundColor: subjectCode || subjectTitle ? `${colors.secondary}04` : "white",
                    }}
                  >
                    <div>
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                        style={{
                          backgroundColor: `${colors.secondary}16`,
                          color: colors.secondary,
                        }}
                      >
                        2
                      </div>
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: colors.secondary }}>
                        Step 2
                      </p>
                      <p className="mt-1 text-[13px] font-semibold" style={{ color: colors.primary }}>
                        Match subject record
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[12px] leading-5" style={{ color: colors.neutral }}>
                        <GraduationCap className="h-4 w-4" />
                        <span>Select a subject code or title and let the units auto-fill from the subject table.</span>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold" style={{ color: colors.primary }}>
                            Subject Code
                          </label>
                          <input
                            value={subjectCode}
                            onChange={(event) => handleSubjectCodeChange(event.target.value)}
                            placeholder="e.g. MATH101"
                            list="external-cross-enrollment-subject-codes"
                            className={`${fieldClassName} px-3 py-3`}
                            style={{ color: colors.primary }}
                          />
                          <datalist id="external-cross-enrollment-subject-codes">
                            {subjects.map((subject) => (
                              <option key={subject.id} value={subject.code}>
                                {subject.name}
                              </option>
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold" style={{ color: colors.primary }}>
                            Units
                          </label>
                          <input
                            value={unitsTotal}
                            readOnly
                            placeholder={isLoadingSubjects ? "Loading subjects..." : "Auto-filled from subject"}
                            className={`${fieldClassName} px-3 py-3`}
                            style={{
                              color: colors.primary,
                              backgroundColor: `${colors.paper}`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold" style={{ color: colors.primary }}>
                          Subject Title
                        </label>
                        <input
                          value={subjectTitle}
                          onChange={(event) => handleSubjectTitleChange(event.target.value)}
                          placeholder="Select or type a subject title"
                          list="external-cross-enrollment-subject-titles"
                          className={`${fieldClassName} px-3 py-3`}
                          style={{ color: colors.primary }}
                        />
                        <datalist id="external-cross-enrollment-subject-titles">
                          {subjects.map((subject) => (
                            <option key={subject.id} value={subject.name}>
                              {subject.code}
                            </option>
                          ))}
                        </datalist>
                        <p className="mt-2 text-xs" style={{ color: colors.neutral }}>
                          Units include lecture and lab from the subject record when available.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="grid gap-4 rounded-2xl border p-4 lg:grid-cols-[132px_minmax(0,1fr)] lg:items-start"
                    style={{
                      borderColor: reason ? `${colors.secondary}40` : colors.neutralBorder,
                      backgroundColor: reason ? `${colors.secondary}04` : "white",
                    }}
                  >
                    <div>
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                        style={{
                          backgroundColor: `${colors.secondary}16`,
                          color: colors.secondary,
                        }}
                      >
                        3
                      </div>
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: colors.secondary }}>
                        Step 3
                      </p>
                      <p className="mt-1 text-[13px] font-semibold" style={{ color: colors.primary }}>
                        Confirm details
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold" style={{ color: colors.primary }}>
                            Year Level
                          </label>
                          <input
                            value={yearLevel}
                            onChange={(event) => setYearLevel(event.target.value)}
                            placeholder="Optional"
                            className={`${fieldClassName} px-3 py-3`}
                            style={{ color: colors.primary }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold" style={{ color: colors.primary }}>
                          Reason
                        </label>
                        <textarea
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                          rows={4}
                          placeholder="Why is the student taking this subject from another school?"
                          className={`${fieldClassName} resize-none px-3 py-3`}
                          style={{ color: colors.primary }}
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={submitting || termLoading}
                          className={primaryButtonClassName}
                          style={{
                            backgroundColor: colors.secondary,
                            boxShadow: `0 10px 20px ${colors.secondary}20`,
                          }}
                        >
                          <span className="inline-flex items-center gap-2">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Submit Request
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <aside className="rounded-2xl border p-4" style={secondaryCardStyle}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={sectionLabelClassName} style={{ color: colors.neutral }}>
                      Request Queue
                    </p>
                    <h3 className="mt-1 text-[14px] font-semibold" style={{ color: colors.neutralDark }}>
                      Pending Requests
                    </h3>
                    <p className="mt-1 text-[11px] leading-5" style={{ color: colors.neutral }}>
                      Submitted external school requests awaiting approval.
                    </p>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: `${colors.neutralBorder}`,
                      color: colors.neutralDark,
                    }}
                  >
                    {pendingRequests.length}
                  </span>
                </div>

                {isLoadingRequests ? (
                  <div className="py-10 text-sm" style={{ color: colors.tertiary }}>
                    Loading requests...
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <EmptyStateCard
                    icon={User}
                    title="No pending requests"
                    description="Submitted external cross-enrollment requests for this student will appear here while awaiting approval."
                  />
                ) : (
                  <div className="mt-4 max-h-[280px] space-y-3 overflow-y-auto pr-1">
                    {pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-xl border px-3 py-3"
                        style={{
                          borderColor: colors.neutralBorder,
                          backgroundColor: "white",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: colors.primary }}>
                              {request.subjectCode}
                            </p>
                            <p className="mt-1 text-[13px] leading-5" style={{ color: colors.primary }}>
                              {request.subjectTitle}
                            </p>
                          </div>
                          <span
                            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                            style={{
                              backgroundColor: `${colors.warning}12`,
                              color: colors.warning,
                            }}
                          >
                            {formatStatus(request.status)}
                          </span>
                        </div>
                        <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>
                          External School
                        </p>
                        <p className="mt-1 text-xs leading-5" style={{ color: colors.neutralDark }}>
                          {request.schoolName}
                        </p>
                        {request.reason ? (
                          <p className="mt-2 text-xs leading-5" style={{ color: colors.neutral }}>
                            {request.reason}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 border-t pt-4" style={{ borderColor: colors.neutralBorder }}>
                  <div>
                    <p className={sectionLabelClassName} style={{ color: colors.neutral }}>
                      History
                    </p>
                    <h3 className="mt-1 text-[14px] font-semibold" style={{ color: colors.neutralDark }}>
                      All Requests
                    </h3>
                    <p className="mt-1 text-[11px] leading-5" style={{ color: colors.neutral }}>
                      Full request history for the selected student.
                    </p>
                  </div>

                  {isLoadingRequests ? (
                    <div className="py-8 text-sm" style={{ color: colors.tertiary }}>
                      Loading request history...
                    </div>
                  ) : requests.length === 0 ? (
                    <p className="mt-3 text-xs leading-5" style={{ color: colors.neutral }}>
                      No external cross-enrollment requests found for this student.
                    </p>
                  ) : (
                    <div className="mt-3 max-h-[320px] space-y-3 overflow-y-auto pr-1">
                      {requests.map((request) => (
                        <div
                          key={`history-${request.id}`}
                          className="rounded-xl border px-3 py-3"
                          style={{
                            borderColor: colors.neutralBorder,
                            backgroundColor: "white",
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold" style={{ color: colors.primary }}>
                                {request.subjectCode} - {request.subjectTitle}
                              </p>
                              <p className="mt-1 text-xs leading-5" style={{ color: colors.neutralDark }}>
                                {request.schoolName}
                              </p>
                              <p className="text-xs leading-5" style={{ color: colors.neutral }}>
                                {request.academicYear} - Sem {request.semester} - {request.unitsTotal} units
                              </p>
                              {request.requestedAt ? (
                                <p className="text-xs leading-5" style={{ color: colors.neutral }}>
                                  Submitted {request.requestedAt}
                                </p>
                              ) : null}
                            </div>
                            <span
                              className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                              style={{
                                backgroundColor:
                                  request.status === "approved"
                                    ? "#dcfce7"
                                    : request.status === "rejected"
                                      ? "#fee2e2"
                                      : "#fef3c7",
                                color:
                                  request.status === "approved"
                                    ? "#166534"
                                    : request.status === "rejected"
                                      ? "#b91c1c"
                                      : "#b45309",
                              }}
                            >
                              {formatStatus(request.status)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}

        <SuccessModal
          isOpen={successModal.isOpen}
          onClose={() => setSuccessModal({ isOpen: false, message: "" })}
          message={successModal.message}
          autoClose
          autoCloseDelay={2500}
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
}
