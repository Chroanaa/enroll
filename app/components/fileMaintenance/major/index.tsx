"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Major } from "../../../types";
import { mockMajors, mockPrograms } from "../../../data/mockData";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import MajorTable from "./MajorTable";
import MajorForm from "./MajorForm";
import { filterMajors } from "./utils";
import { getMajors } from "@/app/utils/majorUtils";
const MajorManagement: React.FC = () => {
  const [majors, setMajors] = useState<Major[]>([]);
  useEffect(() => {
    const fetchMajors = async () => {
      try {
        const data = await getMajors();
        const majorsWithProgramNames = data.map((major) => ({
          ...major,
          programName: major.program_id
            ? mockPrograms.find((p) => p.id === major.program_id)?.name || ""
            : "",
        }));
        setMajors(majorsWithProgramNames);
      } catch (error) {
        console.error("Error fetching majors:", error);
      }
    };
    fetchMajors();
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingMajor, setEditingMajor] = useState<Major | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    majorId: number | null;
    majorName: string;
  }>({
    isOpen: false,
    majorId: null,
    majorName: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredMajors = useMemo(
    () => filterMajors(majors, searchTerm, statusFilter),
    [majors, searchTerm, statusFilter]
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredMajors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMajors = filteredMajors.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveMajor = (majorData: Major) => {
    if (editingMajor) {
      setMajors((prev) =>
        prev.map((m) => (m.id === majorData.id ? majorData : m))
      );
      setEditingMajor(null);
    } else {
      setMajors((prev) => [...prev, majorData]);
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteMajor = (id: number) => {
    const major = majors.find((m) => m.id === id);
    if (major) {
      setDeleteConfirmation({
        isOpen: true,
        majorId: id,
        majorName: major.name,
      });
    }
  };

  const confirmDeleteMajor = () => {
    if (deleteConfirmation.majorId) {
      setMajors((prev) =>
        prev.filter((m) => m.id !== deleteConfirmation.majorId)
      );
      setDeleteConfirmation({
        isOpen: false,
        majorId: null,
        majorName: "",
      });
      fetch("/api/auth/major", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deleteConfirmation.majorId),
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
              Major Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage academic majors and their details
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Major</span>
          </button>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder='Search majors...'
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

        {/* Majors Table */}
        <div>
          <MajorTable
            majors={paginatedMajors}
            onEdit={setEditingMajor}
            onDelete={handleDeleteMajor}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredMajors.length}
            itemName='majors'
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>

        {/* Add/Edit Major Form */}
        {(isAddModalOpen || editingMajor) && (
          <MajorForm
            major={editingMajor}
            onSave={handleSaveMajor}
            onCancel={() => {
              setEditingMajor(null);
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
              majorId: null,
              majorName: "",
            })
          }
          onConfirm={confirmDeleteMajor}
          title='Delete Major'
          message={`Are you sure you want to delete "${deleteConfirmation.majorName}"?`}
          description='This action cannot be undone. All associated data will be permanently removed.'
          confirmText='Delete Major'
          cancelText='Cancel'
          variant='danger'
        />
      </div>
    </div>
  );
};

export default MajorManagement;
