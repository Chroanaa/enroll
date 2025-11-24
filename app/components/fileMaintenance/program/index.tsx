"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Program } from "../../../types";
import { mockPrograms, mockDepartments } from "../../../data/mockData";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import ProgramTable from "./ProgramTable";
import ProgramForm from "./ProgramForm";
import { filterPrograms } from "./utils";

const ProgramManagement: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>(
    mockPrograms.map((program) => ({
      ...program,
      departmentName: program.department_id
        ? mockDepartments.find((d) => d.id === program.department_id)?.name || ""
        : "",
    }))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingProgram, setEditingProgram] = useState<Program | null>(
    null
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    programId: number | null;
    programName: string;
  }>({
    isOpen: false,
    programId: null,
    programName: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredPrograms = useMemo(
    () => filterPrograms(programs, searchTerm, statusFilter),
    [programs, searchTerm, statusFilter]
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredPrograms.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPrograms = filteredPrograms.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveProgram = (programData: Program) => {
    if (editingProgram) {
      setPrograms((prev) =>
        prev.map((p) => (p.id === programData.id ? programData : p))
      );
      setEditingProgram(null);
    } else {
      setPrograms((prev) => [...prev, programData]);
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteProgram = (id: number) => {
    const program = programs.find((p) => p.id === id);
    if (program) {
      setDeleteConfirmation({
        isOpen: true,
        programId: id,
        programName: program.name,
      });
    }
  };

  const confirmDeleteProgram = () => {
    if (deleteConfirmation.programId) {
      setPrograms((prev) =>
        prev.filter((p) => p.id !== deleteConfirmation.programId)
      );
      setDeleteConfirmation({
        isOpen: false,
        programId: null,
        programName: "",
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
              Program Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage academic programs and their details
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Program</span>
          </button>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder='Search programs...'
          filters={[
            {
              value: statusFilter,
              onChange: (value) =>
                setStatusFilter(value === "all" ? "all" : (value as "active" | "inactive")),
              options: [
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ],
              placeholder: "All Status",
            },
          ]}
        />

        {/* Programs Table */}
        <div>
          <ProgramTable
            programs={paginatedPrograms}
            onEdit={setEditingProgram}
            onDelete={handleDeleteProgram}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredPrograms.length}
            itemName='programs'
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>

        {/* Add/Edit Program Form */}
        {(isAddModalOpen || editingProgram) && (
          <ProgramForm
            program={editingProgram}
            onSave={handleSaveProgram}
            onCancel={() => {
              setEditingProgram(null);
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
              programId: null,
              programName: "",
            })
          }
          onConfirm={confirmDeleteProgram}
          title='Delete Program'
          message={`Are you sure you want to delete "${deleteConfirmation.programName}"?`}
          description='This action cannot be undone. All associated data will be permanently removed.'
          confirmText='Delete Program'
          cancelText='Cancel'
          variant='danger'
        />
      </div>
    </div>
  );
};

export default ProgramManagement;

