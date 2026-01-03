"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus, GraduationCap, FileText, Edit2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Curriculum } from "../../types";
import { colors } from "../../colors";
import CurriculumTable from "./CurriculumTable";
import EditCurriculumPage from "./EditCurriculumPage";
import SearchFilters from "../common/SearchFilters";
import ConfirmationModal from "../common/ConfirmationModal";
import SuccessModal from "../common/SuccessModal";
import ErrorModal from "../common/ErrorModal";
import Pagination from "../common/Pagination";
import { getCurriculums } from "@/app/utils/curriculumUtils";
const CurriculumManagement: React.FC = () => {
  const router = useRouter();
  const [curriculumList, setCurriculumList] = useState<Curriculum[]>([]);

  // Initialize with mock BSIT curriculum data
  useEffect(() => {
    const fetchCurriculums = async () => {
      try {
        const data = await getCurriculums();
        setCurriculumList(data);
      } catch (error) {
        console.error("Failed to fetch curriculums:", error);
      }
    };
    fetchCurriculums();
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "inactive"
  >("active");
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(
    null
  );
  const [selectedCurriculum, setSelectedCurriculum] =
    useState<Curriculum | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    curriculumId: number | null;
    curriculumName: string;
  }>({
    isOpen: false,
    curriculumId: null,
    curriculumName: "",
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

  const filteredCurriculum = useMemo(() => {
    return curriculumList.filter((curriculum) => {
      const matchesSearch =
        curriculum.program_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        curriculum.program_code
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        curriculum.major?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = curriculum.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [curriculumList, searchTerm, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCurriculum.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCurriculum = filteredCurriculum.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveCurriculum = async (curriculumData: Curriculum) => {
    try {
      if (editingCurriculum) {
        const response = await fetch("/api/auth/curriculum", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(curriculumData),
        });

        if (response.ok) {
          const updatedCurriculum = await response.json();
          setCurriculumList((prev) =>
            prev.map((c) =>
              c.id === updatedCurriculum.id ? updatedCurriculum : c
            )
          );
          setEditingCurriculum(null);
          setSuccessModal({
            isOpen: true,
            message: `Curriculum "${curriculumData.program_name}" has been updated successfully.`,
          });
        } else {
          const errorData = await response.json();
          setErrorModal({
            isOpen: true,
            message: `Failed to update curriculum: ${errorData.error || "Unknown error"}`,
            details: "Please check your input and try again.",
          });
        }
      } else {
        const response = await fetch("/api/auth/curriculum", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(curriculumData),
        });

        if (response.ok) {
          const newCurriculum = await response.json();
          setCurriculumList((prev) => [...prev, newCurriculum]);
          setSuccessModal({
            isOpen: true,
            message: `Curriculum "${curriculumData.program_name}" has been created successfully.`,
          });
        } else {
          const errorData = await response.json();
          setErrorModal({
            isOpen: true,
            message: `Failed to create curriculum: ${errorData.error || "Unknown error"}`,
            details: "Please check your input and try again.",
          });
        }
      }
    } catch (error: any) {
      console.error("Failed to save curriculum:", error);
      setErrorModal({
        isOpen: true,
        message: `Failed to save curriculum: ${error.message || "Network error"}`,
        details: "Please check your connection and try again.",
      });
    }
  };

  const handleDeleteCurriculum = (id: number) => {
    const curriculum = curriculumList.find((c) => c.id === id);
    if (curriculum) {
      setDeleteConfirmation({
        isOpen: true,
        curriculumId: id,
        curriculumName: curriculum.program_name,
      });
    }
  };

  const confirmDeleteCurriculum = async () => {
    if (deleteConfirmation.curriculumId) {
      const curriculumName = deleteConfirmation.curriculumName;
      try {
        const response = await fetch("/api/auth/curriculum", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deleteConfirmation.curriculumId),
        });

        if (response.ok) {
          setCurriculumList((prev) =>
            prev.filter((c) => c.id !== deleteConfirmation.curriculumId)
          );
          setDeleteConfirmation({
            isOpen: false,
            curriculumId: null,
            curriculumName: "",
          });
          setSuccessModal({
            isOpen: true,
            message: `Curriculum "${curriculumName}" has been deleted successfully.`,
          });
        } else {
          const errorData = await response.json();
          setErrorModal({
            isOpen: true,
            message: `Failed to delete curriculum: ${errorData.error || "Unknown error"}`,
            details: "Please try again.",
          });
          setDeleteConfirmation({
            isOpen: false,
            curriculumId: null,
            curriculumName: "",
          });
        }
      } catch (error: any) {
        console.error("Failed to delete curriculum:", error);
        setErrorModal({
          isOpen: true,
          message: `Failed to delete curriculum: ${error.message || "Network error"}`,
          details: "Please check your connection and try again.",
        });
        setDeleteConfirmation({
          isOpen: false,
          curriculumId: null,
          curriculumName: "",
        });
      }
    }
  };

  const handleViewCurriculum = (curriculum: Curriculum) => {
    setSelectedCurriculum(curriculum);
  };

  // If editing, show only the edit page
  if (editingCurriculum) {
    return (
      <EditCurriculumPage
        curriculum={editingCurriculum}
        onSave={async (curriculumData: Curriculum) => {
          await handleSaveCurriculum(curriculumData);
        }}
        onCancel={() => {
          setEditingCurriculum(null);
        }}
      />
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
              Curriculum Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Define and maintain academic programs, course offerings, credit
              units, and prerequisite subjects
            </p>
          </div>
          <button
            onClick={() => router.push("/curriculum/new")}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Curriculum</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className='space-y-4'>
          <SearchFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder='Search curriculum...'
          />
          
          {/* Status Tabs */}
          <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-2'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium text-gray-600 px-2'>Status:</span>
              <div className='flex gap-2 flex-1'>
                <button
                  onClick={() => setStatusFilter("active")}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === "active"
                      ? "text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  style={
                    statusFilter === "active"
                      ? { backgroundColor: colors.secondary }
                      : {}
                  }
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter("inactive")}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === "inactive"
                      ? "text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  style={
                    statusFilter === "inactive"
                      ? { backgroundColor: colors.secondary }
                      : {}
                  }
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Curriculum List */}
        {filteredCurriculum.length === 0 ? (
          <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center'>
            <div className='flex flex-col items-center justify-center gap-4'>
              <div
                className='p-4 rounded-full'
                style={{ backgroundColor: `${colors.primary}05` }}
              >
                <GraduationCap
                  className='w-12 h-12'
                  style={{ color: colors.primary }}
                />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  No Curriculum Found
                </h3>
                <p className='text-gray-600 mb-4'>
                  Get started by creating your first curriculum program
                </p>
                <button
                  onClick={() => router.push("/curriculum/new")}
                  className='flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all mx-auto'
                  style={{ backgroundColor: colors.secondary }}
                >
                  <Plus className='w-4 h-4' />
                  <span>Create Curriculum</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
            <div className='space-y-4 p-6'>
              {paginatedCurriculum.map((curriculum) => (
              <div
                key={curriculum.id}
                className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'
              >
                <div className='p-6'>
                  <div className='flex items-start justify-between mb-4'>
                    <div>
                      <h3
                        className='text-xl font-bold mb-1'
                        style={{ color: colors.primary }}
                      >
                        {curriculum.program_name}
                      </h3>
                      <div className='flex items-center gap-4 text-sm text-gray-600'>
                        <span>
                          <strong>Code:</strong> {curriculum.program_code}
                        </span>
                        {curriculum.major && (
                          <span>
                            <strong>Major:</strong> {curriculum.major}
                          </span>
                        )}
                        <span>
                          <strong>Effective:</strong>{" "}
                          {curriculum.effective_year}
                        </span>
                        <span>
                          <strong>Total Units:</strong> {curriculum.total_units}
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={() => handleViewCurriculum(curriculum)}
                        className='flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium'
                        style={{
                          color: colors.primary,
                          border: `1px solid ${colors.primary}20`,
                          backgroundColor: `${colors.primary}05`,
                        }}
                      >
                        <FileText className='w-4 h-4' />
                        View Prospectus
                      </button>
                      <button
                        onClick={() => setEditingCurriculum(curriculum)}
                        className='p-2 rounded-lg hover:bg-gray-100 transition-all text-blue-600'
                        title='Edit'
                      >
                        <Edit2 className='w-4 h-4' />
                      </button>
                      <button
                        onClick={() => handleDeleteCurriculum(curriculum.id)}
                        className='p-2 rounded-lg hover:bg-gray-100 transition-all text-red-600'
                        title='Delete'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
                    </div>
                  </div>
                  <div
                    className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border'
                    style={{
                      backgroundColor:
                        curriculum.status === "active" ? "#ECFDF5" : "#F3F4F6",
                      color:
                        curriculum.status === "active" ? "#047857" : "#374151",
                      borderColor:
                        curriculum.status === "active" ? "#A7F3D0" : "#E5E7EB",
                    }}
                  >
                    {curriculum.status.charAt(0).toUpperCase() +
                      curriculum.status.slice(1)}
                  </div>
                </div>
              </div>
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredCurriculum.length}
              itemName='curriculums'
              onPageChange={handlePageChange}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}

        {/* Curriculum Detail View */}
        {selectedCurriculum && (
          <CurriculumTable
            curriculum={selectedCurriculum}
            onClose={() => setSelectedCurriculum(null)}
          />
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteConfirmation.isOpen}
          onClose={() =>
            setDeleteConfirmation({
              isOpen: false,
              curriculumId: null,
              curriculumName: "",
            })
          }
          onConfirm={confirmDeleteCurriculum}
          title='Delete Curriculum'
          message={`Are you sure you want to delete "${deleteConfirmation.curriculumName}"?`}
          description='This action cannot be undone. All associated data will be permanently removed.'
          confirmText='Delete Curriculum'
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

export default CurriculumManagement;
