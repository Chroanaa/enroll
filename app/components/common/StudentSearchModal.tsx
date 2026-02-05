"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Search, Loader2, User } from "lucide-react";
import { colors } from "../../colors";
import { getMajors } from "../../utils/majorUtils";
import { getPrograms } from "../../utils/programUtils";
import { Major, Program } from "../../types";

interface Student {
  id: number;
  student_number: string;
  full_name: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  course_program: string | null;
  program_code: string | null;
  year_level: string | null;
  status: string | null;
  status_code: number | null;
  term: string | null;
  academic_year: string | null;
}

interface StudentSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (studentNumber: string) => void;
}

const StudentSearchModal: React.FC<StudentSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [majors, setMajors] = useState<Major[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  // Combined selection: "all" | "p:<programId>" | "m:<majorId>"
  const [selectedProgramMajor, setSelectedProgramMajor] =
    useState<string>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const programMajorOptions = useMemo(() => {
    // Build combined list:
    // - Program - None
    // - Program - MajorName (for each major under program)
    const majorsByProgramId = new Map<number, Major[]>();
    for (const major of majors) {
      const list = majorsByProgramId.get(major.program_id) || [];
      list.push(major);
      majorsByProgramId.set(major.program_id, list);
    }

    // Keep majors stable & sorted
    for (const [programId, list] of majorsByProgramId.entries()) {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      majorsByProgramId.set(programId, list);
    }

    const sortedPrograms = [...programs].sort((a, b) =>
      (a.code || a.name || "").localeCompare(b.code || b.name || ""),
    );

    const options: Array<{
      value: string;
      label: string;
      programId?: number;
      majorId?: number;
    }> = [];

    for (const program of sortedPrograms) {
      // Program - None (fallback)
      options.push({
        value: `p:${program.id}`,
        label: `${program.code} - None`,
        programId: program.id,
      });

      const programMajors = majorsByProgramId.get(program.id) || [];
      for (const major of programMajors) {
        options.push({
          value: `m:${major.id}`,
          label: `${program.code} - ${major.name}`,
          programId: program.id,
          majorId: major.id,
        });
      }
    }

    return options;
  }, [majors, programs]);

  const selectedFilter = useMemo(() => {
    if (!selectedProgramMajor || selectedProgramMajor === "all") {
      return { programId: null as number | null, majorId: null as number | null };
    }
    if (selectedProgramMajor.startsWith("m:")) {
      const majorId = parseInt(selectedProgramMajor.slice(2));
      return {
        programId: null,
        majorId: Number.isNaN(majorId) ? null : majorId,
      };
    }
    if (selectedProgramMajor.startsWith("p:")) {
      const programId = parseInt(selectedProgramMajor.slice(2));
      return {
        programId: Number.isNaN(programId) ? null : programId,
        majorId: null,
      };
    }
    return { programId: null, majorId: null };
  }, [selectedProgramMajor]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Load majors/programs when modal opens
  useEffect(() => {
    const loadFilters = async () => {
      try {
        setIsLoadingFilters(true);
        const [majorsData, programsData] = await Promise.all([
          getMajors().catch(() => []),
          getPrograms().catch(() => []),
        ]);
        setMajors(majorsData);
        setPrograms(programsData);
      } finally {
        setIsLoadingFilters(false);
      }
    };

    if (isOpen && programs.length === 0 && majors.length === 0) {
      loadFilters();
    }
  }, [isOpen, majors.length, programs.length]);

  // Handle Esc key to close modal and prevent body scroll
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setSearchQuery("");
        setStudents([]);
        setError(null);
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!isOpen) {
      return;
    }

    if (searchQuery.trim().length < 2) {
      setStudents([]);
      setError(null);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(searchQuery.trim());
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, isOpen, selectedProgramMajor]);

  const performSearch = async (query: string) => {
    if (query.length < 2) {
      setStudents([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        query: query,
        limit: "50",
      });

      // Apply selected combined filter: major preferred; otherwise program
      if (selectedFilter.majorId) {
        params.append("majorId", String(selectedFilter.majorId));
      } else if (selectedFilter.programId) {
        params.append("programId", String(selectedFilter.programId));
      }

      const url = `/api/auth/students/search?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to search students");
      }

      const data = await response.json();
      setStudents(data.data || []);
    } catch (err: any) {
      setError(err.message || "An error occurred while searching");
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (studentNumber: string) => {
    onSelect(studentNumber);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    setStudents([]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={handleClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{
            backgroundColor: `${colors.primary}08`,
            borderColor: `${colors.primary}15`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${colors.secondary}20` }}
            >
              <Search className="w-6 h-6" style={{ color: colors.secondary }} />
            </div>
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: colors.primary }}
              >
                Search Student
              </h2>
              <p className="text-sm text-gray-600">
                Search by student number or name, and optionally filter by program/major
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-white/60 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b" style={{ borderColor: `${colors.primary}15` }}>
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim().length >= 2) {
                  e.preventDefault();
                  performSearch(searchQuery.trim());
                }
              }}
              placeholder="Enter student number or name..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {isLoading && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.secondary }} />
              </div>
            )}
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700">
              Program - Major
            </label>
            <select
              value={selectedProgramMajor}
              onChange={(e) => setSelectedProgramMajor(e.target.value)}
              className="mt-1 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={isLoadingFilters}
            >
              <option value="all">All</option>
              {programMajorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Examples: <span className="font-mono">BEED - Filipino</span>,{" "}
              <span className="font-mono">BSIT - None</span>
            </p>
          </div>
          {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
            <p className="text-xs text-gray-500 mt-2 ml-1">
              Type at least 2 characters to search
            </p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {error && (
            <div
              className="p-4 rounded-lg mb-4"
              style={{ backgroundColor: "#FEE2E2", border: "1px solid #FECACA" }}
            >
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!error && searchQuery.trim().length < 2 && (
            <div className="text-center py-12">
              <User
                size={48}
                className="mx-auto mb-4"
                style={{ color: colors.tertiary, opacity: 0.5 }}
              />
              <p className="text-gray-600">
                Enter at least 2 characters to search for students
              </p>
            </div>
          )}

          {!error && searchQuery.trim().length >= 2 && !isLoading && students.length === 0 && (
            <div className="text-center py-12">
              <User
                size={48}
                className="mx-auto mb-4"
                style={{ color: colors.tertiary, opacity: 0.5 }}
              />
              <p className="text-gray-600">No students found</p>
              <p className="text-sm text-gray-500 mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {!error && students.length > 0 && (
            <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-100">
              <table className="w-full">
                <thead>
                  <tr
                    className="border-b"
                    style={{ borderColor: colors.tertiary + "30" }}
                  >
                    <th
                      className="text-left py-3 px-4 text-sm font-semibold"
                      style={{ color: colors.primary }}
                    >
                      Student Number
                    </th>
                    <th
                      className="text-left py-3 px-4 text-sm font-semibold"
                      style={{ color: colors.primary }}
                    >
                      Full Name
                    </th>
                    <th
                      className="text-left py-3 px-4 text-sm font-semibold"
                      style={{ color: colors.primary }}
                    >
                      Course / Program
                    </th>
                    <th
                      className="text-left py-3 px-4 text-sm font-semibold"
                      style={{ color: colors.primary }}
                    >
                      Year Level
                    </th>
                    <th
                      className="text-left py-3 px-4 text-sm font-semibold"
                      style={{ color: colors.primary }}
                    >
                      Status
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-semibold"
                      style={{ color: colors.primary }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                      style={{ borderColor: colors.tertiary + "20" }}
                      onClick={() => handleSelect(student.student_number)}
                    >
                      <td className="py-3 px-4">
                        <span
                          className="font-medium text-sm"
                          style={{ color: colors.primary }}
                        >
                          {student.student_number}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700">
                          {student.full_name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700">
                          {student.course_program || student.program_code || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {student.year_level || student.term || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            student.status_code === 1
                              ? "bg-green-100 text-green-700"
                              : student.status_code === 4
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {student.status || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleSelect(student.student_number)}
                          className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-all"
                          style={{ backgroundColor: colors.secondary }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.tertiary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = colors.secondary;
                          }}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex justify-end gap-3"
          style={{
            borderColor: `${colors.primary}15`,
            backgroundColor: `${colors.primary}04`,
          }}
        >
          <button
            onClick={handleClose}
            className="px-6 py-2.5 rounded-lg font-medium transition-colors"
            style={{
              color: colors.primary,
              border: "1px solid #D1D5DB",
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
        </div>
      </div>
    </div>
  );
};

export default StudentSearchModal;

