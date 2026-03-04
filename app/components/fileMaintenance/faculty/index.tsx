"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Faculty, Department } from "../../../types";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SuccessModal from "../../common/SuccessModal";
import ErrorModal from "../../common/ErrorModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import FacultyTable from "./FacultyTable";
import FacultyForm from "./FacultyForm";
import { filterFaculty } from "./utils";
import { getFaculties } from "@/app/utils/facultyUtils";
import { getDepartments } from "@/app/utils/departmentUtils";
import { insertIntoReports } from "@/app/utils/reportsUtils";
import { useSession } from "next-auth/react";
import { invalidateRelatedCaches } from "@/app/utils/cache";
const FacultyManagement: React.FC = () => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [facultyData, departmentsData] = await Promise.all([
          getFaculties(),
          getDepartments(),
        ]);
        const departmentsArray: Department[] = Array.isArray(departmentsData)
          ? departmentsData
          : Object.values(departmentsData);
        setDepartments(departmentsArray);
        const facultyArray: Faculty[] = Array.isArray(facultyData)
          ? facultyData
          : Object.values(facultyData);
        const facultyWithDepartmentNames = facultyArray.map((fac) => ({
          ...fac,
          departmentName:
            departmentsArray.find((d) => d.id === fac.department_id)?.name ||
            "",
        }));
        setFaculty(facultyWithDepartmentNames);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
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

  const filteredFaculty = useMemo(
    () => filterFaculty(faculty, searchTerm, statusFilter, positionFilter),
    [faculty, searchTerm, statusFilter, positionFilter],
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

  const handleSaveFaculty = async (facultyData: Faculty) => {
    try {
      if (editingFaculty) {
        const response = await fetch("/api/auth/faculty", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(facultyData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update faculty");
        }

        const departmentName =
          departments.find((d) => d.id === facultyData.department_id)?.name ||
          "";
        setFaculty((prev) =>
          prev.map((f) =>
            f.id === facultyData.id ? { ...facultyData, departmentName } : f,
          ),
        );
        invalidateRelatedCaches("FACULTIES");
        setEditingFaculty(null);
        setSuccessModal({
          isOpen: true,
          message: `Faculty "${facultyData.first_name} ${facultyData.last_name}" has been updated successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Edited the faculty ${facultyData.first_name} ${facultyData.last_name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      } else {
        const response = await fetch("/api/auth/faculty", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(facultyData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create faculty");
        }

        const newFaculty = await response.json();
        const departmentName =
          departments.find((d) => d.id === facultyData.department_id)?.name ||
          "";
        setFaculty((prev) => [
          ...prev,
          { ...facultyData, id: newFaculty.id, departmentName },
        ]);
        invalidateRelatedCaches("FACULTIES");
        setIsAddModalOpen(false);
        setSuccessModal({
          isOpen: true,
          message: `Faculty "${facultyData.first_name} ${facultyData.last_name}" has been created successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Created the faculty ${facultyData.first_name} ${facultyData.last_name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      }
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || "An error occurred while saving the faculty.",
        details: "Please check your input and try again.",
      });
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

  const confirmDeleteFaculty = async () => {
    if (deleteConfirmation.facultyId) {
      try {
        const response = await fetch("/api/auth/faculty", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: deleteConfirmation.facultyId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete faculty");
        }

        setFaculty((prev) =>
          prev.filter((f) => f.id !== deleteConfirmation.facultyId),
        );
        invalidateRelatedCaches("FACULTIES");
        setDeleteConfirmation({
          isOpen: false,
          facultyId: null,
          facultyName: "",
        });
        setSuccessModal({
          isOpen: true,
          message: `Faculty "${deleteConfirmation.facultyName}" has been deleted successfully.`,
        });
        insertIntoReports({
          action: `This Subject: ${deleteConfirmation.facultyName} Was deleted By ${session?.user.name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      } catch (error: any) {
        setErrorModal({
          isOpen: true,
          message:
            error.message || "An error occurred while deleting the faculty.",
          details: "Please try again.",
        });
        setDeleteConfirmation({
          isOpen: false,
          facultyId: null,
          facultyName: "",
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

        {/* Faculty Table */}
        <div>
          <FacultyTable
            faculty={paginatedFaculty}
            onEdit={setEditingFaculty}
            onDelete={handleDeleteFaculty}
            isLoading={isLoading}
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

export default FacultyManagement;
