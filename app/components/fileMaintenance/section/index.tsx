"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Section, Program } from "../../../types";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SuccessModal from "../../common/SuccessModal";
import ErrorModal from "../../common/ErrorModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import SectionTable from "./SectionTable";
import SectionForm from "./SectionForm";
import { filterSections } from "./utils";
import { getSections } from "../../../utils/getSection";
import { getPrograms } from "@/app/utils/programUtils";
import { useSession } from "next-auth/react";
import { insertIntoReports } from "@/app/utils/reportsUtils";
import { invalidateRelatedCaches } from "@/app/utils/cache";
const SectionManagement: React.FC = () => {
  const [sections, setSections] = useState<Section[]>();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  React.useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [sectionsData, programsData] = await Promise.all([
          getSections(),
          getPrograms(),
        ]);
        const programsArray: Program[] = Array.isArray(programsData)
          ? programsData
          : Object.values(programsData);
        setPrograms(programsArray);
        const sectionsArray: Section[] = Array.isArray(sectionsData)
          ? sectionsData
          : Object.values(sectionsData);
        setSections(
          sectionsArray.map((section) => ({
            ...section,
            programName:
              programsArray.find((p) => p.id === section.program_id)?.name ||
              "",
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

  const filteredSections = useMemo(
    () => filterSections(sections || [], searchTerm, statusFilter),
    [sections, searchTerm, statusFilter],
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

  const handleSaveSection = async (
    sectionData: Section & { programName?: string },
  ) => {
    try {
      if (editingSection) {
        const response = await fetch("/api/auth/section", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sectionData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update section");
        }

        const programName =
          programs.find((p) => p.id === sectionData.program_id)?.name || "";
        setSections((prev) =>
          prev?.map((s) =>
            s.id === sectionData.id ? { ...sectionData, programName } : s,
          ),
        );
        invalidateRelatedCaches("SECTIONS");
        setEditingSection(null);
        setSuccessModal({
          isOpen: true,
          message: `Section "${sectionData.section_name}" has been updated successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Edited the Section ${sectionData.section_name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      } else {
        const response = await fetch("/api/auth/section", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sectionData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create section");
        }

        const newSection = await response.json();
        const programName =
          programs.find((p) => p.id === sectionData.program_id)?.name || "";
        setSections((prev = []) => [
          ...prev,
          { ...sectionData, id: newSection.id, programName },
        ]);
        invalidateRelatedCaches("SECTIONS");
        setIsAddModalOpen(false);
        setSuccessModal({
          isOpen: true,
          message: `Section "${sectionData.section_name}" has been created successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Created the Section ${sectionData.section_name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      }
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || "An error occurred while saving the section.",
        details: "Please check your input and try again.",
      });
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

  const confirmDeleteSection = async () => {
    if (deleteConfirmation.sectionId) {
      try {
        const response = await fetch("/api/auth/section", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deleteConfirmation.sectionId),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete section");
        }

        setSections((prev = []) =>
          prev.filter((s) => s.id !== deleteConfirmation.sectionId),
        );
        invalidateRelatedCaches("SECTIONS");
        setDeleteConfirmation({
          isOpen: false,
          sectionId: null,
          sectionName: "",
        });
        setSuccessModal({
          isOpen: true,
          message: `Section "${deleteConfirmation.sectionName}" has been deleted successfully.`,
        });
        insertIntoReports({
          action: `This Subject: ${deleteConfirmation.sectionName} Was deleted By ${session?.user.name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      } catch (error: any) {
        setErrorModal({
          isOpen: true,
          message:
            error.message || "An error occurred while deleting the section.",
          details: "Please try again.",
        });
        setDeleteConfirmation({
          isOpen: false,
          sectionId: null,
          sectionName: "",
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
              Scheduling Management
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

        {/* Sections Table */}
        <div>
          <SectionTable
            sections={paginatedSections}
            onEdit={setEditingSection}
            onDelete={handleDeleteSection}
            isLoading={isLoading}
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

export default SectionManagement;
