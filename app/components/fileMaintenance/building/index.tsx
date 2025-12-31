"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Building } from "../../../types";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SuccessModal from "../../common/SuccessModal";
import ErrorModal from "../../common/ErrorModal";
import { useSession } from "next-auth/react";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import BuildingTable from "./BuildingTable";
import BuildingForm from "./BuildingForm";
import { filterBuildings } from "./utils";
import { getBuildings } from "@/app/utils/getBuildings";
import { insertIntoReports } from "@/app/utils/reportsUtils";
const BuildingManagement: React.FC = () => {
  const { data: session } = useSession();
  const [buildings, setBuildings] = useState<Building[]>();
  React.useEffect(() => {
    const fetchBuildings = async () => {
      const data = await getBuildings();
      setBuildings(Object.values(data));
    };
    fetchBuildings();
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    buildingId: number | null;
    buildingName: string;
  }>({
    isOpen: false,
    buildingId: null,
    buildingName: "",
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

  const filteredBuildings = useMemo(
    () => filterBuildings(buildings || [], searchTerm, statusFilter),
    [buildings, searchTerm, statusFilter]
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredBuildings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBuildings = filteredBuildings.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveBuilding = async (buildingData: Building) => {
    try {
      if (editingBuilding) {
        const response = await fetch("/api/auth/building", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildingData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update building");
        }

        setBuildings((prev) =>
          prev?.map((b) => (b.id === buildingData.id ? buildingData : b))
        );
        setEditingBuilding(null);
        setSuccessModal({
          isOpen: true,
          message: `Building "${buildingData.name}" has been updated successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Edited the Building ${buildingData.name}`,
          user_id: Number(session?.user.id),
        });
      } else {
        const response = await fetch("/api/auth/building", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildingData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create building");
        }

        const newBuilding = await response.json();
        setBuildings((prev) => [
          ...(prev || []),
          { ...buildingData, id: newBuilding.id },
        ]);
        setIsAddModalOpen(false);
        setSuccessModal({
          isOpen: true,
          message: `Building "${buildingData.name}" has been created successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Created the Building ${buildingData.name}`,
          user_id: Number(session?.user.id),
        });
      }
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message:
          error.message || "An error occurred while saving the building.",
        details: "Please check your input and try again.",
      });
    }
  };

  const handleDeleteBuilding = (id: number) => {
    const building = buildings?.find((b) => b.id === id);
    if (building) {
      setDeleteConfirmation({
        isOpen: true,
        buildingId: id,
        buildingName: building.name,
      });
    }
  };

  const confirmDeleteBuilding = async () => {
    if (deleteConfirmation.buildingId) {
      try {
        const response = await fetch("/api/auth/building", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deleteConfirmation.buildingId),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete building");
        }

        setBuildings((prev) =>
          prev?.filter((b) => b.id !== deleteConfirmation.buildingId)
        );
        setDeleteConfirmation({
          isOpen: false,
          buildingId: null,
          buildingName: "",
        });
        setSuccessModal({
          isOpen: true,
          message: `Building "${deleteConfirmation.buildingName}" has been deleted successfully.`,
        });
        insertIntoReports({
          action: `This Subject: ${deleteConfirmation.buildingName} Was deleted By ${session?.user.name}`,
          user_id: Number(session?.user.id),
        });
      } catch (error: any) {
        setErrorModal({
          isOpen: true,
          message:
            error.message || "An error occurred while deleting the building.",
          details: "Please try again.",
        });
        setDeleteConfirmation({
          isOpen: false,
          buildingId: null,
          buildingName: "",
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
              Building Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage building information and settings
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Building</span>
          </button>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder='Search buildings...'
          filters={[
            {
              value: statusFilter,
              onChange: (value) =>
                setStatusFilter(
                  value === "all" ? "all" : (value as "active" | "inactive")
                ),
              options: [
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ],
              placeholder: "All Status",
            },
          ]}
        />

        {/* Buildings Table */}
        <div>
          <BuildingTable
            buildings={paginatedBuildings}
            onEdit={setEditingBuilding}
            onDelete={handleDeleteBuilding}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredBuildings.length}
            itemName='buildings'
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>

        {/* Add/Edit Building Form */}
        {(isAddModalOpen || editingBuilding) && (
          <BuildingForm
            building={editingBuilding}
            onSave={handleSaveBuilding}
            onCancel={() => {
              setEditingBuilding(null);
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
              buildingId: null,
              buildingName: "",
            })
          }
          onConfirm={confirmDeleteBuilding}
          title='Delete Building'
          message={`Are you sure you want to delete "${deleteConfirmation.buildingName}"?`}
          description='This action cannot be undone. All associated data will be permanently removed.'
          confirmText='Delete Building'
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

export default BuildingManagement;
