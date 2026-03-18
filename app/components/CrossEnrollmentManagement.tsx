"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  GraduationCap,
  Search,
  Send,
  User,
} from "lucide-react";
import { colors } from "../colors";
import { useAcademicTerm } from "../hooks/useAcademicTerm";
import { useProgramsWithMajors } from "../hooks/useProgramsWithMajors";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";
import ConfirmationModal from "./common/ConfirmationModal";
import Pagination from "./common/Pagination";

interface StudentListItem {
  studentNumber: string;
  name: string;
  programId: number;
  programCode: string;
  programName: string;
  majorId?: number | null;
  yearLevel: number | null;
  email: string;
}

interface StudentDetails {
  studentNumber: string;
  studentName: string;
  email: string;
  yearLevel: number | null;
  programId: number | null;
  programDisplay: string;
  majorId: number | null;
}

interface AvailableCourse {
  id: number;
  subject_id?: number | null;
  course_code: string;
  descriptive_title: string;
  units_total: number;
  year_level: number;
  semester: number;
}

interface PendingRequest {
  id: number;
  courseCode: string;
  descriptiveTitle: string;
  hostProgramCode: string | null;
  hostProgramName: string | null;
  reason: string | null;
  status: string;
}

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

const sectionEyebrowStyle: React.CSSProperties = {
  color: colors.neutral,
};

const stepLabelStyle: React.CSSProperties = {
  color: colors.secondary,
};

const fieldClassName =
  "w-full rounded-2xl border bg-white text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#955A27] focus:ring-4 focus:ring-[#955A27]/10";

const primaryButtonClassName =
  "rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";

const sectionLabelClassName = "text-[11px] font-semibold uppercase tracking-[0.2em]";

const sectionDescriptionClassName = "text-[12px] leading-5";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
}

function EmptyStateCard({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center sm:px-10">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: `${colors.secondary}10`,
          color: colors.secondary,
        }}
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

export default function CrossEnrollmentManagement() {
  const { currentTerm, loading: termLoading } = useAcademicTerm();
  const { programs, loading: programsLoading } = useProgramsWithMajors();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [studentItemsPerPage, setStudentItemsPerPage] = useState(10);
  const [hostSelection, setHostSelection] = useState("");
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectCurrentPage, setSubjectCurrentPage] = useState(1);
  const [subjectItemsPerPage, setSubjectItemsPerPage] = useState(6);
  const [requestReason, setRequestReason] = useState("");
  const [submittingKey, setSubmittingKey] = useState("");
  const [confirmationCourse, setConfirmationCourse] = useState<AvailableCourse | null>(null);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: "" });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
    details: "",
  });

  const semesterNum = currentTerm?.semester === "First" ? 1 : 2;

  useEffect(() => {
    const styleId = "cross-enrollee-request-queue-scrollbar";
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .request-queue-scroll::-webkit-scrollbar {
        width: 10px;
      }
      .request-queue-scroll::-webkit-scrollbar-track {
        background: ${colors.paper};
        border-radius: 999px;
      }
      .request-queue-scroll::-webkit-scrollbar-thumb {
        background: linear-gradient(${colors.accent}, ${colors.secondary});
        border: 2px solid ${colors.paper};
        border-radius: 999px;
      }
      .request-queue-scroll::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(${colors.secondary}, ${colors.primary});
      }
    `;

    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!currentTerm) {
        return;
      }

      setIsLoadingStudents(true);
      try {
        const response = await fetch(
          `/api/auth/students/search?listAll=true&limit=100&academicYear=${encodeURIComponent(
            currentTerm.academicYear,
          )}&semester=${currentTerm.semesterCode}`,
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load students.");
        }

        setStudents(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        setStudents([]);
        setErrorModal({
          isOpen: true,
          message:
            error instanceof Error ? error.message : "Failed to load students.",
          details: "",
        });
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [currentTerm]);

  const loadStudentContext = async (studentNumber: string) => {
    setIsLoadingCourses(true);
    setIsLoadingRequests(true);

    try {
      const [studentResponse, requestsResponse] = await Promise.all([
        fetch(`/api/students/${encodeURIComponent(studentNumber)}`),
        fetch(
          `/api/auth/cross-enrollment?studentNumber=${encodeURIComponent(
            studentNumber,
          )}`,
        ),
      ]);
      const [studentResult, requestsResult] = await Promise.all([
        studentResponse.json(),
        requestsResponse.json(),
      ]);

      if (!studentResponse.ok) {
        throw new Error(studentResult.error || "Failed to load student details.");
      }

      if (!requestsResponse.ok) {
        throw new Error(
          requestsResult.error || "Failed to load cross-enrollee requests.",
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
        email: studentResult.email_address || "",
        yearLevel: studentResult.year_level ?? null,
        programId: studentResult.program?.id ?? null,
        programDisplay:
          studentResult.program?.code && studentResult.program?.name
            ? `${studentResult.program.code} - ${studentResult.program.name}`
            : studentResult.course_program || "N/A",
        majorId: studentResult.major?.id ?? null,
      });

      setPendingRequests(
        Array.isArray(requestsResult.data)
          ? requestsResult.data.map((item: any) => ({
              id: item.id,
              courseCode: item.courseCode,
              descriptiveTitle: item.descriptiveTitle,
              hostProgramCode: item.hostProgramCode,
              hostProgramName: item.hostProgramName,
              reason: item.reason,
              status: item.status,
            }))
          : [],
      );
      setHostSelection("");
      setAvailableCourses([]);
      setSubjectSearch("");
      setRequestReason("");
      setSubjectCurrentPage(1);
    } catch (error) {
      setErrorModal({
        isOpen: true,
        message:
          error instanceof Error ? error.message : "Failed to load student data.",
        details: "",
      });
    } finally {
      setIsLoadingCourses(false);
      setIsLoadingRequests(false);
    }
  };

  const selectedHostProgram = useMemo(() => {
    return programs.find((item) => item.value === hostSelection) || null;
  }, [hostSelection, programs]);

  useEffect(() => {
    const fetchHostCourses = async () => {
      if (!selectedHostProgram || !currentTerm || !selectedStudent) {
        setAvailableCourses([]);
        return;
      }

      setIsLoadingCourses(true);
      try {
        let url = `/api/auth/curriculum/subjects?programId=${selectedHostProgram.programId}&semester=${semesterNum}`;
        if (selectedHostProgram.majorId) {
          url += `&majorId=${selectedHostProgram.majorId}`;
        }

        const response = await fetch(url);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load host program subjects.");
        }

        setAvailableCourses(
          Array.isArray(result.data?.courses) ? result.data.courses : [],
        );
      } catch (error) {
        setAvailableCourses([]);
        setErrorModal({
          isOpen: true,
          message:
            error instanceof Error
              ? error.message
              : "Failed to load host program subjects.",
          details: "",
        });
      } finally {
        setIsLoadingCourses(false);
      }
    };

    fetchHostCourses();
  }, [currentTerm, selectedHostProgram, selectedStudent, semesterNum]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter((student) => {
      return (
        student.studentNumber.toLowerCase().includes(query) ||
        student.name.toLowerCase().includes(query) ||
        student.programCode.toLowerCase().includes(query)
      );
    });
  }, [studentSearch, students]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (studentCurrentPage - 1) * studentItemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + studentItemsPerPage);
  }, [filteredStudents, studentCurrentPage, studentItemsPerPage]);

  const pendingCourseCodes = useMemo(() => {
    return new Set(pendingRequests.map((item) => item.courseCode));
  }, [pendingRequests]);

  const filteredCourses = useMemo(() => {
    const query = subjectSearch.trim().toLowerCase();

    return availableCourses.filter((course) => {
      if (pendingCourseCodes.has(course.course_code)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        course.course_code.toLowerCase().includes(query) ||
        course.descriptive_title.toLowerCase().includes(query)
      );
    });
  }, [availableCourses, pendingCourseCodes, subjectSearch]);

  const paginatedCourses = useMemo(() => {
    const startIndex = (subjectCurrentPage - 1) * subjectItemsPerPage;
    return filteredCourses.slice(startIndex, startIndex + subjectItemsPerPage);
  }, [filteredCourses, subjectCurrentPage, subjectItemsPerPage]);

  const totalStudentPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / studentItemsPerPage),
  );
  const totalSubjectPages = Math.max(
    1,
    Math.ceil(filteredCourses.length / subjectItemsPerPage),
  );

  const hostProgramOptions = useMemo(() => {
    if (!selectedStudent) {
      return [];
    }

    return programs.filter((item) => item.programId !== selectedStudent.programId);
  }, [programs, selectedStudent]);

  const submitCrossEnrollmentRequest = async () => {
    if (!confirmationCourse || !selectedStudent || !currentTerm || !selectedHostProgram) {
      return;
    }

    if (!requestReason.trim()) {
      setErrorModal({
        isOpen: true,
        message: "A reason is required before submitting a cross-enrollee request.",
        details: "",
      });
      return;
    }

    const requestKey = `course-${confirmationCourse.id}`;
    setSubmittingKey(requestKey);

    try {
      const response = await fetch("/api/auth/cross-enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber: selectedStudent.studentNumber,
          hostProgramId: selectedHostProgram.programId,
          hostMajorId: selectedHostProgram.majorId,
          curriculumCourseId: confirmationCourse.id,
          academicYear: currentTerm.academicYear,
          semester: semesterNum,
          reason: requestReason.trim(),
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to submit cross-enrollee request.");
      }

      setSuccessModal({
        isOpen: true,
        message: result.message || "Cross-enrollee request submitted successfully.",
      });
      setConfirmationCourse(null);
      setRequestReason("");
      await loadStudentContext(selectedStudent.studentNumber);
    } catch (error) {
      setErrorModal({
        isOpen: true,
        message:
          error instanceof Error
            ? error.message
            : "Failed to submit cross-enrollee request.",
        details: "",
      });
    } finally {
      setSubmittingKey("");
    }
  };

  const renderConfirmationContent = () => {
    if (!confirmationCourse || !selectedStudent || !selectedHostProgram || !currentTerm) {
      return null;
    }

    return (
      <div className="space-y-4 text-sm" style={{ color: colors.primary }}>
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: colors.neutralBorder,
            backgroundColor: colors.paper,
          }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: colors.tertiary }}
          >
            Request Summary
          </p>
          <div className="mt-3 space-y-2">
            <p>
              <span style={{ color: colors.tertiary }}>Student:</span>{" "}
              <span className="font-semibold">{selectedStudent.studentName}</span>
            </p>
            <p>
              <span style={{ color: colors.tertiary }}>Student ID:</span>{" "}
              <span className="font-semibold">{selectedStudent.studentNumber}</span>
            </p>
            <p>
              <span style={{ color: colors.tertiary }}>Host Program:</span>{" "}
              <span className="font-semibold">{selectedHostProgram.label}</span>
            </p>
            <p>
              <span style={{ color: colors.tertiary }}>Subject:</span>{" "}
              <span className="font-semibold">
                {confirmationCourse.course_code} - {confirmationCourse.descriptive_title}
              </span>
            </p>
            <p>
              <span style={{ color: colors.tertiary }}>Term:</span>{" "}
              <span className="font-semibold">
                {currentTerm.semester} Semester, {currentTerm.academicYear}
              </span>
            </p>
          </div>
        </div>

        <div>
          <label
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: colors.tertiary }}
          >
            Reason
          </label>
          <textarea
            value={requestReason}
            onChange={(event) => setRequestReason(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-xl px-3 py-3 text-sm outline-none transition"
            style={{
              border: `1px solid ${colors.neutralBorder}`,
              backgroundColor: "white",
              color: colors.primary,
            }}
            placeholder="Explain why this subject should be taken from another program."
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen px-6 pb-6 pt-4" style={{ backgroundColor: colors.paper }}>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h1
              className="text-[2.35rem] font-bold tracking-[-0.03em]"
              style={{ color: colors.primary }}
            >
              Cross Enrollee
            </h1>
            <p className="mt-1 text-[12px] leading-6" style={{ color: colors.neutral }}>
              Submit approval requests for students who need to take a subject from a different program.
            </p>
          </div>

          <div
            className="inline-flex items-center gap-3 rounded-2xl px-5 py-4"
            style={cardStyle}
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${colors.secondary}12`, color: colors.secondary }}
            >
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p
                className={sectionLabelClassName}
                style={sectionEyebrowStyle}
              >
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
                <p className={`${sectionDescriptionClassName} mt-1`} style={{ color: colors.neutral }}>
                  Select the student who needs a cross-enrollee subject request.
                </p>
              </div>

              <div className="relative w-full max-w-md">
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
                  style={{
                    color: colors.primary,
                  }}
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
                      <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: colors.tertiary }}>
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
                        key={student.studentNumber}
                        className="border-t transition-colors hover:bg-slate-50/70"
                        style={{ borderColor: colors.neutralBorder }}
                      >
                        <td className="px-4 py-4 text-sm font-semibold" style={{ color: colors.primary }}>
                          {student.studentNumber}
                        </td>
                        <td className="px-4 py-4 text-[14px] leading-6" style={{ color: colors.primary }}>
                          {student.name}
                        </td>
                        <td className="px-4 py-4 text-[14px] leading-6" style={{ color: colors.neutralDark }}>
                          {student.programCode || student.programName || "N/A"}
                        </td>
                        <td className="px-4 py-4 text-[14px]" style={{ color: colors.neutralDark }}>
                          {student.yearLevel ? `Year ${student.yearLevel}` : "N/A"}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => loadStudentContext(student.studentNumber)}
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
                setPendingRequests([]);
                setAvailableCourses([]);
                setHostSelection("");
                setRequestReason("");
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all"
              style={{
                ...cardStyle,
                color: colors.primary,
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Student List
            </button>

            <section className="rounded-2xl px-5 py-4" style={cardStyle}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 xl:max-w-[280px]">
                  <p
                    className={sectionLabelClassName}
                    style={sectionEyebrowStyle}
                  >
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

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
              <section className="rounded-2xl p-5" style={cardStyle}>
                <div className="flex flex-col gap-2 border-b pb-5" style={{ borderColor: colors.neutralBorder }}>
                  <p
                    className={sectionLabelClassName}
                    style={{ color: colors.neutral }}
                  >
                    Guided Request Flow
                  </p>
                  <h2 className="text-[1.65rem] font-semibold tracking-tight" style={{ color: colors.primary }}>
                    Cross-Enrollee Request
                  </h2>
                  <p className={sectionDescriptionClassName} style={{ color: colors.neutral }}>
                    Follow the steps to request a subject from another program.
                  </p>
                </div>

                <div className="mt-6 space-y-5">
                  <div
                    className="grid gap-4 rounded-2xl border p-4 lg:grid-cols-[132px_minmax(0,1fr)] lg:items-start"
                    style={{
                      borderColor: !hostSelection ? `${colors.secondary}50` : colors.neutralBorder,
                      backgroundColor: !hostSelection ? `${colors.secondary}05` : "white",
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
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em]" style={stepLabelStyle}>
                        Step 1
                      </p>
                      <p className="mt-1 text-[13px] font-semibold" style={{ color: colors.primary }}>
                        Select host program
                      </p>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-[12px] leading-5" style={{ color: colors.neutral }}>
                        <Building2 className="h-4 w-4" />
                        <span>Choose the program where the student will take the subject.</span>
                      </div>
                      <select
                        value={hostSelection}
                        onChange={(event) => {
                          setHostSelection(event.target.value);
                          setSubjectCurrentPage(1);
                        }}
                        className={`${fieldClassName} px-3 py-3`}
                        style={{
                          backgroundColor: hostSelection ? "white" : `${colors.paper}`,
                          borderColor: hostSelection ? colors.neutralBorder : `${colors.secondary}50`,
                          color: colors.primary,
                        }}
                      >
                        <option value="">Select a host program</option>
                        {hostProgramOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div
                    className="grid gap-4 rounded-2xl border p-4 lg:grid-cols-[132px_minmax(0,1fr)] lg:items-start"
                    style={{
                      borderColor: hostSelection ? `${colors.secondary}40` : colors.neutralBorder,
                      backgroundColor: hostSelection ? `${colors.secondary}04` : "white",
                    }}
                  >
                    <div>
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                        style={{
                          backgroundColor: hostSelection
                            ? `${colors.secondary}16`
                            : `${colors.neutralBorder}`,
                          color: hostSelection ? colors.secondary : colors.neutral,
                        }}
                      >
                        2
                      </div>
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em]" style={stepLabelStyle}>
                        Step 2
                      </p>
                      <p className="mt-1 text-[13px] font-semibold" style={{ color: colors.primary }}>
                        Review subjects
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[12px] leading-5" style={{ color: colors.neutral }}>
                        <GraduationCap className="h-4 w-4" />
                        <span>Pick a subject to submit for approval.</span>
                      </div>
                      <div className="relative w-full max-w-md">
                        <Search
                          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
                          style={{ color: colors.tertiary }}
                        />
                        <input
                          value={subjectSearch}
                          onChange={(event) => {
                            setSubjectSearch(event.target.value);
                            setSubjectCurrentPage(1);
                          }}
                          placeholder="Search subject code or title"
                          className={`${fieldClassName} py-3 pl-11 pr-4`}
                          style={{
                            color: colors.primary,
                          }}
                        />
                      </div>

                      <div
                        className="overflow-x-auto rounded-2xl border"
                        style={{ borderColor: colors.neutralBorder }}
                      >
                        <table className="min-w-full border-collapse">
                          <thead>
                            <tr style={{ backgroundColor: `${colors.accent}08` }}>
                              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: colors.neutral }}>
                                Code
                              </th>
                              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: colors.neutral }}>
                                Subject
                              </th>
                              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: colors.neutral }}>
                                Year
                              </th>
                              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: colors.neutral }}>
                                Units
                              </th>
                              <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: colors.neutral }}>
                                Step 3
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {!hostSelection ? (
                              <tr>
                                <td colSpan={5} className="px-0 py-0">
                                  <EmptyStateCard
                                    icon={Building2}
                                    title="Choose a host program first"
                                    description="Once a host program is selected, available subjects for the current term will appear here."
                                  />
                                </td>
                              </tr>
                            ) : isLoadingCourses || programsLoading ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: colors.tertiary }}>
                                  Loading subjects...
                                </td>
                              </tr>
                            ) : paginatedCourses.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-0 py-0">
                                  <EmptyStateCard
                                    icon={BookOpen}
                                    title="No subjects available yet"
                                    description="This host program has no eligible subjects for the selected term, or matching requests are already pending."
                                  />
                                </td>
                              </tr>
                            ) : (
                              paginatedCourses.map((course) => (
                                <tr
                                  key={course.id}
                                  className="border-t align-middle transition-colors hover:bg-slate-50/70"
                                  style={{ borderColor: colors.neutralBorder }}
                                >
                                  <td className="px-4 py-4 text-sm font-semibold" style={{ color: colors.primary }}>
                                    {course.course_code}
                                  </td>
                                  <td className="px-4 py-4 text-[14px] font-medium leading-6" style={{ color: colors.primary }}>
                                    {course.descriptive_title}
                                  </td>
                                  <td className="px-4 py-4 text-[14px]" style={{ color: colors.neutralDark }}>
                                    Year {course.year_level}
                                  </td>
                                  <td className="px-4 py-4 text-[14px] font-medium" style={{ color: colors.neutralDark }}>
                                    {course.units_total}
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmationCourse(course);
                                        setRequestReason("");
                                      }}
                                      className={primaryButtonClassName}
                                      style={{
                                        backgroundColor: colors.secondary,
                                        boxShadow: `0 10px 20px ${colors.secondary}20`,
                                      }}
                                    >
                                      <span className="inline-flex items-center gap-2">
                                        <Send className="h-4 w-4" />
                                        Request
                                      </span>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <Pagination
                        currentPage={subjectCurrentPage}
                        totalPages={totalSubjectPages}
                        totalItems={filteredCourses.length}
                        itemsPerPage={subjectItemsPerPage}
                        onPageChange={setSubjectCurrentPage}
                        onItemsPerPageChange={(value) => {
                          setSubjectItemsPerPage(value);
                          setSubjectCurrentPage(1);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <aside
                className="rounded-2xl border p-4"
                style={secondaryCardStyle}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={sectionLabelClassName}
                      style={{ color: colors.neutral }}
                    >
                      Request Queue
                    </p>
                    <h3 className="mt-1 text-[14px] font-semibold" style={{ color: colors.neutralDark }}>
                      Pending Requests
                    </h3>
                    <p className="mt-1 text-[11px] leading-5" style={{ color: colors.neutral }}>
                      Awaiting approval.
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
                    description="Submitted cross-enrollee requests for this student will appear here while awaiting approval."
                  />
                ) : (
                  <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
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
                              {request.courseCode}
                            </p>
                            <p className="mt-1 text-[13px] leading-5" style={{ color: colors.primary }}>
                              {request.descriptiveTitle}
                            </p>
                          </div>
                          <span
                            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                            style={{
                              backgroundColor: `${colors.warning}12`,
                              color: colors.warning,
                            }}
                          >
                            {request.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: colors.neutral }}>
                          Host Program
                        </p>
                        <p className="mt-1 text-xs leading-5" style={{ color: colors.neutralDark }}>
                          {request.hostProgramCode || request.hostProgramName || "N/A"}
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
              </aside>
            </div>
          </>
        )}

        <ConfirmationModal
          isOpen={Boolean(confirmationCourse)}
          onClose={() => {
            setConfirmationCourse(null);
            setRequestReason("");
          }}
          onConfirm={submitCrossEnrollmentRequest}
          title="Submit Cross-Enrollee Request"
          description="Review the request details before submitting it for approval."
          confirmText={
            submittingKey && confirmationCourse
              ? submittingKey === `course-${confirmationCourse.id}`
                ? "Submitting..."
                : "Submit Request"
              : "Submit Request"
          }
          cancelText="Cancel"
          variant="info"
          isLoading={Boolean(confirmationCourse) && Boolean(submittingKey)}
          customContent={renderConfirmationContent()}
        />

        <SuccessModal
          isOpen={successModal.isOpen}
          onClose={() => setSuccessModal({ isOpen: false, message: "" })}
          message={successModal.message}
          autoClose={true}
          autoCloseDelay={2500}
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
}
