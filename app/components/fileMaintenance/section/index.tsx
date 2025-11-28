"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Section } from "../../../types";
import { mockSections, mockCourses } from "../../../data/mockData";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import SectionTable from "./SectionTable";
import SectionForm from "./SectionForm";
import { filterSections } from "./utils";
import { getSections } from "../../../utils/getSection";
const SectionManagement: React.FC = () => {
  const [sections, setSections] = useState<Section[]>();
  React.useEffect(() => {
    async function fetchData() {
      const data = await getSections();
      setSections(Object.values(data));
    }
    fetchData();
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    sectionId: number | null;
    sectionName: string;
  }>({
    isOpen: false,
    sectionId: null,
    sectionName: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredSections = useMemo(
    () => filterSections(sections || [], searchTerm, statusFilter),
    [sections, searchTerm, statusFilter]
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredSections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSections = filteredSections.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveSection = (
    sectionData: Section & { courseName?: string }
  ) => {
    if (editingSection) {
      setSections((prev) =>
        prev?.map((s) => (s.id === sectionData.id ? sectionData : s))
      );
      setEditingSection(null);
      fetch("/api/auth/section", {
        method: "PATCH",
        body: JSON.stringify(sectionData),
      });
    } else {
      setSections((prev = []) => [...prev, sectionData]);
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteSection = (id: number) => {
    const section = sections?.find((s) => s.id === id);
    if (section) {
      setDeleteConfirmation({
        isOpen: true,
        sectionId: id,
        sectionName: section.section_name || "",
      });
    }
  };

  const confirmDeleteSection = () => {
    if (deleteConfirmation.sectionId) {
      setSections((prev = []) =>
        prev.filter((s) => s.id !== deleteConfirmation.sectionId)
      );
      setDeleteConfirmation({
        isOpen: false,
        sectionId: null,
        sectionName: "",
      });
      fetch("/api/auth/section", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deleteConfirmation.sectionId),
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
              Section Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage section information and settings
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Section</span>
          </button>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder='Search sections...'
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

        {/* Sections Table */}
        <div>
          <SectionTable
            sections={paginatedSections}
            onEdit={setEditingSection}
            onDelete={handleDeleteSection}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredSections.length}
            itemName='sections'
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>

        {/* Add/Edit Section Form */}
        {(isAddModalOpen || editingSection) && (
          <SectionForm
            section={editingSection}
            onSave={handleSaveSection}
            onCancel={() => {
              setEditingSection(null);
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
              sectionId: null,
              sectionName: "",
            })
          }
          onConfirm={confirmDeleteSection}
          title='Delete Section'
          message={`Are you sure you want to delete "${deleteConfirmation.sectionName}"?`}
          description='This action cannot be undone. All associated data will be permanently removed.'
          confirmText='Delete Section'
          cancelText='Cancel'
          variant='danger'
        />
      </div>
    </div>
  );
};

export default SectionManagement;
