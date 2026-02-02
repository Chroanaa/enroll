export interface Discount {
  id: number;
  code: string;
  name: string;
  percentage: number;
  semester: string;
  status: string;
  created_at?: string;
}

export const filterDiscounts = (
  discounts: Discount[],
  searchTerm: string,
  statusFilter: "all" | "active" | "inactive",
  semesterFilter: string
) => {
  return discounts.filter((discount) => {
    const matchesSearch =
      discount.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discount.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || discount.status === statusFilter;
    const matchesSemester =
      semesterFilter === "all" || discount.semester === semesterFilter;
    return matchesSearch && matchesStatus && matchesSemester;
  });
};

export const formatPercentage = (percentage: number) => {
  return `${percentage}%`;
};

