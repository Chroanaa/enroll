"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus, GraduationCap, FileText, Edit2, Trash2 } from "lucide-react";
import { Curriculum } from "../../types";
import { colors } from "../../colors";
import CurriculumTable from "./CurriculumTable";
import CurriculumForm from "./CurriculumForm";
import SearchFilters from "../common/SearchFilters";
import ConfirmationModal from "../common/ConfirmationModal";
import { getCurriculums } from "@/app/utils/curriculumUtils";
const CurriculumManagement: React.FC = () => {
  const [curriculumList, setCurriculumList] = useState<Curriculum[]>([]);

  // Initialize with mock BSIT curriculum data
  useEffect(() => {
    const fetchCurriculums = async () => {
      try {
        const data = await getCurriculums();
        setCurriculumList(data);
      } catch (error) {
        console.error("Failed to fetch curriculums:", error);
      }
    };
    fetchCurriculums();
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(
    null
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] =
    useState<Curriculum | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    curriculumId: number | null;
    curriculumName: string;
  }>({
    isOpen: false,
    curriculumId: null,
    curriculumName: "",
  });

  const filteredCurriculum = useMemo(() => {
    return curriculumList.filter((curriculum) => {
      const matchesSearch =
        curriculum.program_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        curriculum.program_code
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        curriculum.major?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || curriculum.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [curriculumList, searchTerm, statusFilter]);

  const handleSaveCurriculum = async (curriculumData: Curriculum) => {
    try {
      if (editingCurriculum) {
        const response = await fetch("/api/auth/curriculum", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(curriculumData),
        });

        if (response.ok) {
          const updatedCurriculum = await response.json();
          setCurriculumList((prev) =>
            prev.map((c) =>
              c.id === updatedCurriculum.id ? updatedCurriculum : c
            )
          );
        }
        setEditingCurriculum(null);
      } else {
        const response = await fetch("/api/auth/curriculum", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(curriculumData),
        });

        if (response.ok) {
          const newCurriculum = await response.json();
          setCurriculumList((prev) => [...prev, newCurriculum]);
        }
        setIsAddModalOpen(false);
      }
    } catch (error) {
      console.error("Failed to save curriculum:", error);
    }
  };

  const handleDeleteCurriculum = (id: number) => {
    const curriculum = curriculumList.find((c) => c.id === id);
    if (curriculum) {
      setDeleteConfirmation({
        isOpen: true,
        curriculumId: id,
        curriculumName: curriculum.program_name,
      });
    }
  };

  const confirmDeleteCurriculum = async () => {
    if (deleteConfirmation.curriculumId) {
      try {
        const response = await fetch("/api/auth/curriculum", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deleteConfirmation.curriculumId),
        });

        if (response.ok) {
          setCurriculumList((prev) =>
            prev.filter((c) => c.id !== deleteConfirmation.curriculumId)
          );
        }
      } catch (error) {
        console.error("Failed to delete curriculum:", error);
      } finally {
        setDeleteConfirmation({
          isOpen: false,
          curriculumId: null,
          curriculumName: "",
        });
      }
    }
  };

  const handleViewCurriculum = (curriculum: Curriculum) => {
    setSelectedCurriculum(curriculum);
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
              Curriculum Management
            </h1>
            <p className='text-gray-500 mt-1'>
              Define and maintain academic programs, course offerings, credit
              units, and prerequisite subjects
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className='flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95'
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className='w-5 h-5' />
            <span className='font-medium'>Add Curriculum</span>
          </button>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder='Search curriculum...'
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

        {/* Curriculum List */}
        {filteredCurriculum.length === 0 ? (
          <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center'>
            <div className='flex flex-col items-center justify-center gap-4'>
              <div
                className='p-4 rounded-full'
                style={{ backgroundColor: `${colors.primary}05` }}
              >
                <GraduationCap
                  className='w-12 h-12'
                  style={{ color: colors.primary }}
                />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                  No Curriculum Found
                </h3>
                <p className='text-gray-600 mb-4'>
                  Get started by creating your first curriculum program
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className='flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all mx-auto'
                  style={{ backgroundColor: colors.secondary }}
                >
                  <Plus className='w-4 h-4' />
                  <span>Create Curriculum</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            {filteredCurriculum.map((curriculum) => (
              <div
                key={curriculum.id}
                className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'
              >
                <div className='p-6'>
                  <div className='flex items-start justify-between mb-4'>
                    <div>
                      <h3
                        className='text-xl font-bold mb-1'
                        style={{ color: colors.primary }}
                      >
                        {curriculum.program_name}
                      </h3>
                      <div className='flex items-center gap-4 text-sm text-gray-600'>
                        <span>
                          <strong>Code:</strong> {curriculum.program_code}
                        </span>
                        {curriculum.major && (
                          <span>
                            <strong>Major:</strong> {curriculum.major}
                          </span>
                        )}
                        <span>
                          <strong>Effective:</strong>{" "}
                          {curriculum.effective_year}
                        </span>
                        <span>
                          <strong>Total Units:</strong> {curriculum.total_units}
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={() => handleViewCurriculum(curriculum)}
                        className='flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium'
                        style={{
                          color: colors.primary,
                          border: `1px solid ${colors.primary}20`,
                          backgroundColor: `${colors.primary}05`,
                        }}
                      >
                        <FileText className='w-4 h-4' />
                        View Details
                      </button>
                      <button
                        onClick={() => setEditingCurriculum(curriculum)}
                        className='p-2 rounded-lg hover:bg-gray-100 transition-all text-blue-600'
                        title='Edit'
                      >
                        <Edit2 className='w-4 h-4' />
                      </button>
                      <button
                        onClick={() => handleDeleteCurriculum(curriculum.id)}
                        className='p-2 rounded-lg hover:bg-gray-100 transition-all text-red-600'
                        title='Delete'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
                    </div>
                  </div>
                  <div
                    className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border'
                    style={{
                      backgroundColor:
                        curriculum.status === "active" ? "#ECFDF5" : "#F3F4F6",
                      color:
                        curriculum.status === "active" ? "#047857" : "#374151",
                      borderColor:
                        curriculum.status === "active" ? "#A7F3D0" : "#E5E7EB",
                    }}
                  >
                    {curriculum.status.charAt(0).toUpperCase() +
                      curriculum.status.slice(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Curriculum Detail View */}
        {selectedCurriculum && (
          <CurriculumTable
            curriculum={selectedCurriculum}
            onClose={() => setSelectedCurriculum(null)}
          />
        )}

        {/* Add/Edit Curriculum Form */}
        {(isAddModalOpen || editingCurriculum) && (
          <CurriculumForm
            curriculum={editingCurriculum}
            onSave={handleSaveCurriculum}
            onCancel={() => {
              setEditingCurriculum(null);
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
              curriculumId: null,
              curriculumName: "",
            })
          }
          onConfirm={confirmDeleteCurriculum}
          title='Delete Curriculum'
          message={`Are you sure you want to delete "${deleteConfirmation.curriculumName}"?`}
          description='This action cannot be undone. All associated data will be permanently removed.'
          confirmText='Delete Curriculum'
          cancelText='Cancel'
          variant='danger'
        />
      </div>
    </div>
  );
};

export default CurriculumManagement;
