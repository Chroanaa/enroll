"use client";
import React, { useState, useEffect, useRef } from "react";
import { X, Search, Loader2, User } from "lucide-react";
import { colors } from "../../colors";

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
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

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
  }, [searchQuery, isOpen]);

  const performSearch = async (query: string) => {
    if (query.length < 2) {
      setStudents([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/auth/students/search?query=${encodeURIComponent(query)}&limit=50`;
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
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={handleClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
        style={{ backgroundColor: "white" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
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
                Search by student number, name, or course/program
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b" style={{ borderColor: colors.tertiary + "30" }}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search
                className="h-5 w-5"
                style={{ color: colors.tertiary }}
              />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter student number, name, or course/program..."
              className="w-full pl-12 pr-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2"
              style={{
                borderColor: colors.tertiary + "30",
                color: colors.primary,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.secondary;
                e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.tertiary + "30";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {isLoading && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: colors.secondary }} />
              </div>
            )}
          </div>
          {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
            <p className="text-xs text-gray-500 mt-2 ml-1">
              Type at least 2 characters to search
            </p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
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
            <div className="overflow-x-auto">
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
                      className="border-b hover:bg-gray-50 transition-colors"
                      style={{ borderColor: colors.tertiary + "20" }}
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
          style={{ borderColor: colors.tertiary + "30" }}
        >
          <button
            onClick={handleClose}
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
        </div>
      </div>
    </div>
  );
};

export default StudentSearchModal;

