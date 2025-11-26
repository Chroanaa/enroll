"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { colors } from "../../colors";
import { getEnrollments } from "@/app/utils/getEnrollments";
import ConfirmationModal from "../common/ConfirmationModal";
import { Enrollment, DeleteConfirmationState } from "../../types";
import { filterEnrollments, calculateStats } from "./utils";
import StatsCards from "./StatsCards";
import SearchFilters from "../common/SearchFilters";
import EnrollmentTable from "./EnrollmentTable";
import Pagination from "../common/Pagination";
import { BookOpen } from "lucide-react";
import { mockCourses } from "../../data/mockData";
import EnrollmentForm from "./EnrollmentForm";
import { getCountOfEnrolleesStatus } from "@/app/utils/getCountStatusEnrollees";
const EnrollmentManagement: React.FC = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | 1 | 2 | 3 | 4>(
    "all"
  );
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [isAddingEnrollment, setIsAddingEnrollment] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(
    null
  );
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<DeleteConfirmationState>({
      isOpen: false,
      enrollmentId: null,
      enrollmentName: "",
    });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [stats, setStats] = useState({
    total: 0,
    enrolled: 0,
    completed: 0,
    pending: 0,
    dropped: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getEnrollments();
        console.log("Fetched enrollments:", data);
        if (Array.isArray(data)) {
          setEnrollments(data as Enrollment[]);
        } else {
          console.error("Data is not an array:", data);
          setEnrollments([]);
        }
      } catch (error) {
        console.error("Error fetching enrollments:", error);
        setEnrollments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredEnrollments = useMemo(
    () =>
      filterEnrollments(enrollments, searchTerm, statusFilter, courseFilter),
    [enrollments, searchTerm, statusFilter, courseFilter]
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredEnrollments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEnrollments = filteredEnrollments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, courseFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveEnrollment = (enrollmentData: Enrollment) => {
    if (editingEnrollment) {
      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentData.id ? enrollmentData : e))
      );
      setEditingEnrollment(null);
    } else {
      setEnrollments((prev) => [...prev, enrollmentData]);
      setIsAddingEnrollment(false);
    }
  };

  const handleDeleteEnrollment = (enrollmentId: string) => {
    const enrollment = enrollments.find((e) => e.id === enrollmentId);
    if (enrollment) {
      const studentName = `${enrollment.first_name || ""} ${
        enrollment.family_name || ""
      }`.trim();
      setDeleteConfirmation({
        isOpen: true,
        enrollmentId: enrollmentId,
        enrollmentName: studentName || "this enrollment",
      });
    }
  };

  const confirmDeleteEnrollment = () => {
    if (deleteConfirmation.enrollmentId) {
      setEnrollments((prev) =>
        prev.filter((e) => e.id !== deleteConfirmation.enrollmentId)
      );
      setDeleteConfirmation({
        isOpen: false,
        enrollmentId: null,
        enrollmentName: "",
      });
      fetch("/api/auth/enroll", {
        method: "DELETE",
        body: JSON.stringify(deleteConfirmation.enrollmentId),
      });
    }
  };

  if (loading) {
    return (
      <div
        className='min-h-screen p-6 font-sans flex items-center justify-center'
        style={{ backgroundColor: colors.paper }}
      >
        <div className='text-center'>
          <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4'></div>
          <p className='text-gray-600'>Loading enrollments...</p>
        </div>
      </div>
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
              Enrollment Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage student course enrollments and track progress
            </p>
          </div>
          <button
            onClick={() => setIsAddingEnrollment(true)}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Enrollment</span>
          </button>
        </div>

        {/* Stats Cards */}
        <StatsCards />

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder='Search by student name or course...'
          filters={[
            {
              value: statusFilter,
              onChange: (value) =>
                setStatusFilter(
                  value === "all" ? "all" : (value as 1 | 2 | 3 | 4)
                ),
              options: [
                { value: "all", label: "All Status" },
                { value: 1, label: "Enrolled" },
                { value: 2, label: "Completed" },
                { value: 4, label: "Pending" },
                { value: 3, label: "Dropped" },
              ],
              placeholder: "All Status",
            },
            {
              value: courseFilter,
              onChange: (value) => setCourseFilter(String(value)),
              options: [
                { value: "all", label: "All Courses" },
                ...mockCourses.map((course) => ({
                  value: course.id,
                  label: `${course.code} - ${course.name}`,
                })),
              ],
              placeholder: "All Courses",
              icon: <BookOpen className='w-4 h-4 text-gray-500' />,
            },
          ]}
        />

        {/* Enrollments Table */}
        <div>
          <EnrollmentTable
            enrollments={paginatedEnrollments}
            onEdit={setEditingEnrollment}
            onDelete={handleDeleteEnrollment}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredEnrollments.length}
            itemName='enrollments'
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>

        {/* Add/Edit Enrollment Form */}
        {(isAddingEnrollment || editingEnrollment) && (
          <EnrollmentForm
            enrollment={editingEnrollment || undefined}
            onSave={handleSaveEnrollment}
            onCancel={() => {
              setEditingEnrollment(null);
              setIsAddingEnrollment(false);
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteConfirmation.isOpen}
          onClose={() =>
            setDeleteConfirmation({
              isOpen: false,
              enrollmentId: null,
              enrollmentName: "",
            })
          }
          onConfirm={confirmDeleteEnrollment}
          title='Delete Enrollment'
          message={`Are you sure you want to delete enrollment for "${deleteConfirmation.enrollmentName}"?`}
          description='This action cannot be undone. All associated data will be permanently removed.'
          confirmText='Delete Enrollment'
          cancelText='Cancel'
          variant='danger'
        />
      </div>
    </div>
  );
};

export default EnrollmentManagement;
