"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Fee } from "../../../types";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SuccessModal from "../../common/SuccessModal";
import ErrorModal from "../../common/ErrorModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import FeesTable from "./FeesTable";
import FeesForm from "./FeesForm";
import { filterFees } from "./utils";
import { getFees } from "@/app/utils/feesUtils";
import { insertIntoReports } from "@/app/utils/reportsUtils";
import { useSession } from "next-auth/react";
const FeesManagement: React.FC = () => {
  const [fees, setFees] = useState<Fee[]>([]);
  const { data: session } = useSession();
  useEffect(() => {
    const fetchFees = async () => {
      try {
        const data = await getFees();
        setFees(data);
      } catch (error) {
        console.error("Error fetching fees:", error);
      }
    };
    fetchFees();
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    feeId: number | null;
    feeName: string;
  }>({
    isOpen: false,
    feeId: null,
    feeName: "",
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

  const filteredFees = useMemo(
    () => filterFees(fees, searchTerm, statusFilter, categoryFilter),
    [fees, searchTerm, statusFilter, categoryFilter]
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredFees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFees = filteredFees.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveFee = async (feeData: Fee) => {
    try {
      if (editingFee) {
        const response = await fetch("/api/auth/fees", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(feeData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update fee");
        }

        setFees((prev) => prev.map((f) => (f.id === feeData.id ? feeData : f)));
        setEditingFee(null);
        setSuccessModal({
          isOpen: true,
          message: `Fee "${feeData.name}" has been updated successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Edited the Department ${feeData.name}`,
          user_id: Number(session?.user.id),
        });
      } else {
        const response = await fetch("/api/auth/fees", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(feeData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create fee");
        }

        const newFee = await response.json();
        setFees((prev) => [...prev, { ...feeData, id: newFee.id }]);
        setIsAddModalOpen(false);
        setSuccessModal({
          isOpen: true,
          message: `Fee "${feeData.name}" has been created successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Created the Fees ${feeData.name}`,
          user_id: Number(session?.user.id),
        });
      }
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || "An error occurred while saving the fee.",
        details: "Please check your input and try again.",
      });
    }
  };

  const handleDeleteFee = (id: number) => {
    const fee = fees.find((f) => f.id === id);
    if (fee) {
      setDeleteConfirmation({
        isOpen: true,
        feeId: id,
        feeName: fee.name,
      });
    }
  };

  const confirmDeleteFee = async () => {
    if (deleteConfirmation.feeId) {
      try {
        const response = await fetch("/api/auth/fees", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deleteConfirmation.feeId),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete fee");
        }

        setFees((prev) =>
          prev.filter((f) => f.id !== deleteConfirmation.feeId)
        );
        setDeleteConfirmation({
          isOpen: false,
          feeId: null,
          feeName: "",
        });
        setSuccessModal({
          isOpen: true,
          message: `Fee "${deleteConfirmation.feeName}" has been deleted successfully.`,
        });
        insertIntoReports({
          action: `This Subject: ${deleteConfirmation.feeName} Was deleted By ${session?.user.name}`,
          user_id: Number(session?.user.id),
        });
      } catch (error: any) {
        setErrorModal({
          isOpen: true,
          message: error.message || "An error occurred while deleting the fee.",
          details: "Please try again.",
        });
        setDeleteConfirmation({
          isOpen: false,
          feeId: null,
          feeName: "",
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
              Fees Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage fees and charges for students
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Fee</span>
          </button>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder='Search fees...'
          filters={[
            {
              value: categoryFilter,
              onChange: (value) => setCategoryFilter(value as string),
              options: [
                { value: "all", label: "All Categories" },
                { value: "tuition", label: "Tuition" },
                { value: "miscellaneous", label: "Miscellaneous" },
                { value: "laboratory", label: "Laboratory" },
                { value: "library", label: "Library" },
                { value: "other", label: "Other" },
              ],
              placeholder: "All Categories",
            },
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

        {/* Fees Table */}
        <div>
          <FeesTable
            fees={paginatedFees}
            onEdit={setEditingFee}
            onDelete={handleDeleteFee}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredFees.length}
            itemName='fees'
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>

        {/* Add/Edit Fee Form */}
        {(isAddModalOpen || editingFee) && (
          <FeesForm
            fee={editingFee}
            onSave={handleSaveFee}
            onCancel={() => {
              setEditingFee(null);
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
              feeId: null,
              feeName: "",
            })
          }
          onConfirm={confirmDeleteFee}
          title='Delete Fee'
          message={`Are you sure you want to delete "${deleteConfirmation.feeName}"?`}
          description='This action cannot be undone. All associated data will be permanently removed.'
          confirmText='Delete Fee'
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

export default FeesManagement;
