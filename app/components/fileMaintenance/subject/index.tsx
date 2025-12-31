"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Subject, Department } from "../../../types";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SuccessModal from "../../common/SuccessModal";
import ErrorModal from "../../common/ErrorModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import SubjectTable from "./SubjectTable";
import SubjectForm from "./SubjectForm";
import { filterSubjects } from "./utils";
import { getSubjects } from "@/app/utils/subjectUtils";
import { getDepartments } from "@/app/utils/departmentUtils";
import { insertIntoReports } from "@/app/utils/reportsUtils";
import { useSession } from "next-auth/react";
const SubjectManagement: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>();
  const [departments, setDepartments] = useState<Department[]>([]);
  const { data: session } = useSession();
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subjectsData, departmentsData] = await Promise.all([
          getSubjects(),
          getDepartments(),
        ]);
        const departmentsArray: Department[] = Array.isArray(departmentsData)
          ? departmentsData
          : (Object.values(departmentsData) as Department[]);
        setDepartments(departmentsArray);
        const subjectsArray: Subject[] = Array.isArray(subjectsData)
          ? subjectsData
          : (Object.values(subjectsData) as Subject[]);
        setSubjects(
          subjectsArray.map((subject) => ({
            ...subject,
            departmentName:
              departmentsArray.find((d) => d.id === subject.department_id)
                ?.name || "",
          }))
        );
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
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    subjectId: number | null;
    subjectName: string;
  }>({
    isOpen: false,
    subjectId: null,
    subjectName: "",
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

        const departmentName =
          departments.find((d) => d.id === subjectData.department_id)?.name ||
          "";
        setSubjects((prev) =>
          (prev || []).map((s) =>
            s.id === subjectData.id ? { ...subjectData, departmentName } : s
          )
        );
        setEditingSubject(null);
        setSuccessModal({
          isOpen: true,
          message: `Subject "${subjectData.name}" has been updated successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Edited the Subject ${subjectData.name}`,
          user_id: Number(session?.user.id),
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
        const departmentName =
          departments.find((d) => d.id === subjectData.department_id)?.name ||
          "";
        setSubjects((prev) => [
          ...(prev || []),
          { ...subjectData, id: newSubject.id, departmentName },
        ]);
        setIsAddModalOpen(false);
        setSuccessModal({
          isOpen: true,
          message: `Subject "${subjectData.name}" has been created successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Created the Subject ${subjectData.name}`,
          user_id: Number(session?.user.id),
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
          (prev || []).filter((s) => s.id !== deleteConfirmation.subjectId)
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
