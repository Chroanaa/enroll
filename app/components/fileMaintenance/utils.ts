import { StatusColor } from "../../types";

// Shared status color function for active/inactive status
export const getStatusColor = (status: string): StatusColor => {
  switch (status) {
    case "active":
      return {
        bg: "#ECFDF5",
        text: "#047857",
        border: "#A7F3D0",
      };
    case "inactive":
      return {
        bg: "#F3F4F6",
        text: "#374151",
        border: "#E5E7EB",
      };
    default:
      return {
        bg: "#F3F4F6",
        text: "#374151",
        border: "#E5E7EB",
      };
  }
};



