"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Room, Building } from "../../../types";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SuccessModal from "../../common/SuccessModal";
import ErrorModal from "../../common/ErrorModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import RoomTable from "./RoomTable";
import RoomForm from "./RoomForm";
import { filterRooms } from "./utils";
import { getRooms } from "@/app/utils/roomUtils";
import { getBuildings } from "@/app/utils/getBuildings";
import { insertIntoReports } from "@/app/utils/reportsUtils";
import { useSession } from "next-auth/react";
import { invalidateRelatedCaches } from "@/app/utils/cache";
const RoomManagement: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  React.useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [roomsData, buildingsData] = await Promise.all([
          getRooms(),
          getBuildings(),
        ]);
        const buildingsArray: Building[] = Array.isArray(buildingsData)
          ? buildingsData
          : Object.values(buildingsData);
        setBuildings(buildingsArray);
        const roomsArray: Room[] = Array.isArray(roomsData)
          ? roomsData
          : Object.values(roomsData);
        setRooms(
          roomsArray.map((room) => ({
            ...room,
            buildingName:
              buildingsArray.find((b) => b.id === room.building_id)?.name || "",
          })),
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "available" | "occupied" | "maintenance"
  >("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    roomId: number | null;
    roomNumber: string;
  }>({
    isOpen: false,
    roomId: null,
    roomNumber: "",
  });
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: "",
  });
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    details?: string;
  }>({
    isOpen: false,
    message: "",
    details: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredRooms = useMemo(
    () => filterRooms(rooms, searchTerm, statusFilter, typeFilter),
    [rooms, searchTerm, statusFilter, typeFilter],
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRooms = filteredRooms.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveRoom = async (roomData: Room) => {
    try {
      if (editingRoom) {
        const response = await fetch("/api/auth/room", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(roomData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update room");
        }

        const buildingName =
          buildings.find((b) => b.id === roomData.building_id)?.name || "";
        setRooms((prev) =>
          prev.map((r) =>
            r.id === roomData.id ? { ...roomData, buildingName } : r,
          ),
        );
        invalidateRelatedCaches("ROOMS");
        setEditingRoom(null);
        setSuccessModal({
          isOpen: true,
          message: `Room "${roomData.room_number}" has been updated successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Edited the Room ${roomData.room_number}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      } else {
        const response = await fetch("/api/auth/room", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(roomData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create room");
        }

        const newRoom = await response.json();
        const buildingName =
          buildings.find((b) => b.id === roomData.building_id)?.name || "";
        setRooms((prev) => [
          ...prev,
          { ...roomData, id: newRoom.id, buildingName },
        ]);
        invalidateRelatedCaches("ROOMS");
        setIsAddModalOpen(false);
        setSuccessModal({
          isOpen: true,
          message: `Room "${roomData.room_number}" has been created successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Created the Room ${roomData.room_number}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      }
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || "An error occurred while saving the room.",
        details: "Please check your input and try again.",
      });
    }
  };

  const handleDeleteRoom = (id: number) => {
    const room = rooms.find((r) => r.id === id);
    if (room) {
      setDeleteConfirmation({
        isOpen: true,
        roomId: id,
        roomNumber: room.room_number,
      });
    }
  };

  const confirmDeleteRoom = async () => {
    if (deleteConfirmation.roomId) {
      try {
        const response = await fetch("/api/auth/room", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deleteConfirmation.roomId),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete room");
        }

        setRooms((prev) =>
          prev.filter((r) => r.id !== deleteConfirmation.roomId),
        );
        invalidateRelatedCaches("ROOMS");
        setDeleteConfirmation({
          isOpen: false,
          roomId: null,
          roomNumber: "",
        });
        setSuccessModal({
          isOpen: true,
          message: `Room "${deleteConfirmation.roomNumber}" has been deleted successfully.`,
        });
        insertIntoReports({
          action: `This Subject: ${deleteConfirmation.roomNumber} Was deleted By ${session?.user.name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      } catch (error: any) {
        setErrorModal({
          isOpen: true,
          message:
            error.message || "An error occurred while deleting the room.",
          details: "Please try again.",
        });
        setDeleteConfirmation({
          isOpen: false,
          roomId: null,
          roomNumber: "",
        });
      }
    }
  };

  return (
    <div
      className='min-h-screen p-6 font-sans'
      style={{ backgroundColor: colors.paper }}
    >
      <div className='max-w-7xl mx-auto w-full space-y-6'>
        {/* Header */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <h1
              className='text-3xl font-bold tracking-tight'
              style={{ color: colors.primary }}
            >
              Room Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage rooms and their availability
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Room</span>
          </button>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder='Search rooms...'
          filters={[
            {
              value: typeFilter,
              onChange: (value) => setTypeFilter(value as string),
              options: [
                { value: "all", label: "All Types" },
                { value: "classroom", label: "Classroom" },
                { value: "laboratory", label: "Laboratory" },
                { value: "office", label: "Office" },
                { value: "library", label: "Library" },
                { value: "auditorium", label: "Auditorium" },
                { value: "other", label: "Other" },
              ],
              placeholder: "All Types",
            },
            {
              value: statusFilter,
              onChange: (value) =>
                setStatusFilter(
                  value === "all"
                    ? "all"
                    : (value as "available" | "occupied" | "maintenance"),
                ),
              options: [
                { value: "all", label: "All Status" },
                { value: "available", label: "Available" },
                { value: "occupied", label: "Occupied" },
                { value: "maintenance", label: "Maintenance" },
              ],
              placeholder: "All Status",
            },
          ]}
        />

        {/* Rooms Table */}
        <div>
          <RoomTable
            rooms={paginatedRooms}
            onEdit={setEditingRoom}
            onDelete={handleDeleteRoom}
            isLoading={isLoading}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredRooms.length}
            itemName='rooms'
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>

        {/* Add/Edit Room Form */}
        {(isAddModalOpen || editingRoom) && (
          <RoomForm
            room={editingRoom}
            onSave={handleSaveRoom}
            onCancel={() => {
              setEditingRoom(null);
              setIsAddModalOpen(false);
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteConfirmation.isOpen}
          onClose={() =>
            setDeleteConfirmation({
              isOpen: false,
              roomId: null,
              roomNumber: "",
            })
          }
          onConfirm={confirmDeleteRoom}
          title='Delete Room'
          message={`Are you sure you want to delete room "${deleteConfirmation.roomNumber}"?`}
          description='This action cannot be undone. All associated data will be permanently removed.'
          confirmText='Delete Room'
          cancelText='Cancel'
          variant='danger'
        />

        {/* Success Modal */}
        <SuccessModal
          isOpen={successModal.isOpen}
          onClose={() => setSuccessModal({ isOpen: false, message: "" })}
          message={successModal.message}
          autoClose={true}
          autoCloseDelay={3000}
        />

        {/* Error Modal */}
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() =>
            setErrorModal({ isOpen: false, message: "", details: "" })
          }
          message={errorModal.message}
          details={errorModal.details}
        />
      </div>
    </div>
  );
};

export default RoomManagement;
