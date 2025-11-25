"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Room } from "../../../types";
import { mockRooms, mockBuildings } from "../../../data/mockData";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import RoomTable from "./RoomTable";
import RoomForm from "./RoomForm";
import { filterRooms } from "./utils";

const RoomManagement: React.FC = () => {
  const [rooms, setRooms] = useState<(Room & { buildingName?: string })[]>(
    mockRooms.map((room) => ({
      ...room,
      buildingName:
        mockBuildings.find((b) => b.id === room.building_id)?.name || "",
    }))
  );
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredRooms = useMemo(
    () => filterRooms(rooms, searchTerm, statusFilter, typeFilter),
    [rooms, searchTerm, statusFilter, typeFilter]
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

  const handleSaveRoom = (roomData: Room & { buildingName?: string }) => {
    if (editingRoom) {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomData.id ? roomData : r))
      );
      setEditingRoom(null);
    } else {
      setRooms((prev) => [...prev, roomData]);
      setIsAddModalOpen(false);
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

  const confirmDeleteRoom = () => {
    if (deleteConfirmation.roomId) {
      setRooms((prev) =>
        prev.filter((r) => r.id !== deleteConfirmation.roomId)
      );
      setDeleteConfirmation({
        isOpen: false,
        roomId: null,
        roomNumber: "",
      });
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
                    : (value as "available" | "occupied" | "maintenance")
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
      </div>
    </div>
  );
};

export default RoomManagement;



