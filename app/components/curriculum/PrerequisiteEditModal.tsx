"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Search, CheckCircle2, XCircle, BookOpen } from "lucide-react";
import { Subject, CurriculumCourse } from "../../types";
import { colors } from "../../colors";
import { getSubjects } from "../../utils/subjectUtils";
import { parsePrerequisites, formatPrerequisites, serializePrerequisites, PrerequisiteData } from "./utils";
import Pagination from "../common/Pagination";

interface PrerequisiteEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prerequisites: PrerequisiteData) => void;
  course: CurriculumCourse;
  allCourses: CurriculumCourse[];
}

const PrerequisiteEditModal: React.FC<PrerequisiteEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  course,
  allCourses,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [selectedYearLevel, setSelectedYearLevel] = useState<number | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Parse existing prerequisites
  useEffect(() => {
    if (isOpen && course) {
      const parsed = parsePrerequisites(course.prerequisite, allCourses);
      setSelectedSubjectIds(parsed.subjectIds);
      setSelectedYearLevel(parsed.yearLevel);
      setSearchTerm("");
      setCurrentPage(1);
    }
  }, [isOpen, course, allCourses]);

  useEffect(() => {
    if (isOpen) {
      fetchSubjects();
    }
  }, [isOpen]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const subjectsData = await getSubjects();
      const subjectsArray: Subject[] = Array.isArray(subjectsData)
        ? subjectsData
        : (Object.values(subjectsData) as Subject[]);
      setSubjects(subjectsArray.filter((s) => s.status === "active"));
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };


  // Get available subjects (exclude current course and already added subjects)
  const availableSubjects = useMemo(() => {
    return subjects.filter((s) => {
      // Exclude current course's subject
      if (s.id === course.subject_id) return false;
      return true;
    });
  }, [subjects, course]);

  // Filter subjects by search term
  const filteredSubjects = useMemo(() => {
    return availableSubjects.filter((subject) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        subject.code.toLowerCase().includes(searchLower) ||
        subject.name.toLowerCase().includes(searchLower)
      );
    });
  }, [availableSubjects, searchTerm]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubjects = filteredSubjects.slice(startIndex, endIndex);

  // Get selected subjects for display
  const selectedSubjects = useMemo(() => {
    return subjects.filter((s) => selectedSubjectIds.includes(s.id));
  }, [subjects, selectedSubjectIds]);

  const handleToggleSubject = (subjectId: number) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleRemoveSubject = (subjectId: number) => {
    setSelectedSubjectIds((prev) => prev.filter((id) => id !== subjectId));
  };

  const handleSave = () => {
    onSave({
      subjectIds: selectedSubjectIds,
      yearLevel: selectedYearLevel,
    });
    onClose();
  };

  const formatPrerequisiteString = (data: PrerequisiteData): string => {
    return formatPrerequisites(data, allCourses);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-4xl bg-white my-4 max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-2 flex items-center justify-between border-b sticky top-0 bg-white z-10"
          style={{
            backgroundColor: `${colors.primary}08`,
            borderColor: `${colors.primary}15`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="p-1 rounded-lg"
              style={{ backgroundColor: `${colors.secondary}20` }}
            >
              <BookOpen
                className="w-3.5 h-3.5"
                style={{ color: colors.secondary }}
              />
            </div>
            <div>
              <h2
                className="text-base font-bold"
                style={{ color: colors.primary }}
              >
                Edit Prerequisites
              </h2>
              <p className="text-[10px] text-gray-500 truncate max-w-md">
                {course.course_code} - {course.descriptive_title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 flex-1 space-y-2 overflow-y-auto">
          {/* Year Level Prerequisite */}
          <div className="bg-gray-50 p-2 rounded-lg">
            <label className="block text-xs font-semibold mb-1" style={{ color: colors.primary }}>
              Year Level Prerequisite (Optional)
            </label>
            <select
              value={selectedYearLevel || ""}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedYearLevel(value ? parseInt(value) : undefined);
              }}
              className="w-full rounded-lg px-2 py-1.5 border border-gray-200 text-xs bg-white focus:ring-2 focus:ring-offset-0"
              style={{
                outline: "none",
                color: "#6B5B4F",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.secondary;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#E5E7EB";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <option value="">None</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>
          </div>

          {/* Selected Prerequisites Display */}
          {(selectedSubjectIds.length > 0 || selectedYearLevel) && (
            <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-1  gap-2">
                <h3 className="text-xs font-semibold flex-shrink-0" style={{ color: colors.primary }}>
                  Selected ({selectedSubjectIds.length + (selectedYearLevel ? 1 : 0)})
                </h3>
                <span className="text-[10px] text-gray-600 flex-1 text-right min-w-0">
                  Preview: <strong className="font-medium">{formatPrerequisiteString({ subjectIds: selectedSubjectIds, yearLevel: selectedYearLevel })}</strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedSubjects.map((subject) => (
                  <span
                    key={subject.id}
                    className="inline-flex items-center gap-0.5 p-2bg-white rounded text-[10px] font-medium border border-blue-300"
                    style={{ color: colors.primary }}
                  >
                    {subject.code}
                    <button
                      onClick={() => handleRemoveSubject(subject.id)}
                      className="hover:text-red-600 transition-colors ml-0.5"
                    >
                      <XCircle className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                {selectedYearLevel && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white rounded text-[10px] font-medium border border-blue-300"
                    style={{ color: colors.primary }}
                  >
                    Year {selectedYearLevel}
                    <button
                      onClick={() => setSelectedYearLevel(undefined)}
                      className="hover:text-red-600 transition-colors ml-0.5"
                    >
                      <XCircle className="w-2.5 h-2.5" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Subject Selection */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.primary }}>
              Select Subject Prerequisites
            </label>
            
            {/* Search Bar */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search subjects by code or title..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-offset-0 transition-all placeholder:text-gray-400"
                style={{
                  outline: "none",
                  color: "#6B5B4F",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.secondary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#E5E7EB";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Subject List */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Loading subjects...
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm
                    ? "No subjects found matching your search"
                    : "No subjects available"}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
                  {paginatedSubjects.map((subject) => {
                    const isSelected = selectedSubjectIds.includes(subject.id);
                    const totalUnits = (subject.units_lec || 0) + (subject.units_lab || 0);

                    return (
                      <div
                        key={subject.id}
                        className={`px-3 py-2 border-b border-r border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                          isSelected ? "bg-blue-50" : ""
                        }`}
                        onClick={() => handleToggleSubject(subject.id)}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSubject(subject.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                            style={{
                              accentColor: colors.secondary,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-medium text-sm"
                                style={{ color: colors.primary }}
                              >
                                {subject.code}
                              </span>
                              <span className="text-xs text-gray-500">
                                {totalUnits} units
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5 truncate">
                              {subject.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredSubjects.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={filteredSubjects.length}
                itemName="subjects"
                onPageChange={(page) => {
                  setCurrentPage(page);
                }}
                onItemsPerPageChange={(newItemsPerPage) => {
                  setItemsPerPage(newItemsPerPage);
                  setCurrentPage(1);
                }}
                itemsPerPageOptions={[5, 10, 15, 25, 50]}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-3 py-2 flex items-center justify-between border-t sticky bottom-0 bg-white"
          style={{ borderColor: `${colors.primary}10` }}
        >
          <div className="text-[10px] text-gray-600">
            {selectedSubjectIds.length > 0 && (
              <span>
                <strong>{selectedSubjectIds.length}</strong> subject{selectedSubjectIds.length !== 1 ? "s" : ""}
              </span>
            )}
            {selectedYearLevel && (
              <span className="ml-1.5">
                • Year {selectedYearLevel}
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg transition-all text-xs font-medium hover:bg-gray-100"
              style={{
                color: colors.primary,
                border: "1px solid #E5E7EB",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-white rounded-lg transition-all text-xs font-medium flex items-center gap-1"
              style={{ backgroundColor: colors.secondary }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrerequisiteEditModal;

