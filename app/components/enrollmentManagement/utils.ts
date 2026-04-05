import { StatusColor } from "../../types";
import { getCountOfEnrolleesStatus } from "@/app/utils/getCountStatusEnrollees";
import { parseProgramFilter } from "@/app/utils/programUtils";

export const ADMISSION_REQUIREMENTS = [
  "School Form 10 / Form 137A",
  "Transcript of Records",
  "Certificate of Good Moral Character",
  "School Form 9 / Form 138",
  "Honorable Dismissal",
  "Birth / Marriage Certificate",
] as const;

export const parseEnrollmentRequirements = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

export const getMissingEnrollmentRequirements = (requirements: unknown) => {
  const submitted = new Set(parseEnrollmentRequirements(requirements));
  return ADMISSION_REQUIREMENTS.filter((item) => !submitted.has(item));
};

export const ENROLLMENT_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: 1, label: "Enrolled" },
  { value: 2, label: "Reserved" },
  { value: 4, label: "Pending" },
  { value: 3, label: "Dropped" },
] as const;

export const normalizeEnrollmentStatus = (
  status: number | null | undefined,
): 1 | 2 | 3 | 4 => {
  if (status === null || status === undefined) {
    return 4;
  }

  if (status === 1 || status === 2 || status === 3 || status === 4) {
    return status;
  }

  return 4;
};

export const getStatusColor = (status: number | null | undefined): StatusColor => {
  // Treat null/undefined as pending (4)
  if (status === null || status === undefined) {
    return {
      bg: "#FEF3C7",
      text: "#92400E",
      border: "#FDE68A",
    };
  }
  
  switch (status) {
    case 1: // Enrolled
      return {
        bg: "#DBEAFE",
        text: "#1E40AF",
        border: "#93C5FD",
      };
    case 2: // Reserved
      return {
        bg: "#ECFDF5",
        text: "#047857",
        border: "#A7F3D0",
      };
    case 3: // Dropped
      return {
        bg: "#FEE2E2",
        text: "#991B1B",
        border: "#FCA5A5",
      };
    case 4: // Pending
      return {
        bg: "#FEF3C7",
        text: "#92400E",
        border: "#FDE68A",
      };
    default:
      return {
        bg: "#F3F4F6",
        text: "#374151",
        border: "#E5E7EB",
      };
  }
};

export const getStatusLabel = (status: number | null | undefined): string => {
  // Treat null/undefined as pending (4)
  if (status === null || status === undefined) {
    return "Pending";
  }
  
  switch (status) {
    case 1:
      return "Enrolled";
    case 2:
      return "Reserved";
    case 3:
      return "Dropped";
    case 4:
      return "Pending";
    default:
      return "Unknown";
  }
};

export const filterEnrollments = (
  enrollments: any[],
  searchTerm: string,
  statusFilter: "all" | 1 | 2 | 3 | 4,
  programMajorFilter: string
) => {
  const normalizedSearch = searchTerm.toLowerCase().trim();
  const compactSearch = normalizedSearch.replace(/[\s-]/g, "");
  const parsedFilter =
    programMajorFilter === "all"
      ? { programId: null, majorId: null }
      : parseProgramFilter(programMajorFilter);

  return enrollments.filter((enrollment) => {
    const studentName = `${enrollment.first_name || ""} ${
      enrollment.middle_name || ""
    } ${enrollment.family_name || ""}`.toLowerCase();
    const courseName = enrollment.course_program?.toLowerCase() || "";
    const studentNumber = String(enrollment.student_number || "").toLowerCase();
    const compactStudentNumber = studentNumber.replace(/[\s-]/g, "");

    const matchesSearch =
      studentName.includes(normalizedSearch) ||
      courseName.includes(normalizedSearch) ||
      studentNumber.includes(normalizedSearch) ||
      (compactSearch.length > 0 &&
        compactStudentNumber.includes(compactSearch));
    const matchesStatus =
      statusFilter === "all" ||
      normalizeEnrollmentStatus(enrollment.status) === statusFilter;
    const enrollmentProgramId =
      typeof enrollment.program_id === "number"
        ? enrollment.program_id
        : Number.parseInt(String(enrollment.program_id ?? ""), 10);
    const enrollmentMajorId =
      typeof enrollment.major_id === "number"
        ? enrollment.major_id
        : Number.parseInt(String(enrollment.major_id ?? ""), 10);
    const hasValidProgramId = Number.isFinite(enrollmentProgramId);
    const hasValidMajorId = Number.isFinite(enrollmentMajorId);

    const matchesProgramMajor =
      programMajorFilter === "all" ||
      (parsedFilter.programId !== null &&
        hasValidProgramId &&
        enrollmentProgramId === parsedFilter.programId &&
        (parsedFilter.majorId === null
          ? !hasValidMajorId
          : hasValidMajorId && enrollmentMajorId === parsedFilter.majorId));

    return matchesSearch && matchesStatus && matchesProgramMajor;
  });
};

export const calculateStats = (enrollments: any[]) => {
  return getCountOfEnrolleesStatus();
};
