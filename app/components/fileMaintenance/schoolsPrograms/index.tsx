"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus, School, GraduationCap } from "lucide-react";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import SuccessModal from "../../common/SuccessModal";
import ErrorModal from "../../common/ErrorModal";
import SearchFilters from "../../common/SearchFilters";
import Pagination from "../../common/Pagination";
import TableSkeleton from "../../common/TableSkeleton";
import SchoolTable from "./SchoolTable";
import SHSProgramTable from "./SHSProgramTable";
import SchoolForm from "./SchoolForm";
import SHSProgramForm from "./SHSProgramForm";
import { useSession } from "next-auth/react";
import { insertIntoReports } from "@/app/utils/reportsUtils";

export interface School {
  id: number;
  name: string;
  is_custom: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface SHSProgram {
  id: number;
  name: string;
  is_custom: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
}

const SchoolsProgramsManagement: React.FC = () => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"schools" | "programs">("schools");

  // Data states
  const [schools, setSchools] = useState<School[]>([]);
  const [programs, setPrograms] = useState<SHSProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<SHSProgram | null>(null);

  // Delete confirmation states
  const [deleteSchoolConfirmation, setDeleteSchoolConfirmation] = useState<{
    isOpen: boolean;
    schoolId: number | null;
    schoolName: string;
  }>({
    isOpen: false,
    schoolId: null,
    schoolName: "",
  });

  const [deleteProgramConfirmation, setDeleteProgramConfirmation] = useState<{
    isOpen: boolean;
    programId: number | null;
    programName: string;
  }>({
    isOpen: false,
    programId: null,
    programName: "",
  });

  // Modal states
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [schoolsResponse, programsResponse] = await Promise.all([
        fetch("/api/auth/enroll/schools"),
        fetch("/api/auth/enroll/shs-programs"),
      ]);

      if (schoolsResponse.ok) {
        const schoolsData = await schoolsResponse.json();
        setSchools(schoolsData.data || []);
      }

      if (programsResponse.ok) {
        const programsData = await programsResponse.json();
        setPrograms(programsData.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to load data",
        details: "Please try refreshing the page.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter schools
  const filteredSchools = useMemo(() => {
    if (!searchTerm) return schools;
    const searchLower = searchTerm.toLowerCase();
    return schools.filter((school) =>
      school.name?.toLowerCase().includes(searchLower),
    );
  }, [schools, searchTerm]);

  // Filter programs
  const filteredPrograms = useMemo(() => {
    if (!searchTerm) return programs;
    const searchLower = searchTerm.toLowerCase();
    return programs.filter((program) =>
      program.name?.toLowerCase().includes(searchLower),
    );
  }, [programs, searchTerm]);

  // Pagination calculations
  const paginatedSchools = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSchools.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSchools, currentPage, itemsPerPage]);

  const paginatedPrograms = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPrograms.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPrograms, currentPage, itemsPerPage]);

  const totalPagesSchools = Math.ceil(filteredSchools.length / itemsPerPage);
  const totalPagesPrograms = Math.ceil(filteredPrograms.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // School CRUD handlers
  const openSchoolModal = (school?: School) => {
    if (school) {
      setEditingSchool(school);
    } else {
      setEditingSchool(null);
    }
    setIsSchoolModalOpen(true);
  };

  const handleSaveSchool = async (school: School) => {
    setIsSubmitting(true);
    try {
      const url = "/api/auth/enroll/schools";
      const method = editingSchool ? "PUT" : "POST";
      const body = editingSchool
        ? { id: editingSchool.id, name: school.name }
        : { name: school.name };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save school");
      }

      const updateMessage = editingSchool
        ? `School "${school.name}" has been updated successfully. All enrollment records using this school have also been updated.`
        : `School "${school.name}" has been created successfully.`;
      
      setSuccessModal({
        isOpen: true,
        message: updateMessage,
      });
      insertIntoReports({
        action: `User ${session?.user?.name} ${
          editingSchool ? "updated" : "created"
        } school: ${school.name}`,
        user_id: Number(session?.user?.id),
        created_at: new Date(),
      });

      setIsSchoolModalOpen(false);
      setEditingSchool(null);
      fetchData();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: editingSchool
          ? "Failed to update school"
          : "Failed to create school",
        details: error.message || "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchool = async () => {
    if (!deleteSchoolConfirmation.schoolId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/auth/enroll/schools?id=${deleteSchoolConfirmation.schoolId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        const enrollmentCount = errorData.enrollmentCount || 0;
        if (enrollmentCount > 0) {
          setErrorModal({
            isOpen: true,
            message: "Cannot Delete School",
            details: `This school is currently being used in ${enrollmentCount} enrollment record(s). Please remove or update these enrollments before deleting the school.`,
          });
        } else {
          throw new Error(errorData.error || "Failed to delete school");
        }
        setDeleteSchoolConfirmation({
          isOpen: false,
          schoolId: null,
          schoolName: "",
        });
        return;
      }

      setSuccessModal({
        isOpen: true,
        message: `School "${deleteSchoolConfirmation.schoolName}" has been deleted.`,
      });
      insertIntoReports({
        action: `User ${session?.user?.name} deleted school: ${deleteSchoolConfirmation.schoolName}`,
        user_id: Number(session?.user?.id),
        created_at: new Date(),
      });
      setDeleteSchoolConfirmation({
        isOpen: false,
        schoolId: null,
        schoolName: "",
      });
      fetchData();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: "Failed to delete school",
        details: error.message || "Please try again.",
      });
      setDeleteSchoolConfirmation({
        isOpen: false,
        schoolId: null,
        schoolName: "",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Program CRUD handlers
  const openProgramModal = (program?: SHSProgram) => {
    if (program) {
      setEditingProgram(program);
    } else {
      setEditingProgram(null);
    }
    setIsProgramModalOpen(true);
  };

  const handleSaveProgram = async (program: SHSProgram) => {
    setIsSubmitting(true);
    try {
      const url = "/api/auth/enroll/shs-programs";
      const method = editingProgram ? "PUT" : "POST";
      const body = editingProgram
        ? { id: editingProgram.id, name: program.name }
        : { name: program.name };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save program");
      }

      const updateMessage = editingProgram
        ? `SHS Program "${program.name}" has been updated successfully. All enrollment records using this program have also been updated.`
        : `SHS Program "${program.name}" has been created successfully.`;
      
      setSuccessModal({
        isOpen: true,
        message: updateMessage,
      });
      insertIntoReports({
        action: `User ${session?.user?.name} ${
          editingProgram ? "updated" : "created"
        } SHS program: ${program.name}`,
        user_id: Number(session?.user?.id),
        created_at: new Date(),
      });

      setIsProgramModalOpen(false);
      setEditingProgram(null);
      fetchData();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: editingProgram
          ? "Failed to update program"
          : "Failed to create program",
        details: error.message || "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProgram = async () => {
    if (!deleteProgramConfirmation.programId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/auth/enroll/shs-programs?id=${deleteProgramConfirmation.programId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        const enrollmentCount = errorData.enrollmentCount || 0;
        if (enrollmentCount > 0) {
          setErrorModal({
            isOpen: true,
            message: "Cannot Delete SHS Program",
            details: `This program is currently being used in ${enrollmentCount} enrollment record(s). Please remove or update these enrollments before deleting the program.`,
          });
        } else {
          throw new Error(errorData.error || "Failed to delete program");
        }
        setDeleteProgramConfirmation({
          isOpen: false,
          programId: null,
          programName: "",
        });
        return;
      }

      setSuccessModal({
        isOpen: true,
        message: `SHS Program "${deleteProgramConfirmation.programName}" has been deleted.`,
      });
      insertIntoReports({
        action: `User ${session?.user?.name} deleted SHS program: ${deleteProgramConfirmation.programName}`,
        user_id: Number(session?.user?.id),
        created_at: new Date(),
      });
      setDeleteProgramConfirmation({
        isOpen: false,
        programId: null,
        programName: "",
      });
      fetchData();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: "Failed to delete program",
        details: error.message || "Please try again.",
      });
      setDeleteProgramConfirmation({
        isOpen: false,
        programId: null,
        programName: "",
      });
    } finally {
      setIsDeleting(false);
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
              Schools & SHS Programs
            </h1>
            <p className='text-gray-500 mt-1'>
              Manage schools and SHS programs for enrollment.
            </p>
          </div>
          <div className='flex gap-2'>
            <button
              onClick={() => setActiveTab("schools")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === "schools"
                  ? "text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={
                activeTab === "schools"
                  ? { backgroundColor: colors.secondary }
                  : {}
              }
            >
              <School className='w-4 h-4' />
              Schools
            </button>
            <button
              onClick={() => setActiveTab("programs")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === "programs"
                  ? "text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={
                activeTab === "programs"
                  ? { backgroundColor: colors.secondary }
                  : {}
              }
            >
              <GraduationCap className='w-4 h-4' />
              SHS Programs
            </button>
            <button
              onClick={() =>
                activeTab === "schools"
                  ? openSchoolModal()
                  : openProgramModal()
              }
              disabled={isSubmitting || isDeleting}
              className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
              style={{ backgroundColor: colors.secondary }}
            >
              <Plus className='w-5 h-5' />
              <span className='font-medium'>
                Add {activeTab === "schools" ? "School" : "Program"}
              </span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={`Search ${activeTab}...`}
          filters={[]}
        />

        {/* Schools Table */}
        {activeTab === "schools" && (
          <div>
            <SchoolTable
              schools={paginatedSchools}
              onEdit={openSchoolModal}
              onDelete={(id) => {
                const school = schools.find((s) => s.id === id);
                setDeleteSchoolConfirmation({
                  isOpen: true,
                  schoolId: id,
                  schoolName: school?.name || "",
                });
              }}
              isLoading={isLoading}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPagesSchools}
              itemsPerPage={itemsPerPage}
              totalItems={filteredSchools.length}
              itemName='schools'
              onPageChange={handlePageChange}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}

        {/* Programs Table */}
        {activeTab === "programs" && (
          <div>
            <SHSProgramTable
              programs={paginatedPrograms}
              onEdit={openProgramModal}
              onDelete={(id) => {
                const program = programs.find((p) => p.id === id);
                setDeleteProgramConfirmation({
                  isOpen: true,
                  programId: id,
                  programName: program?.name || "",
                });
              }}
              isLoading={isLoading}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPagesPrograms}
              itemsPerPage={itemsPerPage}
              totalItems={filteredPrograms.length}
              itemName='programs'
              onPageChange={handlePageChange}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}

        {/* School Form Modal */}
        {isSchoolModalOpen && (
          <SchoolForm
            school={editingSchool}
            onSave={handleSaveSchool}
            onCancel={() => {
              setIsSchoolModalOpen(false);
              setEditingSchool(null);
            }}
            isLoading={isSubmitting}
          />
        )}

        {/* Program Form Modal */}
        {isProgramModalOpen && (
          <SHSProgramForm
            program={editingProgram}
            onSave={handleSaveProgram}
            onCancel={() => {
              setIsProgramModalOpen(false);
              setEditingProgram(null);
            }}
            isLoading={isSubmitting}
          />
        )}

        {/* Delete Confirmation Modals */}
        <ConfirmationModal
          isOpen={deleteSchoolConfirmation.isOpen}
          onClose={() =>
            setDeleteSchoolConfirmation({
              isOpen: false,
              schoolId: null,
              schoolName: "",
            })
          }
          onConfirm={handleDeleteSchool}
          title='Delete School'
          message={`Are you sure you want to delete "${deleteSchoolConfirmation.schoolName}"?`}
          description='This action cannot be undone. Make sure this school is not being used in any enrollments.'
          confirmText='Delete'
          cancelText='Cancel'
          variant='danger'
          isLoading={isDeleting}
        />

        <ConfirmationModal
          isOpen={deleteProgramConfirmation.isOpen}
          onClose={() =>
            setDeleteProgramConfirmation({
              isOpen: false,
              programId: null,
              programName: "",
            })
          }
          onConfirm={handleDeleteProgram}
          title='Delete SHS Program'
          message={`Are you sure you want to delete "${deleteProgramConfirmation.programName}"?`}
          description='This action cannot be undone. Make sure this program is not being used in any enrollments.'
          confirmText='Delete'
          cancelText='Cancel'
          variant='danger'
          isLoading={isDeleting}
        />

        {/* Success Modal */}
        <SuccessModal
          isOpen={successModal.isOpen}
          onClose={() => setSuccessModal({ isOpen: false, message: "" })}
          message={successModal.message}
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

export default SchoolsProgramsManagement;

