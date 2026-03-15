"use client";
import React, { useState, useMemo, useEffect } from "react";
import { FileBarChart } from "lucide-react";
import { colors } from "../colors";
import { Reports as Report } from "../types";
import { getReports } from "../../app/utils/getReports";
import ConfirmationModal from "./common/ConfirmationModal";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";
import SearchFilters from "./common/SearchFilters";
import ReportsTable from "./reports/ReportsTable";
import Pagination from "./common/Pagination";

const ReportManagement: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    reportId: number | null;
  }>({
    isOpen: false,
    reportId: null,
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getReports();
        if (Array.isArray(data)) {
          setReports(data);
        } else {
          console.error("Data is not an array:", data);
          setReports([]);
        }
      } catch (error) {
        console.error("Error fetching reports:", error);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredReports = useMemo(() => {
    if (!searchTerm) return reports;

    const search = searchTerm.toLowerCase();
    return reports.filter(
      (report) =>
        report.action?.toLowerCase().includes(search) ||
        report.username?.toLowerCase().includes(search) ||
        report.user_id?.toString().includes(search) ||
        report.id?.toString().includes(search),
    );
  }, [reports, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteReport = (reportId: number) => {
    setDeleteConfirmation({
      isOpen: true,
      reportId: reportId,
    });
  };

  const confirmDeleteReport = async () => {
    if (deleteConfirmation.reportId) {
      try {
        const response = await fetch("/api/auth/reports", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deleteConfirmation.reportId),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete report");
        }

        setReports((prev) =>
          prev.filter((r) => r.id !== deleteConfirmation.reportId),
        );
        setDeleteConfirmation({
          isOpen: false,
          reportId: null,
        });
        setSuccessModal({
          isOpen: true,
          message: "Report has been deleted successfully.",
        });
      } catch (error: any) {
        setErrorModal({
          isOpen: true,
          message:
            error.message || "An error occurred while deleting the report.",
          details: "Please try again.",
        });
        setDeleteConfirmation({
          isOpen: false,
          reportId: null,
        });
      }
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
          <p className='text-gray-600'>Loading reports...</p>
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
              Report Management
            </h1>
            <p className='text-gray-500 mt-1'>
              View and manage system activity reports
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder='Search by action, username, or report ID...'
        />

        {/* Reports Table */}
        <div>
          <ReportsTable
            reports={paginatedReports}
            onDelete={handleDeleteReport}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredReports.length}
            itemName='reports'
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={deleteConfirmation.isOpen}
          title='Delete Report'
          message='Are you sure you want to delete this report? This action cannot be undone.'
          confirmText='Delete'
          cancelText='Cancel'
          onConfirm={confirmDeleteReport}
          onClose={() =>
            setDeleteConfirmation({ isOpen: false, reportId: null })
          }
          variant='danger'
        />

        {/* Success Modal */}
        <SuccessModal
          isOpen={successModal.isOpen}
          message={successModal.message}
          onClose={() => setSuccessModal({ isOpen: false, message: "" })}
        />

        {/* Error Modal */}
        <ErrorModal
          isOpen={errorModal.isOpen}
          message={errorModal.message}
          details={errorModal.details}
          onClose={() =>
            setErrorModal({ isOpen: false, message: "", details: "" })
          }
        />
      </div>
    </div>
  );
};

export default ReportManagement;
