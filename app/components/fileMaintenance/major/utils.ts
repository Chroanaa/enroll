import { Major } from "../../../types";

export const filterMajors = (
  majors: Major[],
  searchTerm: string,
  statusFilter: "all" | "active" | "inactive"
) => {
  return majors.filter((major) => {
    const matchesSearch =
      major.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      major.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      major.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      major.programName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || major.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
};

