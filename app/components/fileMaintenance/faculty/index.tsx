"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Faculty } from "../../../types";
import { mockFaculty, mockDepartments } from "../../../data/mockData";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import FacultyTable from "./FacultyTable";
import FacultyForm from "./FacultyForm";
import { filterFaculty } from "./utils";

const FacultyManagement: React.FC = () => {
  const [faculty, setFaculty] = useState<Faculty[]>(
    mockFaculty.map((fac) => ({
      ...fac,
      departmentName:
        mockDepartments.find((d) => d.id === fac.department_id)?.name || "",
    }))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    facultyId: number | null;
    facultyName: string;
  }>({
    isOpen: false,
    facultyId: null,
    facultyName: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredFaculty = useMemo(
    () => filterFaculty(faculty, searchTerm, statusFilter, positionFilter),
    [faculty, searchTerm, statusFilter, positionFilter]
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredFaculty.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFaculty = filteredFaculty.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, positionFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveFaculty = (facultyData: Faculty) => {
    if (editingFaculty) {
      setFaculty((prev) =>
        prev.map((f) => (f.id === facultyData.id ? facultyData : f))
      );
      setEditingFaculty(null);
    } else {
      setFaculty((prev) => [...prev, facultyData]);
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteFaculty = (id: number) => {
    const fac = faculty.find((f) => f.id === id);
    if (fac) {
      setDeleteConfirmation({
        isOpen: true,
        facultyId: id,
        facultyName: `${fac.first_name} ${fac.last_name}`,
      });
    }
  };

  const confirmDeleteFaculty = () => {
    if (deleteConfirmation.facultyId) {
      setFaculty((prev) =>
        prev.filter((f) => f.id !== deleteConfirmation.facultyId)
      );
      setDeleteConfirmation({
        isOpen: false,
        facultyId: null,
        facultyName: "",
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
              Faculty Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage faculty members and their assignments
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Faculty</span>
          </button>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder='Search faculty...'
          filters={[
            {
              value: positionFilter,
              onChange: (value) => setPositionFilter(value as string),
              options: [
                { value: "all", label: "All Positions" },
                { value: "professor", label: "Professor" },
                { value: "associate professor", label: "Associate Professor" },
                { value: "assistant professor", label: "Assistant Professor" },
                { value: "instructor", label: "Instructor" },
                { value: "lecturer", label: "Lecturer" },
              ],
              placeholder: "All Positions",
            },
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

        {/* Faculty Table */}
        <div>
          <FacultyTable
            faculty={paginatedFaculty}
            onEdit={setEditingFaculty}
            onDelete={handleDeleteFaculty}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredFaculty.length}
            itemName='faculty members'
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>

        {/* Add/Edit Faculty Form */}
        {(isAddModalOpen || editingFaculty) && (
          <FacultyForm
            faculty={editingFaculty}
            onSave={handleSaveFaculty}
            onCancel={() => {
              setEditingFaculty(null);
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
              facultyId: null,
              facultyName: "",
            })
          }
          onConfirm={confirmDeleteFaculty}
          title='Delete Faculty'
          message={`Are you sure you want to delete "${deleteConfirmation.facultyName}"?`}
          description='This action cannot be undone. All associated data will be permanently removed.'
          confirmText='Delete Faculty'
          cancelText='Cancel'
          variant='danger'
        />
      </div>
    </div>
  );
};

export default FacultyManagement;



