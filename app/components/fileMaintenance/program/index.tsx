"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Program, Department } from "../../../types";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SuccessModal from "../../common/SuccessModal";
import ErrorModal from "../../common/ErrorModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import ProgramTable from "./ProgramTable";
import ProgramForm from "./ProgramForm";
import { filterPrograms } from "./utils";
import { getPrograms } from "@/app/utils/programUtils";
import { getDepartments } from "@/app/utils/departmentUtils";
import { insertIntoReports } from "@/app/utils/reportsUtils";
import { useSession } from "next-auth/react";
import { invalidateRelatedCaches } from "@/app/utils/cache";
const ProgramManagement: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [programsData, departmentsData] = await Promise.all([
          getPrograms(),
          getDepartments(),
        ]);
        const departmentsArray: Department[] = Array.isArray(departmentsData)
          ? departmentsData
          : (Object.values(departmentsData) as Department[]);
        setDepartments(departmentsArray);
        const programsArray: Program[] = Array.isArray(programsData)
          ? programsData
          : (Object.values(programsData) as Program[]);
        const programsWithDeptNames = programsArray.map((program) => ({
          ...program,
          departmentName: program.department_id
            ? departmentsArray.find((d) => d.id === program.department_id)
                ?.name || ""
            : "",
        }));
        setPrograms(programsWithDeptNames);
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
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
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

  const filteredPrograms = useMemo(
    () => filterPrograms(programs, searchTerm, statusFilter),
    [programs, searchTerm, statusFilter],
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

  const handleSaveProgram = async (programData: Program) => {
    try {
      if (editingProgram) {
        const response = await fetch("/api/auth/program", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(programData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update program");
        }

        const departmentName =
          departments.find((d) => d.id === programData.department_id)?.name ||
          "";
        setPrograms((prev) =>
          prev.map((p) =>
            p.id === programData.id ? { ...programData, departmentName } : p,
          ),
        );
        invalidateRelatedCaches("PROGRAMS");
        setEditingProgram(null);
        setSuccessModal({
          isOpen: true,
          message: `Program "${programData.name}" has been updated successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Edited the Program ${programData.name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      } else {
        const response = await fetch("/api/auth/program", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(programData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create program");
        }

        const newProgram = await response.json();
        const departmentName =
          departments.find((d) => d.id === programData.department_id)?.name ||
          "";
        setPrograms((prev) => [
          ...prev,
          { ...programData, id: newProgram.id, departmentName },
        ]);
        invalidateRelatedCaches("PROGRAMS");
        setIsAddModalOpen(false);
        setSuccessModal({
          isOpen: true,
          message: `Program "${programData.name}" has been created successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Created the Program ${programData.name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      }
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: error.message || "An error occurred while saving the program.",
        details: "Please check your input and try again.",
      });
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

  const confirmDeleteProgram = async () => {
    if (deleteConfirmation.programId) {
      try {
        const response = await fetch("/api/auth/program", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deleteConfirmation.programId),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete program");
        }

        setPrograms((prev) =>
          prev.filter((p) => p.id !== deleteConfirmation.programId),
        );
        invalidateRelatedCaches("PROGRAMS");
        setDeleteConfirmation({
          isOpen: false,
          programId: null,
          programName: "",
        });
        setSuccessModal({
          isOpen: true,
          message: `Program "${deleteConfirmation.programName}" has been deleted successfully.`,
        });
        insertIntoReports({
          action: `This Subject: ${deleteConfirmation.programName} Was deleted By ${session?.user.name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      } catch (error: any) {
        setErrorModal({
          isOpen: true,
          message:
            error.message || "An error occurred while deleting the program.",
          details: "Please try again.",
        });
        setDeleteConfirmation({
          isOpen: false,
          programId: null,
          programName: "",
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

        {/* Programs Table */}
        <div>
          <ProgramTable
            programs={paginatedPrograms}
            onEdit={setEditingProgram}
            onDelete={handleDeleteProgram}
            isLoading={isLoading}
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

export default ProgramManagement;
