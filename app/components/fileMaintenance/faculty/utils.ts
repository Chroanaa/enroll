import { Faculty } from "../../../types";

export const filterFaculty = (
  faculty: Faculty[],
  searchTerm: string,
  statusFilter: "all" | "active" | "inactive",
  positionFilter: string
) => {
  return faculty.filter((fac) => {
    const matchesSearch =
      fac.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.degree?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.mother_unit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.employment_status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.departmentName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || fac.status === statusFilter;
    const matchesPosition =
      positionFilter === "all" || fac.position === positionFilter;
    return matchesSearch && matchesStatus && matchesPosition;
  });
};

export const getPositionColor = (position: string) => {
  switch (position) {
    case "professor":
      return "bg-purple-100 text-purple-800";
    case "associate professor":
      return "bg-blue-100 text-blue-800";
    case "assistant professor":
      return "bg-green-100 text-green-800";
    case "instructor":
      return "bg-yellow-100 text-yellow-800";
    case "lecturer":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};



