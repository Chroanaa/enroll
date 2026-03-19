"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  Printer,
} from "lucide-react";
import { colors } from "../../colors";
import { getEnrollments } from "@/app/utils/getEnrollments";
import { cacheManager, CACHE_KEYS } from "@/app/utils/cache";
import SuccessModal from "../common/SuccessModal";
import ErrorModal from "../common/ErrorModal";
import { Enrollment } from "../../types";
import { ENROLLMENT_STATUS_OPTIONS, filterEnrollments } from "./utils";
import StatsCards from "./StatsCards";
import SearchFilters from "../common/SearchFilters";
import EnrollmentTable from "./EnrollmentTable";
import Pagination from "../common/Pagination";
import EnrollmentReportViewer from "./EnrollmentReportViewer";
import EnrollmentVerificationModal from "./EnrollmentVerificationModal";

// --- Internal Import Modal Component ---
interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  isLoading: boolean;
}

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  isLoading,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      if (formRef.current) formRef.current.reset();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (
      file.type.includes("sheet") ||
      file.type.includes("excel") ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".xlsx")
    ) {
      setSelectedFile(file);
    } else {
      alert("Please upload a valid Excel or CSV file.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default browser reload
    if (selectedFile) {
      await onUpload(selectedFile);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
      <div
        className='relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200'
        style={{ backgroundColor: colors.paper }}
      >
        {/* Header */}
        <div className='px-6 py-4 border-b flex justify-between items-center bg-gray-50/50'>
          <h3 className='text-xl font-bold text-gray-800 flex items-center gap-2'>
            <FileSpreadsheet className='w-5 h-5 text-green-600' />
            Import Enrollment Data
          </h3>
          <button
            type='button'
            onClick={onClose}
            className='p-1 rounded-full hover:bg-gray-200 transition-colors text-gray-500'
            disabled={isLoading}
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Form Wrapper */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          encType='multipart/form-data'
          className='flex flex-col'
        >
          {/* Body */}
          <div className='p-6 space-y-4'>
            <div
              className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 bg-gray-50 hover:bg-gray-100"
              } ${selectedFile ? "border-green-500 bg-green-50" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                name='file' // IMPORTANT for backend recognition
                type='file'
                className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                onChange={handleChange}
                accept='.xlsx,.xls,.csv'
                disabled={isLoading}
              />

              <div className='flex flex-col items-center text-center pointer-events-none p-4'>
                {selectedFile ? (
                  <>
                    <FileSpreadsheet className='w-12 h-12 text-green-600 mb-3' />
                    <p className='text-sm font-medium text-gray-900 truncate max-w-[250px]'>
                      {selectedFile.name}
                    </p>
                    <p className='text-xs text-green-600 mt-1'>
                      Ready to upload
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className='w-10 h-10 text-gray-400 mb-3' />
                    <p className='text-sm font-medium text-gray-700'>
                      Click to upload or drag and drop
                    </p>
                    <p className='text-xs text-gray-500 mt-1'>
                      Excel (.xlsx, .xls) or CSV files
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className='bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2'>
              <AlertCircle className='w-4 h-4 text-blue-600 mt-0.5 shrink-0' />
              <p className='text-xs text-blue-700'>
                Please ensure your file headers match the database schema (First
                Name, Last Name, Course, Status).
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className='px-6 py-4 border-t bg-gray-50/50 flex justify-end gap-3'>
            <button
              type='button' // Prevent form submission
              onClick={onClose}
              disabled={isLoading}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit' // Triggers onSubmit
              disabled={!selectedFile || isLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all flex items-center gap-2 ${
                !selectedFile || isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
              }`}
            >
              {isLoading ? (
                <>
                  <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                  Importing...
                </>
              ) : (
                <>Import Data</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Main Component ---

const EnrollmentManagement: React.FC = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | 1 | 2 | 3 | 4>(
    "all"
  );
  const [courseFilter, setCourseFilter] = useState<string>("all");

  // Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isReportViewerOpen, setIsReportViewerOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(
    null
  );
  const [verificationTab, setVerificationTab] = useState<"pending" | "verified">(
    "pending"
  );
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

  const fetchEnrollments = async () => {
    try {
      cacheManager.invalidate(CACHE_KEYS.ENROLLMENTS);
      const data = await getEnrollments();
      if (Array.isArray(data)) {
        setEnrollments(data as Enrollment[]);
      } else {
        setEnrollments([]);
      }
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const filteredEnrollments = useMemo(
    () =>
      filterEnrollments(enrollments, searchTerm, statusFilter, courseFilter),
    [enrollments, searchTerm, statusFilter, courseFilter]
  );

  const tabFilteredEnrollments = useMemo(() => {
    return filteredEnrollments.filter((enrollment: any) => {
      const verificationStatus = enrollment.verification_status || "pending";
      if (verificationTab === "pending") {
        return verificationStatus === "pending";
      }
      return verificationStatus !== "pending";
    });
  }, [filteredEnrollments, verificationTab]);

  // Pagination calculations
  const totalPages = Math.ceil(tabFilteredEnrollments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEnrollments = tabFilteredEnrollments.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, courseFilter, verificationTab]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- Import Logic ---
  const handleImportFile = async (file: File) => {
    setIsImporting(true);

    // NOTE: When using fetch with FormData, do NOT manually set Content-Type header.
    // The browser automatically sets it to multipart/form-data with the correct boundary.
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/auth/enroll/bulk", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import file");
      }

      await fetchEnrollments();

      setIsImportModalOpen(false);
      setSuccessModal({
        isOpen: true,
        message: "Excel file imported successfully!",
      });
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: "Import Failed",
        details: error.message || "Something went wrong processing the file.",
      });
    } finally {
      setIsImporting(false);
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
          <div className='flex gap-3'>
            <button
              onClick={() => setIsReportViewerOpen(true)}
              className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
              style={{ backgroundColor: colors.primary }}
            >
              <Printer className='w-5 h-5' />
              <span className='font-medium'>Generate Report</span>
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
              style={{ backgroundColor: colors.secondary }}
            >
              <FileSpreadsheet className='w-5 h-5' />
              <span className='font-medium'>Import Excel</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards />

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder='Search by student number, name, or course...'
          filters={[
            {
              value: statusFilter,
              onChange: (value) =>
                setStatusFilter(
                  value === "all" ? "all" : (value as 1 | 2 | 3 | 4)
                ),
              options: [...ENROLLMENT_STATUS_OPTIONS],
              placeholder: "All Status",
            },
          ]}
        />

        {/* Verification Tabs */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-2'>
          <div className='flex flex-wrap gap-2'>
            <button
              onClick={() => setVerificationTab("pending")}
              className='px-4 py-2 rounded-xl text-sm font-semibold transition-all'
              style={{
                backgroundColor:
                  verificationTab === "pending" ? `${colors.secondary}20` : "transparent",
                color: verificationTab === "pending" ? colors.primary : "#6B7280",
                border: `1px solid ${
                  verificationTab === "pending" ? `${colors.secondary}60` : "#E5E7EB"
                }`,
              }}
            >
              Pending Verification
            </button>
            <button
              onClick={() => setVerificationTab("verified")}
              className='px-4 py-2 rounded-xl text-sm font-semibold transition-all'
              style={{
                backgroundColor:
                  verificationTab === "verified" ? `${colors.secondary}20` : "transparent",
                color: verificationTab === "verified" ? colors.primary : "#6B7280",
                border: `1px solid ${
                  verificationTab === "verified" ? `${colors.secondary}60` : "#E5E7EB"
                }`,
              }}
            >
              Verified / Reviewed
            </button>
          </div>
        </div>

        {/* Enrollments Table */}
        <div>
          <EnrollmentTable
            enrollments={paginatedEnrollments}
            onSelect={setSelectedEnrollment}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={tabFilteredEnrollments.length}
            itemName='enrollments'
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
        {selectedEnrollment && (
          <EnrollmentVerificationModal
            enrollment={selectedEnrollment}
            onClose={() => setSelectedEnrollment(null)}
            onSaved={async () => {
              await fetchEnrollments();
            }}
            onVerified={async () => {
              await fetchEnrollments();
              setSuccessModal({
                isOpen: true,
                message: "Enrollment verification updated successfully.",
              });
            }}
          />
        )}

        {isReportViewerOpen && (
          <EnrollmentReportViewer
            enrollments={enrollments}
            onClose={() => setIsReportViewerOpen(false)}
          />
        )}

        {/* Import Excel Modal - NEW */}
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onUpload={handleImportFile}
          isLoading={isImporting}
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

export default EnrollmentManagement;
