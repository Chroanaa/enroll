"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, Search, Plus, Loader2, BookOpen, Filter } from "lucide-react";
import { colors } from "../../colors";
import type { EnrolledSubject } from "./types";
import { ReviewSubjectsModal } from "./ReviewSubjectsModal";
import Pagination from "../common/Pagination";
import ConfirmationModal from "../common/ConfirmationModal";

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

interface SubjectManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSubjects: (subjects: CurriculumCourse[]) => void;
  programId: number | null;
  majorId: number | null;
  currentSemester: number;
  enrolledSubjectIds: Set<number>;
  mode?: "add" | "edit";
  editingSubject?: EnrolledSubject | null;
}

export const SubjectManagementModal: React.FC<SubjectManagementModalProps> = ({
  isOpen,
  onClose,
  onAddSubjects,
  programId,
  majorId,
  currentSemester,
  enrolledSubjectIds,
  mode = "add",
  editingSubject = null,
}) => {
  const [curriculumCourses, setCurriculumCourses] = useState<CurriculumCourse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<number>>(new Set());
  const [selectedSubjects, setSelectedSubjects] = useState<CurriculumCourse[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  // Filters
  const [filterSemester, setFilterSemester] = useState<number | "all">(currentSemester);
  const [filterYearLevel, setFilterYearLevel] = useState<number | "all">("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(4);

  // Prerequisite warning modal
  const [prerequisiteModal, setPrerequisiteModal] = useState<{
    isOpen: boolean;
    course: CurriculumCourse | null;
  }>({
    isOpen: false,
    course: null,
  });

  // Cache for curriculum data per programId
  const curriculumCacheRef = useRef<Map<number, { data: CurriculumCourse[]; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Load curriculum subjects when modal opens - fetch from both semesters with caching
  useEffect(() => {
    if (isOpen && programId) {
      fetchCurriculumSubjects();
    } else if (isOpen) {
      setError("Program information required");
    }
  }, [isOpen, programId, majorId]);

  // Handle body overflow when modal opens/closes
  useEffect(() => {
    if (isOpen || isReviewModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isReviewModalOpen]);

  // Add custom scrollbar styles
  useEffect(() => {
    const styleId = 'subject-modal-scrollbar-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .subject-modal-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .subject-modal-scrollbar::-webkit-scrollbar-track {
          background: ${colors.tertiary}20;
          border-radius: 4px;
        }
        .subject-modal-scrollbar::-webkit-scrollbar-thumb {
          background: ${colors.primary};
          border-radius: 4px;
        }
        .subject-modal-scrollbar::-webkit-scrollbar-thumb:hover {
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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSelectedCourseIds(new Set());
      setSelectedSubjects([]);
      setError(null);
      setFilterSemester(currentSemester);
      setFilterYearLevel("all");
      setIsReviewModalOpen(false);
    }
  }, [isOpen, currentSemester]);

  const fetchCurriculumSubjects = async () => {
    if (!programId) return;

    // Create cache key that includes majorId
    const cacheKey = majorId ? `${programId}-${majorId}` : `${programId}`;
    
    // Check cache first
    const cached = curriculumCacheRef.current.get(Number(cacheKey.split('-')[0]));
    const now = Date.now();
    
    // Only use cache if majorId matches (or both are null)
    const cacheValid = cached && 
      (now - cached.timestamp) < CACHE_DURATION &&
      (cached as any).majorId === majorId;
    
    if (cacheValid) {
      setCurriculumCourses(cached.data);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch subjects from both semesters in parallel with AbortController for cancellation
      const abortController = new AbortController();
      const signal = abortController.signal;

      // Build URL with optional majorId parameter
      const buildUrl = (semester: number) => {
        let url = `/api/auth/curriculum/subjects?programId=${programId}&semester=${semester}`;
        if (majorId) {
          url += `&majorId=${majorId}`;
        }
        return url;
      };

      const [sem1Response, sem2Response] = await Promise.all([
        fetch(buildUrl(1), { signal }),
        fetch(buildUrl(2), { signal }),
      ]);

      // Check if request was aborted
      if (signal.aborted) return;

      const sem1Data = sem1Response.ok ? await sem1Response.json() : null;
      const sem2Data = sem2Response.ok ? await sem2Response.json() : null;

      if (signal.aborted) return;

      const allCourses: CurriculumCourse[] = [];
      
      if (sem1Data?.success && sem1Data.data?.courses) {
        allCourses.push(...sem1Data.data.courses);
      }
      
      if (sem2Data?.success && sem2Data.data?.courses) {
        allCourses.push(...sem2Data.data.courses);
      }

      if (allCourses.length === 0) {
        if (!sem1Response.ok && !sem2Response.ok) {
          const errorData = sem1Data || sem2Data || {};
          // Show the specific error from the API (e.g. no active curriculum)
          setError(errorData.error || "No subjects found for this program. Please ensure an active curriculum is set up.");
          return;
        }
      }

      // Cache the results with majorId
      const cacheData = {
        data: allCourses,
        timestamp: now,
        majorId: majorId,
      };
      curriculumCacheRef.current.set(programId, cacheData as any);

      setCurriculumCourses(allCourses);
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'AbortError') return;
      
      console.error("Error fetching curriculum subjects:", err);
      setError(err instanceof Error ? err.message : "Failed to load subjects");
      setCurriculumCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter courses by search term, filters, and exclude already enrolled
  const availableCourses = useMemo(() => {
    return curriculumCourses.filter((course) => {
      // Exclude already enrolled subjects (across all semesters and year levels)
      if (enrolledSubjectIds.has(course.id)) {
        return false;
      }

      // Filter by semester
      if (filterSemester !== "all" && course.semester !== filterSemester) {
        return false;
      }

      // Filter by year level
      if (filterYearLevel !== "all" && course.year_level !== filterYearLevel) {
        return false;
      }

      // Filter by search term
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        return (
          course.course_code.toLowerCase().includes(searchLower) ||
          course.descriptive_title.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [curriculumCourses, searchTerm, enrolledSubjectIds, filterSemester, filterYearLevel]);

  // Pagination calculations
  const totalPages = Math.ceil(availableCourses.length / itemsPerPage);
  const paginatedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return availableCourses.slice(startIndex, endIndex);
  }, [availableCourses, currentPage, itemsPerPage]);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSemester, filterYearLevel]);


  const handleToggleCourse = (courseId: number) => {
    const course = curriculumCourses.find((c) => c.id === courseId);
    if (!course) return;

    // If deselecting, just remove it
    if (selectedCourseIds.has(courseId)) {
      setSelectedCourseIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(courseId);
        return newSet;
      });
      return;
    }

    // If selecting and course has prerequisite, show warning modal
    if (course.prerequisite && course.prerequisite.trim() !== "" && course.prerequisite.toLowerCase() !== "none") {
      setPrerequisiteModal({
        isOpen: true,
        course: course,
      });
    } else {
      // No prerequisite, add directly
      setSelectedCourseIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(courseId);
        return newSet;
      });
    }
  };

  const handleConfirmPrerequisite = () => {
    if (prerequisiteModal.course) {
      setSelectedCourseIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(prerequisiteModal.course!.id);
        return newSet;
      });
    }
    setPrerequisiteModal({ isOpen: false, course: null });
  };

  const handleSelectAll = () => {
    // This function is no longer used, but kept for compatibility
    // Select all is now handled inline in the checkbox onChange
  };

  const handleProceed = () => {
    const selectedCourses = curriculumCourses.filter((course) =>
      selectedCourseIds.has(course.id)
    );

    if (selectedCourses.length === 0) {
      setError("Please select at least one subject");
      return;
    }

    // Set selected subjects and open review modal
    setSelectedSubjects(selectedCourses);
    setIsReviewModalOpen(true);
  };

  const handleRemoveFromReview = (subjectId: number) => {
    setSelectedSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    setSelectedCourseIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(subjectId);
      return newSet;
    });
  };

  const handleConfirmSave = () => {
    if (selectedSubjects.length > 0) {
      onAddSubjects(selectedSubjects);
      setSelectedCourseIds(new Set());
      setSelectedSubjects([]);
      setIsReviewModalOpen(false);
    onClose();
    }
  };

  const handleCancelReview = () => {
    setIsReviewModalOpen(false);
  };

  const formatHours = (lec?: number | null, lab?: number | null) => {
    const lecHrs = lec || 0;
    const labHrs = lab || 0;
    return `${lecHrs}/${labHrs}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 bg-white my-4"
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
              <BookOpen className="w-6 h-6" style={{ color: colors.secondary }} />
            </div>
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: colors.primary }}
              >
                {mode === "edit" ? "Edit Subject" : "Add Subjects"}
              </h2>
              <p className="text-sm text-gray-600">
                Select subjects from the curriculum
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

        {/* Filters and Search Bar */}
        <div className="px-6 py-4 border-b" style={{ borderColor: colors.tertiary + "30" }}>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Filters */}
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" style={{ color: colors.tertiary }} />
                <span className="text-sm font-medium" style={{ color: colors.primary }}>
                  Filters:
                </span>
                </div>
              
              {/* Semester Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Semester:</label>
                <select
                  value={filterSemester}
                  onChange={(e) => setFilterSemester(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{
                    borderColor: colors.tertiary + "30",
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.tertiary + "30";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="all">All Semesters</option>
                  <option value={1}>1st Semester</option>
                  <option value={2}>2nd Semester</option>
                </select>
              </div>

              {/* Year Level Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Year Level:</label>
                <select
                  value={filterYearLevel}
                  onChange={(e) => setFilterYearLevel(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2"
                  style={{
                    borderColor: colors.tertiary + "30",
                    color: colors.primary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = colors.tertiary + "30";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="all">All Year Levels</option>
                  <option value={1}>Year 1</option>
                  <option value={2}>Year 2</option>
                  <option value={3}>Year 3</option>
                  <option value={4}>Year 4</option>
                  <option value={5}>Year 5</option>
                </select>
              </div>
            </div>

            {/* Search Bar - Right side */}
            <div className="relative w-full sm:w-auto sm:min-w-[300px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search
                  className="h-4 w-4"
                  style={{ color: colors.tertiary }}
                />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by code or title..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2"
                style={{
                  borderColor: colors.tertiary + "30",
                  color: colors.primary,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.secondary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.tertiary + "30";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-6 subject-modal-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: `${colors.primary} ${colors.tertiary}20`
          }}
        >
          {error && !isLoading && (
                <div
                  className="p-4 rounded-lg mb-4"
                  style={{ backgroundColor: "#FEE2E2", border: "1px solid #FECACA" }}
                >
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: colors.secondary }} />
              <p className="text-gray-600">Loading subjects...</p>
            </div>
          ) : availableCourses.length === 0 ? (
            <div className="text-center py-12">
                  <BookOpen
                size={48}
                className="mx-auto mb-4"
                    style={{ color: colors.tertiary, opacity: 0.5 }}
              />
              <p className="text-gray-600">
                {searchTerm
                  ? "No subjects found matching your search"
                  : curriculumCourses.length === 0
                  ? "No subjects available in curriculum"
                  : "All available subjects have been enrolled"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All */}
              {availableCourses.length > 0 && (
                <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: colors.tertiary + "20" }}>
                  <input
                    type="checkbox"
                    checked={paginatedCourses.length > 0 && paginatedCourses.every((c) => selectedCourseIds.has(c.id))}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (paginatedCourses.every((c) => selectedCourseIds.has(c.id))) {
                        // Deselect all on current page
                        setSelectedCourseIds((prev) => {
                          const newSet = new Set(prev);
                          paginatedCourses.forEach((c) => newSet.delete(c.id));
                          return newSet;
                        });
                      } else {
                        // Select all on current page
                        setSelectedCourseIds((prev) => {
                          const newSet = new Set(prev);
                          paginatedCourses.forEach((c) => newSet.add(c.id));
                          return newSet;
                        });
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    style={{ accentColor: colors.secondary }}
                  />
                  <span className="text-sm font-medium" style={{ color: colors.primary }}>
                    Select All on Page ({availableCourses.length} total available)
                  </span>
                  {selectedCourseIds.size > 0 && (
                    <span className="text-sm text-gray-500">
                      ({selectedCourseIds.size} selected)
                    </span>
                  )}
                </div>
              )}

              {/* Subjects Table */}
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: colors.accent + "20" }}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: colors.accent + "05" }}>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary, width: "40px" }}>
                        {/* Empty header for checkbox column alignment */}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                        Course Title
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                        Units (Lec/Lab)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                        Hours (Lec/Lab)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                        Prerequisite
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                        Semester
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                        Year
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCourses.map((course, index) => {
                      const isSelected = selectedCourseIds.has(course.id);
                    return (
                        <tr
                          key={course.id}
                          className={`border-b hover:bg-gray-50 transition-colors cursor-pointer ${
                            isSelected ? "bg-blue-50" : ""
                          }`}
                          style={{
                            backgroundColor: isSelected
                              ? colors.secondary + "08"
                              : index % 2 === 0
                              ? "transparent"
                              : colors.paper + "30",
                            borderColor: colors.tertiary + "20",
                          }}
                          onClick={() => handleToggleCourse(course.id)}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCourse(course.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-gray-300"
                              style={{ accentColor: colors.secondary }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-medium" style={{ color: colors.primary }}>
                              {course.course_code}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm" style={{ color: colors.tertiary }}>
                              {course.descriptive_title}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-semibold" style={{ color: colors.primary }}>
                              {course.units_lec || 0}/{course.units_lab || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm" style={{ color: colors.tertiary }}>
                              {formatHours(course.lecture_hour, course.lab_hour)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm italic" style={{ color: colors.tertiary + "90" }}>
                              {course.prerequisite || "None"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm" style={{ color: colors.tertiary }}>
                              {course.semester === 1 ? "1st" : "2nd"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm" style={{ color: colors.tertiary }}>
                              {course.year_level}
                              </span>
                          </td>
                        </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination - Sticky */}
        {availableCourses.length > 0 && (
          <div className="sticky bg-white border-t z-10" style={{ bottom: "80px", borderColor: colors.tertiary + "30" }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={availableCourses.length}
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
            {selectedCourseIds.size > 0 && (
              <span>
                <strong>{selectedCourseIds.size}</strong> subject{selectedCourseIds.size !== 1 ? "s" : ""} selected
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
              onClick={handleProceed}
              disabled={selectedCourseIds.size === 0}
              className="px-6 py-2.5 rounded-lg font-medium text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: colors.secondary }}
              onMouseEnter={(e) => {
                if (selectedCourseIds.size > 0) {
                e.currentTarget.style.backgroundColor = colors.tertiary;
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCourseIds.size > 0) {
                e.currentTarget.style.backgroundColor = colors.secondary;
                }
              }}
            >
              <Plus className="w-4 h-4" />
              Proceed {selectedCourseIds.size > 0 ? `(${selectedCourseIds.size})` : ""}
            </button>
          </div>
        </div>
      </div>

      {/* Review Subjects Modal */}
      <ReviewSubjectsModal
        isOpen={isReviewModalOpen}
        onClose={handleCancelReview}
        onConfirm={handleConfirmSave}
        selectedSubjects={selectedSubjects}
        onRemoveSubject={handleRemoveFromReview}
      />

      {/* Prerequisite Warning Modal */}
        <ConfirmationModal
          isOpen={prerequisiteModal.isOpen}
          onClose={() => setPrerequisiteModal({ isOpen: false, course: null })}
          onConfirm={handleConfirmPrerequisite}
          title="Subject Has Prerequisite"
          message={`${prerequisiteModal.course?.course_code} - ${prerequisiteModal.course?.descriptive_title}`}
        description={`Prerequisite: ${prerequisiteModal.course?.prerequisite || "None"}`}
          confirmText="Continue"
          cancelText="Cancel"
          variant="warning"
        />
    </div>
  );
};
