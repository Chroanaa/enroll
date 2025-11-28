"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Department } from "../../../types";
import { mockDepartments, mockBuildings } from "../../../data/mockData";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import DepartmentTable from "./DepartmentTable";
import DepartmentForm from "./DepartmentForm";
import { filterDepartments } from "./utils";
import { getDepartments } from "@/app/utils/departmentUtils";
const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  React.useEffect(() => {
    async function fetchData() {
      const data = await getDepartments();
      setDepartments(
        Object.values(data).map((department) => ({
          ...department,
          buildingName:
            mockBuildings.find((b) => b.id === department.building_id)?.name ||
            "",
        }))
      );
    }
    fetchData();
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredDepartments = useMemo(
    () => filterDepartments(departments, searchTerm, statusFilter),
    [departments, searchTerm, statusFilter]
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

  const handleSaveDepartment = (departmentData: Department) => {
    if (editingDepartment) {
      setDepartments((prev) =>
        prev.map((d) => (d.id === departmentData.id ? departmentData : d))
      );
      setEditingDepartment(null);
      fetch("/api/auth/department", {
        method: "PATCH",
        body: JSON.stringify(departmentData),
      });
    } else {
      setDepartments((prev) => [...prev, departmentData]);
      setIsAddModalOpen(false);
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

  const confirmDeleteDepartment = () => {
    if (deleteConfirmation.departmentId) {
      setDepartments((prev) =>
        prev.filter((d) => d.id !== deleteConfirmation.departmentId)
      );
      setDeleteConfirmation({
        isOpen: false,
        departmentId: null,
        departmentName: "",
      });
      fetch("/api/auth/department", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deleteConfirmation.departmentId),
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
      </div>
    </div>
  );
};

export default DepartmentManagement;
