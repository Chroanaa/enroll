"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Department, Building } from "../../../types";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SuccessModal from "../../common/SuccessModal";
import ErrorModal from "../../common/ErrorModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import DepartmentTable from "./DepartmentTable";
import DepartmentForm from "./DepartmentForm";
import { filterDepartments } from "./utils";
import { getDepartments } from "@/app/utils/departmentUtils";
import { getBuildings } from "@/app/utils/getBuildings";
import { insertIntoReports } from "@/app/utils/reportsUtils";
import { useSession } from "next-auth/react";
const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const { data: session } = useSession();
  React.useEffect(() => {
    async function fetchData() {
      try {
        const [departmentsData, buildingsData] = await Promise.all([
          getDepartments(),
          getBuildings(),
        ]);
        const buildingsArray: Building[] = Array.isArray(buildingsData)
          ? buildingsData
          : Object.values(buildingsData);
        setBuildings(buildingsArray);
        const departmentsArray: Department[] = Array.isArray(departmentsData)
          ? departmentsData
          : Object.values(departmentsData);
        setDepartments(
          departmentsArray.map((department) => ({
            ...department,
            buildingName:
              buildingsArray.find((b) => b.id === department.building_id)
                ?.name || "",
          })),
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
    fetchData();
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    departmentId: number | null;
    departmentName: string;
  }>({
    isOpen: false,
    departmentId: null,
    departmentName: "",
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

  const filteredDepartments = useMemo(
    () => filterDepartments(departments, searchTerm, statusFilter),
    [departments, searchTerm, statusFilter],
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDepartments = filteredDepartments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveDepartment = async (departmentData: Department) => {
    try {
      if (editingDepartment) {
        const response = await fetch("/api/auth/department", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(departmentData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update department");
        }

        const buildingName =
          buildings.find((b) => b.id === departmentData.building_id)?.name ||
          "";
        setDepartments((prev) =>
          prev.map((d) =>
            d.id === departmentData.id
              ? { ...departmentData, buildingName }
              : d,
          ),
        );
        setEditingDepartment(null);
        setSuccessModal({
          isOpen: true,
          message: `Department "${departmentData.name}" has been updated successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Edited the Department ${departmentData.name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      } else {
        const response = await fetch("/api/auth/department", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(departmentData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create department");
        }

        const newDepartment = await response.json();
        const buildingName =
          buildings.find((b) => b.id === departmentData.building_id)?.name ||
          "";
        setDepartments((prev) => [
          ...prev,
          { ...departmentData, id: newDepartment.id, buildingName },
        ]);
        setIsAddModalOpen(false);
        setSuccessModal({
          isOpen: true,
          message: `Department "${departmentData.name}" has been created successfully.`,
        });
        insertIntoReports({
          action: `User ${session?.user.name} Created the Department ${departmentData.name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      }
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message:
          error.message || "An error occurred while saving the department.",
        details: "Please check your input and try again.",
      });
    }
  };

  const handleDeleteDepartment = (id: number) => {
    const department = departments.find((d) => d.id === id);
    if (department) {
      setDeleteConfirmation({
        isOpen: true,
        departmentId: id,
        departmentName: department.name,
      });
    }
  };

  const confirmDeleteDepartment = async () => {
    if (deleteConfirmation.departmentId) {
      try {
        const response = await fetch("/api/auth/department", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deleteConfirmation.departmentId),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete department");
        }

        setDepartments((prev) =>
          prev.filter((d) => d.id !== deleteConfirmation.departmentId),
        );
        setDeleteConfirmation({
          isOpen: false,
          departmentId: null,
          departmentName: "",
        });
        setSuccessModal({
          isOpen: true,
          message: `Department "${deleteConfirmation.departmentName}" has been deleted successfully.`,
        });
        insertIntoReports({
          action: `This Subject: ${deleteConfirmation.departmentName} Was deleted By ${session?.user.name}`,
          user_id: Number(session?.user.id),
          created_at: new Date(),
        });
      } catch (error: any) {
        setErrorModal({
          isOpen: true,
          message:
            error.message || "An error occurred while deleting the department.",
          details: "Please try again.",
        });
        setDeleteConfirmation({
          isOpen: false,
          departmentId: null,
          departmentName: "",
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
              Department Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage academic departments and their details
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Department</span>
          </button>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder='Search departments...'
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

        {/* Departments Table */}
        <div>
          <DepartmentTable
            departments={paginatedDepartments}
            onEdit={setEditingDepartment}
            onDelete={handleDeleteDepartment}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredDepartments.length}
            itemName='departments'
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>

        {/* Add/Edit Department Form */}
        {(isAddModalOpen || editingDepartment) && (
          <DepartmentForm
            department={editingDepartment}
            onSave={handleSaveDepartment}
            onCancel={() => {
              setEditingDepartment(null);
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
              departmentId: null,
              departmentName: "",
            })
          }
          onConfirm={confirmDeleteDepartment}
          title='Delete Department'
          message={`Are you sure you want to delete "${deleteConfirmation.departmentName}"?`}
          description='This action cannot be undone. All associated data will be permanently removed.'
          confirmText='Delete Department'
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

export default DepartmentManagement;
