"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Search, Filter } from "lucide-react";
import { Subject } from "../../../types";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SuccessModal from "../../common/SuccessModal";
import ErrorModal from "../../common/ErrorModal";
import Pagination from "../../common/Pagination";
import SubjectTable from "./SubjectTable";
import SubjectForm from "./SubjectForm";
import MultipleSubjectForm from "./MultipleSubjectForm";
import { filterSubjects } from "./utils";
import { getSubjects } from "@/app/utils/subjectUtils";
import { getDepartments } from "@/app/utils/departmentUtils";
import { insertIntoReports } from "@/app/utils/reportsUtils";
import { useSession } from "next-auth/react";
import { Department } from "../../../types";
const SubjectManagement: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>();
  const [departments, setDepartments] = useState<Department[]>([]);
  const { data: session } = useSession();
  useEffect(() => {
    const fetchData = async () => {
      try {
        const subjectsData = await getSubjects();
        const subjectsArray: Subject[] = Array.isArray(subjectsData)
          ? subjectsData
          : (Object.values(subjectsData) as Subject[]);
        setSubjects(subjectsArray);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMultipleModalOpen, setIsMultipleModalOpen] = useState(false);
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    subjectId: number | null;
    subjectName: string;
  }>({
    isOpen: false,
    subjectId: null,
    subjectName: "",
  });
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState<{
    isOpen: boolean;
    subjectIds: number[];
  }>({
    isOpen: false,
    subjectIds: [],
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

  const filteredSubjects = useMemo(
    () => filterSubjects(subjects || [], searchTerm, statusFilter),
    [subjects, searchTerm, statusFilter],
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

  // Clear selection when filters change or checkboxes are hidden
  useEffect(() => {
    if (!showCheckboxes) {
      setSelectedSubjects([]);
    }
  }, [searchTerm, statusFilter, showCheckboxes]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveMultipleSubjects = async (
    subjectsData: Omit<Subject, "id">[],
  ) => {
    try {
      const response = await fetch("/api/auth/subject/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subjectsData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create subjects");
      }

      const newSubjects = await response.json();
      // Filter out duplicates by ID to prevent duplicate keys
      setSubjects((prev) => {
        const existingIds = new Set((prev || []).map((s) => s.id));
        const uniqueNewSubjects = newSubjects.filter(
          (s: Subject) => !existingIds.has(s.id),
        );
        return [...(prev || []), ...uniqueNewSubjects];
      });
      setIsMultipleModalOpen(false);
      setSuccessModal({
        isOpen: true,
        message: `${newSubjects.length} subject(s) have been created successfully.`,
      });
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message:
          error.message || "An error occurred while saving the subjects.",
        details: "Please check your input and try again.",
      });
    }
  };

  const handleSaveSubject = async (subjectData: Subject) => {
    try {
      if (editingSubject) {
        const response = await fetch("/api/auth/subject", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subjectData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update subject");
        }

        setSubjects((prev) =>
          (prev || []).map((s) => (s.id === subjectData.id ? subjectData : s)),
        );
        setEditingSubject(null);
        setSuccessModal({
          isOpen: true,
          message: `Subject "${subjectData.name}" has been updated successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Edited the Subject ${subjectData.name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      } else {
        const response = await fetch("/api/auth/subject", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subjectData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create subject");
        }

        const newSubject = await response.json();
        setSubjects((prev) => [
          ...(prev || []),
          { ...subjectData, id: newSubject.id },
        ]);
        setIsAddModalOpen(false);
        setSuccessModal({
          isOpen: true,
          message: `Subject "${subjectData.name}" has been created successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Created the Subject ${subjectData.name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      }
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || "An error occurred while saving the subject.",
        details: "Please check your input and try again.",
      });
    }
  };

  const handleDeleteSubject = (id: number) => {
    const subject = (subjects || []).find((s) => s.id === id);
    if (subject) {
      setDeleteConfirmation({
        isOpen: true,
        subjectId: id,
        subjectName: subject.name,
      });
    }
  };

  const handleDeleteAllClick = () => {
    setShowCheckboxes(true);
  };

  const handleCancelDeleteAll = () => {
    setShowCheckboxes(false);
    setSelectedSubjects([]);
  };

  const confirmBulkDeleteSubjects = async () => {
    if (bulkDeleteConfirmation.subjectIds.length > 0) {
      try {
        // Delete all selected subjects
        const deletePromises = bulkDeleteConfirmation.subjectIds.map((id) =>
          fetch("/api/auth/subject", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(id),
          }),
        );

        const results = await Promise.all(deletePromises);
        const failed = results.filter((r) => !r.ok);

        if (failed.length > 0) {
          throw new Error(
            `Failed to delete ${failed.length} out of ${bulkDeleteConfirmation.subjectIds.length} subject(s)`,
          );
        }

        setSubjects((prev) =>
          (prev || []).filter(
            (s) => !bulkDeleteConfirmation.subjectIds.includes(s.id),
          ),
        );
        setSelectedSubjects([]);
        setShowCheckboxes(false);
        setBulkDeleteConfirmation({
          isOpen: false,
          subjectIds: [],
        });
        setSuccessModal({
          isOpen: true,
          message: `${bulkDeleteConfirmation.subjectIds.length} subject(s) have been deleted successfully.`,
        });
      } catch (error: any) {
        setErrorModal({
          isOpen: true,
          message:
            error.message || "An error occurred while deleting the subjects.",
          details: "Please try again.",
        });
        setBulkDeleteConfirmation({
          isOpen: false,
          subjectIds: [],
        });
      }
    }
  };

  const confirmDeleteSubject = async () => {
    if (deleteConfirmation.subjectId) {
      try {
        const response = await fetch("/api/auth/subject", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deleteConfirmation.subjectId),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete subject");
        }

        setSubjects((prev) =>
          (prev || []).filter((s) => s.id !== deleteConfirmation.subjectId),
        );
        setDeleteConfirmation({
          isOpen: false,
          subjectId: null,
          subjectName: "",
        });
        setSuccessModal({
          isOpen: true,
          message: `Subject "${deleteConfirmation.subjectName}" has been deleted successfully.`,
        });
        insertIntoReports({
          action: `This Subject: ${deleteConfirmation.subjectName} Was deleted By ${session?.user.name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      } catch (error: any) {
        setErrorModal({
          isOpen: true,
          message:
            error.message || "An error occurred while deleting the subject.",
          details: "Please try again.",
        });
        setDeleteConfirmation({
          isOpen: false,
          subjectId: null,
          subjectName: "",
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
              Subject Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage academic subjects and their details
            </p>
          </div>
          <div className='flex gap-3'>
            <button
              onClick={() => setIsMultipleModalOpen(true)}
              className='flex items-center gap-2 px-4 py-2.5 text-white rounded-lg transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95'
              style={{ backgroundColor: colors.tertiary }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = colors.primary)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = colors.tertiary)
              }
            >
              <Plus className='w-4 h-4' />
              <span className='text-sm font-medium'>Add Multiple</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
              style={{ backgroundColor: colors.secondary }}
            >
              <Plus className='w-5 h-5' />
              <span className='font-medium'>Add Subject</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className='space-y-4'>
          <div className='bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between'>
            <div className='relative flex-1 w-full md:max-w-md'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
              <input
                type='text'
                placeholder='Search subjects...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-0 transition-all'
                style={{
                  outline: "none",
                  color: "var(--text-brown)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.tertiary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#E5E7EB";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <div className='flex items-center gap-3 w-full md:w-auto'>
              <div className='flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50'>
                <Filter className='w-4 h-4 text-gray-500' />
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value === "all"
                        ? "all"
                        : (e.target.value as "active" | "inactive"),
                    )
                  }
                  className='bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer'
                  style={{
                    outline: "none",
                    color: "#6B5B4F",
                  }}
                >
                  <option value='all'>All Status</option>
                  <option value='active'>Active</option>
                  <option value='inactive'>Inactive</option>
                </select>
              </div>
              <button
                onClick={handleDeleteAllClick}
                className='flex items-center gap-2 px-4 py-2.5 text-white rounded-lg transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95'
                style={{ backgroundColor: "#DC2626" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#B91C1C")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#DC2626")
                }
              >
                <Trash2 className='w-4 h-4' />
                <span className='text-sm font-medium'>Delete All</span>
              </button>
            </div>
          </div>
          {showCheckboxes && (
            <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200'>
              <span className='text-sm font-medium text-gray-700'>
                {selectedSubjects.length > 0
                  ? `${selectedSubjects.length} subject(s) selected`
                  : "Select subjects to delete"}
              </span>
              <div className='flex gap-2'>
                {selectedSubjects.length > 0 && (
                  <button
                    onClick={() => {
                      setBulkDeleteConfirmation({
                        isOpen: true,
                        subjectIds: selectedSubjects,
                      });
                    }}
                    className='px-4 py-2 text-white rounded-lg transition-all text-sm font-medium flex items-center gap-2 shadow-md hover:shadow-lg'
                    style={{ backgroundColor: "#DC2626" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#B91C1C")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "#DC2626")
                    }
                  >
                    <Trash2 className='w-4 h-4' />
                    Delete Selected
                  </button>
                )}
                <button
                  onClick={handleCancelDeleteAll}
                  className='px-4 py-2 rounded-lg transition-all text-sm font-medium border border-gray-300 hover:bg-gray-100'
                  style={{ color: colors.primary }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Subjects Table */}
        <div>
          <SubjectTable
            subjects={paginatedSubjects}
            onEdit={setEditingSubject}
            onDelete={handleDeleteSubject}
            selectedSubjects={showCheckboxes ? selectedSubjects : []}
            onSelectionChange={showCheckboxes ? setSelectedSubjects : undefined}
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

        {/* Add Multiple Subjects Form */}
        {isMultipleModalOpen && (
          <MultipleSubjectForm
            onSave={handleSaveMultipleSubjects}
            onCancel={() => setIsMultipleModalOpen(false)}
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

        {/* Bulk Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={bulkDeleteConfirmation.isOpen}
          onClose={() =>
            setBulkDeleteConfirmation({
              isOpen: false,
              subjectIds: [],
            })
          }
          onConfirm={confirmBulkDeleteSubjects}
          title='Delete Multiple Subjects'
          message={`Are you sure you want to delete ${bulkDeleteConfirmation.subjectIds.length} subject(s)?`}
          description='This action cannot be undone. All associated data will be permanently removed.'
          confirmText='Delete Subjects'
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

export default SubjectManagement;
