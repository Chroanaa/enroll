import { Fee } from "../../../types";

export const filterFees = (
  fees: Fee[],
  searchTerm: string,
  statusFilter: "all" | "active" | "inactive",
  categoryFilter: string
) => {
  return fees.filter((fee) => {
    const matchesSearch =
      fee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.academic_year.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || fee.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || fee.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });
};

export const getCategoryColor = (category: string) => {
  switch (category) {
    case "tuition":
      return "bg-blue-100 text-blue-800";
    case "miscellaneous":
      return "bg-purple-100 text-purple-800";
    case "laboratory":
      return "bg-green-100 text-green-800";
    case "library":
      return "bg-yellow-100 text-yellow-800";
    case "other":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};



