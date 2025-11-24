import { Section } from "../../../types";

export const filterSections = (
  sections: (Section & { courseName?: string })[],
  searchTerm: string,
  statusFilter: "all" | "active" | "inactive"
) => {
  return sections.filter((section) => {
    const matchesSearch =
      section.section_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.advisor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.courseName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const statusString = typeof section.status === "string" 
      ? section.status 
      : (section.status === 1 ? "active" : "inactive");
    const matchesStatus =
      statusFilter === "all" || statusString === statusFilter;
    return matchesSearch && matchesStatus;
  });
};


