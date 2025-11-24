import { Room } from "../../../types";
import { StatusColor } from "../../../types";

export const filterRooms = (
  rooms: Room[],
  searchTerm: string,
  statusFilter: "all" | "available" | "occupied" | "maintenance",
  typeFilter: string
) => {
  return rooms.filter((room) => {
    const matchesSearch = room.room_number
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || room.status === statusFilter;
    const matchesType = typeFilter === "all" || room.room_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
};

export const getRoomStatusColor = (status: string): StatusColor => {
  switch (status) {
    case "available":
      return {
        bg: "#ECFDF5",
        text: "#047857",
        border: "#A7F3D0",
      };
    case "occupied":
      return {
        bg: "#DBEAFE",
        text: "#1E40AF",
        border: "#93C5FD",
      };
    case "maintenance":
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

export const getTypeColor = (type: string) => {
  switch (type) {
    case "classroom":
      return "bg-blue-100 text-blue-800";
    case "laboratory":
      return "bg-purple-100 text-purple-800";
    case "office":
      return "bg-gray-100 text-gray-800";
    case "library":
      return "bg-green-100 text-green-800";
    case "auditorium":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};



