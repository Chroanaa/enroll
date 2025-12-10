"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Search, CheckCircle2, ArrowUpDown } from "lucide-react";
import { Subject, CurriculumCourse } from "../../types";
import { colors } from "../../colors";
import { getSubjects } from "../../utils/subjectUtils";
import Pagination from "../common/Pagination";

interface SubjectSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubjectsSelected: (subjects: Subject[], yearLevel: number, semester: 1 | 2) => void;
  initialYearLevel: number;
  initialSemester: 1 | 2;
  existingCourses: CurriculumCourse[];
}

type SortField = "code" | "name" | "units";
type SortDirection = "asc" | "desc";

const SubjectSelectionModal: React.FC<SubjectSelectionModalProps> = ({
  isOpen,
  onClose,
  onSubjectsSelected,
  initialYearLevel,
  initialSemester,
  existingCourses,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(initialYearLevel);
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(initialSemester);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [sortField, setSortField] = useState<SortField>("code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  useEffect(() => {
    if (isOpen) {
      fetchSubjects();
      setSelectedYear(initialYearLevel);
      setSelectedSemester(initialSemester);
      setSelectedSubjectIds([]);
      setSearchTerm("");
      setCurrentPage(1);
    }
  }, [isOpen, initialYearLevel, initialSemester]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const subjectsData = await getSubjects();
      const subjectsArray: Subject[] = Array.isArray(subjectsData)
        ? subjectsData
        : (Object.values(subjectsData) as Subject[]);
      // Filter only active subjects
      setSubjects(subjectsArray.filter((s) => s.status === "active"));
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter subjects by search term
  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        subject.code.toLowerCase().includes(searchLower) ||
        subject.name.toLowerCase().includes(searchLower)
      );
    });
  }, [subjects, searchTerm]);

  // Sort subjects
  const sortedSubjects = useMemo(() => {
    const sorted = [...filteredSubjects].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "code":
          comparison = a.code.localeCompare(b.code);
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "units":
          const aUnits = (a.units_lec || 0) + (a.units_lab || 0);
          const bUnits = (b.units_lec || 0) + (b.units_lab || 0);
          comparison = aUnits - bUnits;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredSubjects, sortField, sortDirection]);

  // Get already added subjects for the selected year/semester to prevent duplicates
  const existingSubjectIds = useMemo(() => {
    return existingCourses
      .filter(
        (c) => c.year_level === selectedYear && c.semester === selectedSemester
      )
      .map((c) => c.subject_id)
      .filter((id): id is number => id !== undefined);
  }, [existingCourses, selectedYear, selectedSemester]);

  // Filter out already added subjects
  const availableSubjects = useMemo(() => {
    return sortedSubjects.filter((s) => !existingSubjectIds.includes(s.id));
  }, [sortedSubjects, existingSubjectIds]);

  // Pagination
  const totalPages = Math.ceil(availableSubjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubjects = availableSubjects.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleSelectSubject = (subjectId: number) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSubjectIds.length === paginatedSubjects.length) {
      setSelectedSubjectIds([]);
    } else {
      setSelectedSubjectIds(paginatedSubjects.map((s) => s.id));
    }
  };

  const handleAddSelected = () => {
    if (!selectedYear || !selectedSemester) {
      return;
    }

    const selectedSubjects = subjects.filter((s) =>
      selectedSubjectIds.includes(s.id)
    );

    if (selectedSubjects.length === 0) {
      return;
    }

    onSubjectsSelected(selectedSubjects, selectedYear, selectedSemester);
    setSelectedSubjectIds([]);
  };

  const isTableEnabled = selectedYear > 0 && selectedSemester > 0;
  const canAdd = selectedSubjectIds.length > 0 && isTableEnabled;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-5xl bg-white my-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-2.5 flex items-center justify-between border-b sticky top-0 bg-white z-10"
          style={{
            backgroundColor: `${colors.primary}08`,
            borderColor: `${colors.primary}15`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-lg"
              style={{ backgroundColor: `${colors.secondary}20` }}
            >
              <CheckCircle2
                className="w-4 h-4"
                style={{ color: colors.secondary }}
              />
            </div>
            <div>
              <h2
                className="text-lg font-bold"
                style={{ color: colors.primary }}
              >
                Add Subjects
              </h2>
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
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {/* Year & Semester Selection */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <h3
              className="text-xs font-semibold"
              style={{ color: colors.primary }}
            >
              Select Year & Semester <span className="text-red-500">*</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(parseInt(e.target.value));
                    setSelectedSubjectIds([]);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg px-2.5 py-1.5 border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-offset-0"
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
                  <option value={0}>Select Year</option>
                  <option value={1}>Year 1</option>
                  <option value={2}>Year 2</option>
                  <option value={3}>Year 3</option>
                  <option value={4}>Year 4</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => {
                    setSelectedSemester(parseInt(e.target.value) as 1 | 2);
                    setSelectedSubjectIds([]);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg px-2.5 py-1.5 border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-offset-0"
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
                  <option value={0}>Select Semester</option>
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                </select>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search subjects by code or title..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-offset-0 transition-all"
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

          {/* Subject Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[50vh]">
              <table className="w-full min-w-[700px]">
                <thead className="sticky top-0 z-10">
                  <tr
                    style={{
                      backgroundColor: `${colors.primary}05`,
                      borderBottom: `1px solid ${colors.primary}10`,
                    }}
                  >
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600 w-10">
                      <input
                        type="checkbox"
                        checked={
                          isTableEnabled &&
                          paginatedSubjects.length > 0 &&
                          selectedSubjectIds.length === paginatedSubjects.length
                        }
                        onChange={handleSelectAll}
                        disabled={!isTableEnabled}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        style={{
                          accentColor: colors.secondary,
                          cursor: isTableEnabled ? "pointer" : "not-allowed",
                          opacity: isTableEnabled ? 1 : 0.5,
                        }}
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                      <button
                        onClick={() => handleSort("code")}
                        className="flex items-center gap-1 hover:text-gray-900"
                        disabled={!isTableEnabled}
                      >
                        Code
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                      <button
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1 hover:text-gray-900"
                        disabled={!isTableEnabled}
                      >
                        Title
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                      <button
                        onClick={() => handleSort("units")}
                        className="flex items-center gap-1 hover:text-gray-900"
                        disabled={!isTableEnabled}
                      >
                        Units
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                      Prereq
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-gray-500 text-sm">
                        Loading subjects...
                      </td>
                    </tr>
                  ) : !isTableEnabled ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-gray-500 text-sm">
                        Please select Year and Semester first
                      </td>
                    </tr>
                  ) : paginatedSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-gray-500 text-sm">
                        {searchTerm
                          ? "No subjects found matching your search"
                          : "No subjects available"}
                      </td>
                    </tr>
                  ) : (
                    paginatedSubjects.map((subject) => {
                      const isSelected = selectedSubjectIds.includes(subject.id);
                      const totalUnits =
                        (subject.units_lec || 0) + (subject.units_lab || 0);

                      return (
                        <tr
                          key={subject.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            isSelected ? "bg-blue-50" : ""
                          }`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectSubject(subject.id)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                              style={{
                                accentColor: colors.secondary,
                              }}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-medium text-xs" style={{ color: colors.primary }}>
                              {subject.code}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-xs text-gray-700">
                              {subject.name}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-xs font-medium text-gray-700">
                              {totalUnits}
                              {(subject.units_lec || subject.units_lab) && (
                                <span className="text-gray-500 ml-1 text-[10px]">
                                  ({subject.units_lec || 0}/{subject.units_lab || 0})
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-xs text-gray-600">-</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {isTableEnabled && availableSubjects.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={availableSubjects.length}
              itemName="subjects"
              onPageChange={setCurrentPage}
              onItemsPerPageChange={() => {}}
            />
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2.5 flex items-center justify-between border-t sticky bottom-0 bg-white"
          style={{ borderColor: `${colors.primary}10` }}
        >
          <div className="text-xs text-gray-600">
            {selectedSubjectIds.length > 0 && (
              <span>
                <strong>{selectedSubjectIds.length}</strong> selected
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg transition-all text-sm font-medium hover:bg-gray-100"
              style={{
                color: colors.primary,
                border: "1px solid #E5E7EB",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddSelected}
              disabled={!canAdd}
              className="px-3 py-1.5 text-white rounded-lg transition-all text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: colors.secondary }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Add ({selectedSubjectIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectSelectionModal;

