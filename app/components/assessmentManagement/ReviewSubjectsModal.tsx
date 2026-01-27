"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, CheckCircle2, Trash2 } from "lucide-react";
import { colors } from "../../colors";
import Pagination from "../common/Pagination";
import SuccessModal from "../common/SuccessModal";

interface CurriculumCourse {
  id: number;
  curriculum_id: number;
  subject_id?: number | null;
  course_code: string;
  descriptive_title: string;
  units_lec?: number | null;
  units_lab?: number | null;
  units_total: number;
  lecture_hour?: number | null;
  lab_hour?: number | null;
  prerequisite?: string | null;
  year_level: number;
  semester: number;
}

interface ReviewSubjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (subjects: CurriculumCourse[]) => void;
  selectedSubjects: CurriculumCourse[];
  onRemoveSubject: (subjectId: number) => void;
}

export const ReviewSubjectsModal: React.FC<ReviewSubjectsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedSubjects,
  onRemoveSubject,
}) => {
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(4);

  // Success Modal
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: "",
  });

  // Handle body overflow when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Add custom scrollbar styles
  useEffect(() => {
    const styleId = 'review-modal-scrollbar-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .review-modal-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .review-modal-scrollbar::-webkit-scrollbar-track {
          background: ${colors.tertiary}20;
          border-radius: 4px;
        }
        .review-modal-scrollbar::-webkit-scrollbar-thumb {
          background: ${colors.primary};
          border-radius: 4px;
        }
        .review-modal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${colors.secondary};
        }
      `;
      document.head.appendChild(style);
    }
    return () => {
      const styleElement = document.getElementById(styleId);
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  // Reset to page 1 when subjects change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSubjects.length]);

  // Pagination calculations
  const totalPages = Math.ceil(selectedSubjects.length / itemsPerPage);
  const paginatedSubjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return selectedSubjects.slice(startIndex, endIndex);
  }, [selectedSubjects, currentPage, itemsPerPage]);

  const formatHours = (lec?: number | null, lab?: number | null) => {
    const lecHrs = lec || 0;
    const labHrs = lab || 0;
    if (lecHrs === 0 && labHrs === 0) return "0";
    if (lecHrs === 0) return `${labHrs} hrs`;
    if (labHrs === 0) return `${lecHrs} hrs`;
    return `${lecHrs} hrs / ${labHrs} hrs`;
  };

  const getSemesterLabel = (semester: number) => {
    return semester === 1 ? "1st Semester" : "2nd Semester";
  };

  const handleConfirm = () => {
    if (selectedSubjects.length > 0) {
      onConfirm(selectedSubjects);
      // Close review modal first
      onClose();
      // Show success modal after a brief delay to ensure modal closes
      setTimeout(() => {
        setSuccessModal({
          isOpen: true,
          message: `Successfully added ${selectedSubjects.length} subject${selectedSubjects.length !== 1 ? "s" : ""}!`,
        });
      }, 100);
    }
  };

  // Reset success modal when review modal closes
  useEffect(() => {
    if (!isOpen) {
      setSuccessModal({ isOpen: false, message: "" });
    }
  }, [isOpen]);

  if (!isOpen && !successModal.isOpen) return null;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-[60] backdrop-blur-sm"
          style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
          onClick={onClose}
        >
          <div
            className="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 bg-white my-4"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b sticky top-0 bg-white z-10"
          style={{
            backgroundColor: colors.paper,
            borderColor: colors.tertiary + "30",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.secondary + "10" }}
            >
              <CheckCircle2 className="w-6 h-6" style={{ color: colors.secondary }} />
            </div>
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: colors.primary }}
              >
                Review Selected Subjects
              </h2>
              <p className="text-sm text-gray-600">
                Review and confirm before saving ({selectedSubjects.length} subject{selectedSubjects.length !== 1 ? "s" : ""})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-6 review-modal-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: `${colors.primary} ${colors.tertiary}20`
          }}
        >
          {selectedSubjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No subjects selected</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Subjects Table */}
              <div className="relative overflow-x-auto rounded-xl border" style={{ borderColor: colors.accent + "20" }}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: colors.accent + "05" }}>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                        Course Title
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                        Semester
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                        Year Level
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                        Units
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                        Lecture / Lab Hours
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                        Prerequisite
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSubjects.map((subject, index) => {
                      // Calculate actual index for styling
                      const actualIndex = (currentPage - 1) * itemsPerPage + index;
                      return (
                      <tr
                        key={subject.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                        style={{
                          backgroundColor: actualIndex % 2 === 0 ? "transparent" : colors.paper + "30",
                          borderColor: colors.tertiary + "20",
                        }}
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium" style={{ color: colors.primary }}>
                            {subject.course_code}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: colors.tertiary }}>
                            {subject.descriptive_title}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm" style={{ color: colors.tertiary }}>
                            {getSemesterLabel(subject.semester)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm" style={{ color: colors.tertiary }}>
                            {subject.year_level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold" style={{ color: colors.primary }}>
                            {subject.units_total}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm" style={{ color: colors.tertiary }}>
                            {formatHours(subject.lecture_hour, subject.lab_hour)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm italic" style={{ color: colors.tertiary + "90" }}>
                            {subject.prerequisite || "None"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => onRemoveSubject(subject.id)}
                            className="p-1.5 rounded-lg transition-all hover:bg-red-50"
                            style={{ color: "#ef4444" }}
                            title="Remove subject"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: colors.accent + "05" }}>
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-right text-sm font-bold"
                        style={{ color: colors.primary }}
                      >
                        Total Units:
                      </td>
                      <td
                        className="px-4 py-3 text-center text-sm font-bold"
                        style={{ color: colors.primary }}
                      >
                        {selectedSubjects.reduce((sum, s) => sum + s.units_total, 0)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination - Sticky */}
        {selectedSubjects.length > 0 && (
          <div className="sticky bg-white border-t z-10" style={{ bottom: "80px", borderColor: colors.tertiary + "30" }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={selectedSubjects.length}
              itemName="subjects"
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setItemsPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
              itemsPerPageOptions={[4, 8]}
            />
          </div>
        )}

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between sticky bottom-0 bg-white z-20"
          style={{ borderColor: colors.tertiary + "30" }}
        >
          <div className="text-sm text-gray-600">
            {selectedSubjects.length > 0 && (
              <span>
                <strong>{selectedSubjects.length}</strong> subject{selectedSubjects.length !== 1 ? "s" : ""} ready to add
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg font-medium transition-colors"
              style={{
                color: colors.primary,
                border: `1px solid ${colors.tertiary}30`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.tertiary + "10";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedSubjects.length === 0}
              className="px-6 py-2.5 rounded-lg font-medium text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: colors.secondary }}
              onMouseEnter={(e) => {
                if (selectedSubjects.length > 0) {
                  e.currentTarget.style.backgroundColor = colors.tertiary;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedSubjects.length > 0) {
                  e.currentTarget.style.backgroundColor = colors.secondary;
                }
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm & Save
            </button>
          </div>
        </div>
      </div>
      </div>
      )}

      {/* Success Modal - Outside review modal so it can show after review modal closes */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: "" })}
        message={successModal.message}
        autoClose={true}
        autoCloseDelay={3000}
      />
    </>
  );
};

