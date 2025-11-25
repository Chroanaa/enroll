import { Program } from "../../../types";

export const filterPrograms = (
  programs: Program[],
  searchTerm: string,
  statusFilter: "all" | "active" | "inactive"
) => {
  return programs.filter((program) => {
    const matchesSearch =
      program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.departmentName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || program.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
};

