import { getStatusColor } from "../utils";

export { getStatusColor };

export const filterBuildings = (
  buildings: any[],
  searchTerm: string,
  statusFilter: "all" | "active" | "inactive"
) => {
  return buildings.filter((building) => {
    const matchesSearch =
      building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || building.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
};

