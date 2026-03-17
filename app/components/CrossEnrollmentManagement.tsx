"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Search,
  User,
} from "lucide-react";
import { useSession } from "next-auth/react";
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
  hostProgramId: number;
  hostMajorId: number | null;
  hostProgramLabel: string;
  hostProgramCode: string;
  hostSelectionValue: string;
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

interface EnrolledSubjectReference {
  curriculumCourseId: number | null;
  subjectId: number | null;
  courseCode: string;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  border: `1px solid ${colors.neutralBorder}`,
  boxShadow: `0 10px 24px ${colors.neutralBorder}42`,
};

const secondaryCardStyle: React.CSSProperties = {
  backgroundColor: "white",
  border: `1px solid ${colors.neutralBorder}`,
  boxShadow: `0 8px 18px ${colors.neutralBorder}24`,
};

const sectionEyebrowStyle: React.CSSProperties = {
  color: colors.tertiary,
};

const fieldClassName =
  "w-full rounded-2xl border bg-white text-sm outline-none transition-all duration-200";

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
  const { data: session } = useSession();
  const { currentTerm, loading: termLoading } = useAcademicTerm();
  const { programs, loading: programsLoading } = useProgramsWithMajors();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [selectingStudentNumber, setSelectingStudentNumber] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [studentItemsPerPage, setStudentItemsPerPage] = useState(10);
  const [hostSelection, setHostSelection] = useState("");
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [enrolledSubjectsForTerm, setEnrolledSubjectsForTerm] = useState<
    EnrolledSubjectReference[]
  >([]);
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
  const currentUserRole = Number((session?.user as any)?.role) || 0;
  const isAdminUser = currentUserRole === 1;

  const semesterNum = currentTerm?.semester === "First" ? 1 : 2;

  useEffect(() => {
    const styleId = "cross-enrollee-request-queue-scrollbar";
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .request-queue-scroll {
        scrollbar-color: ${colors.primary} ${colors.neutralLight};
        scrollbar-width: thin;
      }
      .request-queue-scroll::-webkit-scrollbar {
        width: 10px;
      }
      .request-queue-scroll::-webkit-scrollbar-track {
        background: ${colors.neutralLight};
        border-radius: 999px;
      }
      .request-queue-scroll::-webkit-scrollbar-thumb {
        background: ${colors.primary};
        border: 2px solid ${colors.neutralLight};
        border-radius: 999px;
      }
      .request-queue-scroll::-webkit-scrollbar-thumb:hover {
        background: ${colors.secondary};
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
    setSelectingStudentNumber(studentNumber);
    setIsLoadingCourses(true);
    setIsLoadingRequests(true);

    try {
      const enrolledSubjectsUrl = currentTerm
        ? `/api/auth/enrolled-subjects?studentNumber=${encodeURIComponent(
            studentNumber,
          )}&academicYear=${encodeURIComponent(currentTerm.academicYear)}&semester=${semesterNum}`
        : null;

      const requests = [
        fetch(`/api/students/${encodeURIComponent(studentNumber)}`),
        fetch(
          `/api/auth/cross-enrollment?studentNumber=${encodeURIComponent(
            studentNumber,
          )}`,
        ),
      ] as Promise<Response>[];

      if (enrolledSubjectsUrl) {
        requests.push(fetch(enrolledSubjectsUrl));
      }

      const [studentResponse, requestsResponse, enrolledResponse] =
        await Promise.all(requests);

      const [studentResult, requestsResult, enrolledResult] = await Promise.all([
        studentResponse.json(),
        requestsResponse.json(),
        enrolledResponse ? enrolledResponse.json() : Promise.resolve({ data: [] }),
      ]);

      if (!studentResponse.ok) {
        throw new Error(studentResult.error || "Failed to load student details.");
      }

      if (!requestsResponse.ok) {
        throw new Error(
          requestsResult.error || "Failed to load cross-enrollee requests.",
        );
      }

      if (enrolledResponse && !enrolledResponse.ok) {
        throw new Error(
          enrolledResult.error || "Failed to load enrolled subjects.",
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
      setEnrolledSubjectsForTerm(
        Array.isArray(enrolledResult.data)
          ? enrolledResult.data.map((item: any) => ({
              curriculumCourseId: item.curriculum_course_id
                ? Number(item.curriculum_course_id)
                : null,
              subjectId: item.subject_id ? Number(item.subject_id) : null,
              courseCode: String(item.course_code || "").toLowerCase(),
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
      setSelectingStudentNumber("");
      setIsLoadingCourses(false);
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    const fetchHostCourses = async () => {
      if (!currentTerm || !selectedStudent) {
        setAvailableCourses([]);
        return;
      }

      const hostPrograms = programs.filter(
        (item) => item.programId !== selectedStudent.programId,
      );
      if (hostPrograms.length === 0) {
        setAvailableCourses([]);
        return;
      }

      setIsLoadingCourses(true);
      try {
        const settled = await Promise.allSettled(
          hostPrograms.map(async (hostProgram) => {
            let url = `/api/auth/curriculum/subjects?programId=${hostProgram.programId}&semester=${semesterNum}`;
            if (hostProgram.majorId) {
              url += `&majorId=${hostProgram.majorId}`;
            }

            const response = await fetch(url);
            const result = await response.json();

            if (!response.ok || !result.success) {
              throw new Error(
                result.error || `Failed to load subjects for ${hostProgram.label}.`,
              );
            }

            const hostProgramCode = String(hostProgram.label).split(" - ")[0] || "N/A";
            const hostSelectionValue = `${hostProgram.programId}-${hostProgram.majorId ?? "none"}`;

            return (Array.isArray(result.data?.courses) ? result.data.courses : []).map(
              (course: any) => ({
                ...course,
                hostProgramId: hostProgram.programId,
                hostMajorId: hostProgram.majorId ?? null,
                hostProgramLabel: hostProgram.label,
                hostProgramCode,
                hostSelectionValue,
              }),
            ) as AvailableCourse[];
          }),
        );

        const successfulResults = settled
          .filter((item): item is PromiseFulfilledResult<AvailableCourse[]> => item.status === "fulfilled")
          .flatMap((item) => item.value);

        if (successfulResults.length === 0) {
          throw new Error("Failed to load host program subjects.");
        }

        setAvailableCourses(successfulResults);
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
  }, [currentTerm, programs, selectedStudent, semesterNum]);

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

  const pendingCourseKeys = useMemo(() => {
    return new Set(
      pendingRequests.map(
        (item) =>
          `${String(item.courseCode || "").toLowerCase()}::${String(item.hostProgramCode || "").toLowerCase()}`,
      ),
    );
  }, [pendingRequests]);

  const enrolledCurriculumCourseIds = useMemo(() => {
    return new Set(
      enrolledSubjectsForTerm
        .map((item) => item.curriculumCourseId)
        .filter((id): id is number => Number.isFinite(id)),
    );
  }, [enrolledSubjectsForTerm]);

  const enrolledSubjectIds = useMemo(() => {
    return new Set(
      enrolledSubjectsForTerm
        .map((item) => item.subjectId)
        .filter((id): id is number => Number.isFinite(id)),
    );
  }, [enrolledSubjectsForTerm]);

  const enrolledCourseCodes = useMemo(() => {
    return new Set(
      enrolledSubjectsForTerm
        .map((item) => item.courseCode)
        .filter((code) => Boolean(code)),
    );
  }, [enrolledSubjectsForTerm]);

  const filteredCourses = useMemo(() => {
    const query = subjectSearch.trim().toLowerCase();

    return availableCourses.filter((course) => {
      if (enrolledCurriculumCourseIds.has(course.id)) {
        return false;
      }
      if (course.subject_id && enrolledSubjectIds.has(Number(course.subject_id))) {
        return false;
      }
      if (enrolledCourseCodes.has(course.course_code.toLowerCase())) {
        return false;
      }

      const isPendingInHost = pendingCourseKeys.has(
        `${course.course_code.toLowerCase()}::${course.hostProgramCode.toLowerCase()}`,
      );
      const isPendingByCodeOnly = pendingRequests.some(
        (item) =>
          String(item.courseCode || "").toLowerCase() ===
            course.course_code.toLowerCase() && !item.hostProgramCode,
      );
      if (isPendingInHost || isPendingByCodeOnly) {
        return false;
      }

      if (hostSelection && course.hostSelectionValue !== hostSelection) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        course.course_code.toLowerCase().includes(query) ||
        course.descriptive_title.toLowerCase().includes(query) ||
        course.hostProgramLabel.toLowerCase().includes(query)
      );
    });
  }, [
    availableCourses,
    enrolledCourseCodes,
    enrolledCurriculumCourseIds,
    enrolledSubjectIds,
    hostSelection,
    pendingCourseKeys,
    pendingRequests,
    subjectSearch,
  ]);

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
    if (!confirmationCourse || !selectedStudent || !currentTerm) {
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
          hostProgramId: confirmationCourse.hostProgramId,
          hostMajorId: confirmationCourse.hostMajorId,
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
    if (!confirmationCourse || !selectedStudent || !currentTerm) {
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
              <span className="font-semibold">{confirmationCourse.hostProgramLabel}</span>
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
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.paper }}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1
              className="text-[24px] font-semibold leading-tight"
              style={{ color: colors.primary }}
            >
              Cross Enrollee
            </h1>
            <p
              className="max-w-2xl text-sm leading-6"
              style={{ color: colors.tertiary }}
            >
              Submit approval requests for students who need to take a subject from a different program.
            </p>
          </div>

          <div
            className="inline-flex items-center gap-3 rounded-xl px-4 py-3"
            style={cardStyle}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${colors.secondary}12`, color: colors.secondary }}
            >
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: colors.neutral }}
              >
                Active Term
              </p>
              <p className="text-sm font-semibold" style={{ color: colors.primary }}>
                {currentTerm
                  ? `${currentTerm.semester} Semester, ${currentTerm.academicYear}`
                  : "Loading current term..."}
              </p>
            </div>
          </div>
        </header>

        {!selectedStudent ? (
          <section className="rounded-2xl p-6" style={cardStyle}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-[1.15rem] font-semibold" style={{ color: colors.primary }}>
                  Student Directory
                </h2>
                <p className={`${sectionDescriptionClassName} mt-1`} style={{ color: colors.tertiary }}>
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
                    borderColor: colors.neutralBorder,
                    backgroundColor: colors.paper,
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
                        <td className="px-4 py-4 text-[14px] leading-6" style={{ color: colors.primary }}>
                          {student.programCode || student.programName || "N/A"}
                        </td>
                        <td className="px-4 py-4 text-[14px]" style={{ color: colors.primary }}>
                          {student.yearLevel ? `Year ${student.yearLevel}` : "N/A"}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => loadStudentContext(student.studentNumber)}
                            disabled={Boolean(selectingStudentNumber)}
                            className={primaryButtonClassName}
                            style={{ backgroundColor: colors.secondary }}
                          >
                            {selectingStudentNumber === student.studentNumber ? (
                              <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Selecting...
                              </span>
                            ) : (
                              "Select Student"
                            )}
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
                setEnrolledSubjectsForTerm([]);
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

            <section className="rounded-2xl p-3.5" style={cardStyle}>
              <div className="grid gap-2.5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-stretch">
                <div
                  className="rounded-xl border px-3.5 py-2.5"
                  style={{
                    borderColor: colors.neutralBorder,
                    backgroundColor: colors.paper,
                  }}
                >
                  <p className={sectionLabelClassName} style={sectionEyebrowStyle}>
                    Student Name
                  </p>
                  <h2
                    className="mt-1 line-clamp-2 text-[1.08rem] font-semibold leading-[1.35]"
                    style={{ color: colors.primary }}
                  >
                    {selectedStudent.studentName}
                  </h2>
                  <p
                    className="mt-2 text-[13px] font-semibold"
                    style={{ color: colors.secondary }}
                  >
                    {selectedStudent.studentNumber}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[170px_minmax(0,1.45fr)_130px_minmax(0,1.2fr)]">
                  <div
                    className="rounded-xl border px-3.5 py-2.5"
                    style={{
                      borderColor: colors.neutralBorder,
                      backgroundColor: colors.paper,
                    }}
                  >
                    <p className={sectionLabelClassName} style={sectionEyebrowStyle}>
                      Student ID
                    </p>
                    <p className="mt-1 text-[14px] font-semibold" style={{ color: colors.primary }}>
                      {selectedStudent.studentNumber}
                    </p>
                  </div>
                  <div
                    className="rounded-xl border px-3.5 py-2.5"
                    style={{
                      borderColor: colors.neutralBorder,
                      backgroundColor: colors.paper,
                    }}
                  >
                    <p className={sectionLabelClassName} style={sectionEyebrowStyle}>
                      Program
                    </p>
                    <p className="mt-1 line-clamp-2 text-[13px] font-semibold leading-5" style={{ color: colors.primary }}>
                      {selectedStudent.programDisplay}
                    </p>
                  </div>
                  <div
                    className="rounded-xl border px-3.5 py-2.5"
                    style={{
                      borderColor: colors.neutralBorder,
                      backgroundColor: colors.paper,
                    }}
                  >
                    <p className={sectionLabelClassName} style={sectionEyebrowStyle}>
                      Year Level
                    </p>
                    <p className="mt-1 text-[14px] font-semibold" style={{ color: colors.primary }}>
                      {selectedStudent.yearLevel ? `Year ${selectedStudent.yearLevel}` : "N/A"}
                    </p>
                  </div>
                  <div
                    className="rounded-xl border px-3.5 py-2.5"
                    style={{
                      borderColor: colors.neutralBorder,
                      backgroundColor: colors.paper,
                    }}
                  >
                    <p className={sectionLabelClassName} style={sectionEyebrowStyle}>
                      Email
                    </p>
                    <p className="mt-1 truncate text-[13px] font-semibold" style={{ color: colors.primary }}>
                      {selectedStudent.email || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <section className="rounded-2xl p-4" style={cardStyle}>
                <div className="flex flex-col gap-1.5 border-b pb-3" style={{ borderColor: colors.neutralBorder }}>
                  <h2 className="text-[1.65rem] font-semibold tracking-tight" style={{ color: colors.primary }}>
                    Cross-Enrollee Request
                  </h2>
                  <p className="text-[12px] leading-5" style={{ color: colors.tertiary }}>
                    Follow the steps to request a subject from another program.
                  </p>
                </div>

                <div className="mt-3 space-y-3">
                  <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                    <div className="relative w-full lg:flex-1">
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
                        placeholder="Search subject code, title, or host program"
                        className={`${fieldClassName} py-3 pl-11 pr-4`}
                        style={{
                          borderColor: colors.neutralBorder,
                          backgroundColor: colors.paper,
                          color: colors.primary,
                        }}
                      />
                    </div>
                    <div className="w-full lg:w-[320px]">
                      <select
                        value={hostSelection}
                        onChange={(event) => {
                          setHostSelection(event.target.value);
                          setSubjectCurrentPage(1);
                        }}
                        className={`${fieldClassName} px-3 py-3`}
                        style={{
                          backgroundColor: colors.paper,
                          borderColor: colors.neutralBorder,
                          color: colors.primary,
                        }}
                      >
                        <option value="">All host programs</option>
                        {hostProgramOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
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
                            Host Program
                          </th>
                          <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: colors.neutral }}>
                            Year
                          </th>
                          <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: colors.neutral }}>
                            Units
                          </th>
                          <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: colors.neutral }}>
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingCourses || programsLoading ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: colors.tertiary }}>
                              Loading subjects...
                            </td>
                          </tr>
                        ) : paginatedCourses.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-0 py-0">
                              <EmptyStateCard
                                icon={BookOpen}
                                title="No subjects available yet"
                                description="No eligible subjects matched your current search and host-program filter."
                              />
                            </td>
                          </tr>
                        ) : (
                          paginatedCourses.map((course) => (
                            <tr
                              key={`${course.id}-${course.hostSelectionValue}`}
                              className="border-t align-middle transition-colors hover:bg-slate-50/70"
                              style={{ borderColor: colors.neutralBorder }}
                            >
                              <td className="px-4 py-3.5 text-sm font-semibold" style={{ color: colors.primary }}>
                                {course.course_code}
                              </td>
                              <td className="px-4 py-3.5 text-[14px] font-medium leading-6" style={{ color: colors.primary }}>
                                {course.descriptive_title}
                              </td>
                              <td className="px-4 py-3.5 text-[13px] font-medium leading-5" style={{ color: colors.primary }}>
                                {course.hostProgramLabel}
                              </td>
                              <td className="px-4 py-3.5 text-[14px]" style={{ color: colors.primary }}>
                                Year {course.year_level}
                              </td>
                              <td className="px-4 py-3.5 text-[14px] font-medium" style={{ color: colors.primary }}>
                                {course.units_total}
                              </td>
                              <td className="px-4 py-3.5 text-center">
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
                                  {isAdminUser ? "Add Subject" : "Request"}
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
              </section>

              <aside className="rounded-2xl border p-3.5" style={secondaryCardStyle}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={sectionLabelClassName}
                      style={sectionEyebrowStyle}
                    >
                      Request Queue
                    </p>
                    <h3 className="mt-1 text-[14px] font-semibold" style={{ color: colors.primary }}>
                      Pending Requests
                    </h3>
                    <p className="mt-1 text-[11px] leading-5" style={{ color: colors.tertiary }}>
                      Awaiting approval.
                    </p>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: `${colors.secondary}10`,
                      color: colors.secondary,
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
                  <div className="request-queue-scroll mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-2xl border px-4 py-3.5"
                        style={{
                          borderColor: colors.neutralBorder,
                          backgroundColor: colors.paper,
                          boxShadow: `0 8px 18px ${colors.neutralBorder}16`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold" style={{ color: colors.primary }}>
                              {request.courseCode}
                            </p>
                            <p className="mt-1 text-[13px] leading-5" style={{ color: colors.primary }}>
                              {request.descriptiveTitle}
                            </p>
                          </div>
                          <span
                            className="inline-flex min-h-[28px] items-center justify-center rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] leading-none"
                            style={{
                              backgroundColor: colors.secondary,
                              border: `1px solid ${colors.secondary}`,
                              color: colors.paper,
                            }}
                          >
                            {request.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: colors.tertiary }}>
                          Host Program
                        </p>
                        <p className="mt-1 text-[13px] font-medium leading-5" style={{ color: colors.primary }}>
                          {request.hostProgramCode || request.hostProgramName || "N/A"}
                        </p>
                        {request.reason ? (
                          <>
                            <p
                              className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em]"
                              style={{ color: colors.tertiary }}
                            >
                              Reason
                            </p>
                            <p className="mt-1 text-[12px] leading-5" style={{ color: colors.primary }}>
                              {request.reason}
                            </p>
                          </>
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
          title={
            isAdminUser
              ? "Add Cross-Enrollee Subject"
              : "Submit Cross-Enrollee Request"
          }
          description={
            isAdminUser
              ? "Review the details before adding this subject directly to enrolled subjects."
              : "Review the request details before submitting it for approval."
          }
          confirmText={
            submittingKey && confirmationCourse
              ? submittingKey === `course-${confirmationCourse.id}`
                ? "Submitting..."
                : isAdminUser
                  ? "Add Subject"
                  : "Submit Request"
              : isAdminUser
                ? "Add Subject"
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
