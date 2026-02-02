"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SuccessModal from "../../common/SuccessModal";
import ErrorModal from "../../common/ErrorModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import DiscountTable from "./DiscountTable";
import DiscountForm from "./DiscountForm";
import { filterDiscounts, Discount } from "./utils";
import { useSession } from "next-auth/react";
import { insertIntoReports } from "@/app/utils/reportsUtils";

const DiscountManagement: React.FC = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchDiscounts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/auth/discounts");
        if (response.ok) {
          const data = await response.json();
          setDiscounts(data);
        } else {
          throw new Error("Failed to fetch discounts");
        }
      } catch (error) {
        console.error("Error fetching discounts:", error);
        setErrorModal({
          isOpen: true,
          message: "Failed to load discounts",
          details: "Please refresh the page and try again.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchDiscounts();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    discountId: number | null;
    discountName: string;
  }>({
    isOpen: false,
    discountId: null,
    discountName: "",
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

  const filteredDiscounts = useMemo(
    () => filterDiscounts(discounts, searchTerm, statusFilter, semesterFilter),
    [discounts, searchTerm, statusFilter, semesterFilter],
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredDiscounts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDiscounts = filteredDiscounts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, semesterFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveDiscount = async (discountData: Discount) => {
    if (isSubmitting) return; // Prevent multiple clicks
    
    setIsSubmitting(true);
    try {
      if (editingDiscount) {
        const response = await fetch("/api/auth/discounts", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: discountData.id,
            code: discountData.code,
            name: discountData.name,
            percentage: discountData.percentage,
            semester: discountData.semester,
            status: discountData.status,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update discount");
        }

        setDiscounts((prev) =>
          prev.map((d) => (d.id === discountData.id ? discountData : d))
        );
        setEditingDiscount(null);
        setSuccessModal({
          isOpen: true,
          message: `Discount "${discountData.name}" has been updated successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Edited the Discount ${discountData.name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      } else {
        const response = await fetch("/api/auth/discounts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: discountData.code,
            name: discountData.name,
            percentage: discountData.percentage,
            semester: discountData.semester,
            status: discountData.status,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create discount");
        }

        const newDiscount = await response.json();
        setDiscounts((prev) => [...prev, newDiscount]);
        setIsAddModalOpen(false);
        setSuccessModal({
          isOpen: true,
          message: `Discount "${discountData.name}" has been created successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Created the Discount ${discountData.name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      }
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || "An error occurred while saving the discount.",
        details: "Please check your input and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDiscount = (id: number) => {
    const discount = discounts.find((d) => d.id === id);
    if (discount) {
      setDeleteConfirmation({
        isOpen: true,
        discountId: id,
        discountName: discount.name,
      });
    }
  };

  const confirmDeleteDiscount = async () => {
    if (deleteConfirmation.discountId && !isDeleting) {
      setIsDeleting(true);
      try {
        const response = await fetch(
          `/api/auth/discounts?id=${deleteConfirmation.discountId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete discount");
        }

        setDiscounts((prev) =>
          prev.filter((d) => d.id !== deleteConfirmation.discountId)
        );
        setDeleteConfirmation({
          isOpen: false,
          discountId: null,
          discountName: "",
        });
        setSuccessModal({
          isOpen: true,
          message: `Discount "${deleteConfirmation.discountName}" has been deleted successfully.`,
        });
        insertIntoReports({
          action: `This Discount: ${deleteConfirmation.discountName} Was deleted By ${session?.user.name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      } catch (error: any) {
        setErrorModal({
          isOpen: true,
          message: error.message || "An error occurred while deleting the discount.",
          details: "Please try again.",
        });
        setDeleteConfirmation({
          isOpen: false,
          discountId: null,
          discountName: "",
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div
        className='min-h-screen p-6 font-sans flex items-center justify-center'
        style={{ backgroundColor: colors.paper }}
      >
        <div className='text-center'>
          <div className='w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4' />
          <p style={{ color: colors.primary }}>Loading discounts...</p>
        </div>
      </div>
    );
  }

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
              Discount Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage discount policies and rules
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={isSubmitting || isDeleting}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Discount</span>
          </button>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder='Search discounts...'
          filters={[
            {
              value: semesterFilter,
              onChange: (value) => setSemesterFilter(value as string),
              options: [
                { value: "all", label: "All Semesters" },
                { value: "First", label: "First Semester" },
                { value: "Second", label: "Second Semester" },
              ],
              placeholder: "All Semesters",
            },
            {
              value: statusFilter,
              onChange: (value) =>
                setStatusFilter(
                  value === "all" ? "all" : (value as "active" | "inactive"),
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

        {/* Discounts Table */}
        <div>
          <DiscountTable
            discounts={paginatedDiscounts}
            onEdit={setEditingDiscount}
            onDelete={handleDeleteDiscount}
            isLoading={isLoading}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredDiscounts.length}
            itemName='discounts'
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>

        {/* Add/Edit Discount Form */}
        {(isAddModalOpen || editingDiscount) && (
          <DiscountForm
            discount={editingDiscount}
            onSave={handleSaveDiscount}
            onCancel={() => {
              setEditingDiscount(null);
              setIsAddModalOpen(false);
            }}
            isLoading={isSubmitting}
          />
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteConfirmation.isOpen}
          onClose={() =>
            setDeleteConfirmation({
              isOpen: false,
              discountId: null,
              discountName: "",
            })
          }
          onConfirm={confirmDeleteDiscount}
          title='Delete Discount'
          message={`Are you sure you want to delete "${deleteConfirmation.discountName}"?`}
          description='This action cannot be undone. All associated data will be permanently removed.'
          confirmText='Delete Discount'
          cancelText='Cancel'
          variant='danger'
          isLoading={isDeleting}
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

export default DiscountManagement;

