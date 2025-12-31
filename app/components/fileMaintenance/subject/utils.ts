import { Subject } from "../../../types";

export const filterSubjects = (
  subjects: Subject[],
  searchTerm: string,
  statusFilter: "all" | "active" | "inactive"
) => {
  return subjects.filter((subject) => {
    const matchesSearch =
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || subject.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
};


