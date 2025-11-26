import { StatusColor } from "../../types";
import { getCountOfEnrolleesStatus } from "@/app/utils/getCountStatusEnrollees";
export const getStatusColor = (status: string): StatusColor => {
  switch (status) {
    case "new": // Enrolled
      return {
        bg: "#DBEAFE",
        text: "#1E40AF",
        border: "#93C5FD",
      };
    case "completed": // Completed
      return {
        bg: "#ECFDF5",
        text: "#047857",
        border: "#A7F3D0",
      };
    case "dropped": // Dropped
      return {
        bg: "#FEE2E2",
        text: "#991B1B",
        border: "#FCA5A5",
      };
    case "pending": // Pending
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

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case "new":
      return "New";
    case "completed":
      return "Completed";
    case "dropped":
      return "Dropped";
    case "pending":
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
