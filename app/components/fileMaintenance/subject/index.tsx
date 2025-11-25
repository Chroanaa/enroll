"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Subject } from "../../../types";
import { mockSubjects, mockDepartments } from "../../../data/mockData";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import SubjectTable from "./SubjectTable";
import SubjectForm from "./SubjectForm";
import { filterSubjects } from "./utils";

const SubjectManagement: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>(
    mockSubjects.map((subject) => ({
      ...subject,
      departmentName:
        mockDepartments.find((d) => d.id === subject.department_id)?.name || "",
    }))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    subjectId: number | null;
    subjectName: string;
  }>({
    isOpen: false,
    subjectId: null,
    subjectName: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredSubjects = useMemo(
    () => filterSubjects(subjects, searchTerm, statusFilter),
    [subjects, searchTerm, statusFilter]
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubjects = filteredSubjects.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveSubject = (subjectData: Subject) => {
    if (editingSubject) {
      setSubjects((prev) =>
        prev.map((s) => (s.id === subjectData.id ? subjectData : s))
      );
      setEditingSubject(null);
    } else {
      setSubjects((prev) => [...prev, subjectData]);
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteSubject = (id: number) => {
    const subject = subjects.find((s) => s.id === id);
    if (subject) {
      setDeleteConfirmation({
        isOpen: true,
        subjectId: id,
        subjectName: subject.name,
      });
    }
  };

  const confirmDeleteSubject = () => {
    if (deleteConfirmation.subjectId) {
      setSubjects((prev) =>
        prev.filter((s) => s.id !== deleteConfirmation.subjectId)
      );
      setDeleteConfirmation({
        isOpen: false,
        subjectId: null,
        subjectName: "",
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
              Subject Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage academic subjects and their details
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Subject</span>
          </button>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder='Search subjects...'
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

        {/* Subjects Table */}
        <div>
          <SubjectTable
            subjects={paginatedSubjects}
            onEdit={setEditingSubject}
            onDelete={handleDeleteSubject}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredSubjects.length}
            itemName='subjects'
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>

        {/* Add/Edit Subject Form */}
        {(isAddModalOpen || editingSubject) && (
          <SubjectForm
            subject={editingSubject}
            onSave={handleSaveSubject}
            onCancel={() => {
              setEditingSubject(null);
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
              subjectId: null,
              subjectName: "",
            })
          }
          onConfirm={confirmDeleteSubject}
          title='Delete Subject'
          message={`Are you sure you want to delete "${deleteConfirmation.subjectName}"?`}
          description='This action cannot be undone. All associated data will be permanently removed.'
          confirmText='Delete Subject'
          cancelText='Cancel'
          variant='danger'
        />
      </div>
    </div>
  );
};

export default SubjectManagement;


