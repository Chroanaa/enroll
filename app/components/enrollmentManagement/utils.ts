import { StatusColor } from "../../types";
import { getCountOfEnrolleesStatus } from "@/app/utils/getCountStatusEnrollees";

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
  courseFilter: string
) => {
  return enrollments.filter((enrollment) => {
    const studentName = `${enrollment.first_name || ""} ${
      enrollment.middle_name || ""
    } ${enrollment.family_name || ""}`.toLowerCase();
    const courseName = enrollment.course_program?.toLowerCase() || "";
    const matchesSearch =
      studentName.includes(searchTerm.toLowerCase()) ||
      courseName.includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || enrollment.status === statusFilter;
    const matchesCourse =
      courseFilter === "all" || enrollment.course_program === courseFilter;
    return matchesSearch && matchesStatus && matchesCourse;
  });
};

export const calculateStats = (enrollments: any[]) => {
  return getCountOfEnrolleesStatus();
};
