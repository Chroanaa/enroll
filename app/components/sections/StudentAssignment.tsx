'use client';

import React, { useState, useEffect } from 'react';
import { SectionResponse } from '../../types/sectionTypes';
import {
  bulkAssignStudents,
  getStudentAssignments,
  getEligibleStudents
} from '../../utils/sectionApi';
import { colors } from '../../colors';
import { Users, Search, X, UserPlus, CheckCircle2 } from 'lucide-react';

interface StudentAssignmentProps {
  section: SectionResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StudentAssignment({
  section,
  isOpen,
  onClose,
  onSuccess
}: StudentAssignmentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set()
  );
  const [assigned, setAssigned] = useState(0);

  const [filters, setFilters] = useState({
    program: '',
    yearLevel: '',
    searchTerm: ''
  });

  useEffect(() => {
    if (isOpen && section) {
      loadEligibleStudents();
      loadAssignedStudents();
    }
  }, [isOpen, section]);

  const loadEligibleStudents = async () => {
    try {
      setLoading(true);
      
      // Validate section data
      if (!section!.academicYear || !section!.yearLevel || section!.yearLevel === 0) {
        setError('Section is missing required data (academic year or year level). Please update the section first.');
        setLoading(false);
        return;
      }
      
      const eligibleStudents = await getEligibleStudents(
        section!.programId,
        section!.yearLevel,
        section!.academicYear,
        section!.semester
      );
      setStudents(eligibleStudents);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load eligible students'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedStudents = async () => {
    try {
      const assignments = await getStudentAssignments({
        sectionId: section!.id,
        academicYear: section!.academicYear,
        semester: section!.semester
      });
      setAssigned(assignments.length);
    } catch (err) {
      console.error('Failed to load assigned students:', err);
    }
  };

  const handleSelectStudent = (studentNumber: string) => {
    setSelectedStudents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentNumber)) {
        newSet.delete(studentNumber);
      } else {
        newSet.add(studentNumber);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      const allNumbers = filteredStudents.map((s) => s.studentNumber);
      setSelectedStudents(new Set(allNumbers));
    }
  };

  const handleAssignStudents = async () => {
    if (selectedStudents.size === 0) {
      setError('Select at least one student');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await bulkAssignStudents({
        sectionId: section!.id,
        studentNumbers: Array.from(selectedStudents),
        academicYear: section!.academicYear,
        semester: section!.semester
      });

      if (response.failed > 0) {
        setError(
          `Assigned: ${response.success}, Failed: ${response.failed}`
        );
      } else {
        setError(null);
      }

      setSelectedStudents(new Set());
      loadEligibleStudents();
      loadAssignedStudents();
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to assign students'
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      !filters.searchTerm ||
      student.studentNumber
        ?.toLowerCase()
        .includes(filters.searchTerm.toLowerCase()) ||
      student.firstName
        ?.toLowerCase()
        .includes(filters.searchTerm.toLowerCase()) ||
      student.lastName
        ?.toLowerCase()
        .includes(filters.searchTerm.toLowerCase()) ||
      student.name
        ?.toLowerCase()
        .includes(filters.searchTerm.toLowerCase());

    return matchesSearch;
  });

  if (!section || !isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
        style={{
          backgroundColor: colors.paper,
          border: `1px solid ${colors.neutralBorder}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-3 flex items-center justify-between border-b"
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
              <UserPlus className="w-5 h-5" style={{ color: colors.secondary }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.primary }}>
                Assign Students - {section.sectionName}
              </h2>
              <p className="text-xs text-gray-500">
                Capacity: {section.studentCount} / {section.maxCapacity}
                {section.studentCount >= section.maxCapacity && (
                  <span className="text-red-600 font-medium"> (FULL)</span>
                )}
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

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Search and Filter */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student number or name..."
              value={filters.searchTerm}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  searchTerm: e.target.value
                }))
              }
              className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0"
              style={{
                outline: 'none',
                color: colors.primary,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.secondary;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div 
              className="border rounded-lg p-3 text-sm"
              style={{
                backgroundColor: `${colors.danger}10`,
                borderColor: `${colors.danger}30`,
                color: colors.danger,
              }}
            >
              {error}
            </div>
          )}

          {/* Students Table */}
          <div 
            className="rounded-2xl shadow-sm border overflow-hidden"
            style={{
              backgroundColor: colors.paper,
              borderColor: colors.neutralBorder,
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    style={{
                      backgroundColor: `${colors.primary}05`,
                      borderBottom: `1px solid ${colors.primary}10`,
                    }}
                  >
                    <th className="px-3 py-2 text-left w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedStudents.size === filteredStudents.length &&
                          filteredStudents.length > 0
                        }
                        onChange={handleSelectAll}
                        disabled={section.studentCount >= section.maxCapacity}
                        className="w-3.5 h-3.5 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        style={{ accentColor: colors.secondary }}
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Student Number</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Name</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.secondary }}></div>
                          <p className="text-sm text-gray-500">Loading students...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div
                            className="p-3 rounded-full"
                            style={{ backgroundColor: `${colors.primary}05` }}
                          >
                            <Users className="w-6 h-6" style={{ color: colors.primary }} />
                          </div>
                          <p className="font-medium">No eligible students found</p>
                          <p className="text-sm text-gray-400">Try adjusting your search</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.studentId} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedStudents.has(
                              student.studentNumber
                            )}
                            onChange={() =>
                              handleSelectStudent(student.studentNumber)
                            }
                            disabled={
                              section.studentCount >= section.maxCapacity &&
                              !selectedStudents.has(student.studentNumber)
                            }
                            className="w-3.5 h-3.5 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            style={{ accentColor: colors.secondary }}
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="text-xs font-medium" style={{ color: colors.primary }}>
                            {student.studentNumber}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="text-xs font-medium text-gray-700">
                            {student.firstName} {student.middleName} {student.lastName}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="text-xs text-gray-600">{student.email}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selection Info */}
          <div
            className="rounded-lg p-3 text-sm border"
            style={{
              backgroundColor: `${colors.info}10`,
              borderColor: `${colors.info}30`,
            }}
          >
            <div className="flex items-center gap-2 text-xs font-medium" style={{ color: colors.info }}>
              <Users className="w-4 h-4" />
              <span>
                Selected: <strong>{selectedStudents.size}</strong> | 
                Assigned: <strong>{assigned}</strong> | 
                Available: <strong>{section.maxCapacity - section.studentCount}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div 
          className="flex justify-end gap-3 px-5 py-4 border-t"
          style={{
            backgroundColor: colors.neutralLight,
            borderColor: colors.neutralBorder,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl transition-all font-medium flex items-center gap-2"
            style={{
              color: colors.primary,
              border: `1px solid ${colors.neutralBorder}`,
              backgroundColor: colors.paper,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.paper;
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAssignStudents}
            disabled={
              loading ||
              selectedStudents.size === 0 ||
              section.studentCount >= section.maxCapacity
            }
            className="px-6 py-2.5 text-white rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: colors.secondary,
              boxShadow: '0 4px 6px -1px rgba(149, 90, 39, 0.2)',
            }}
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading
              ? 'Assigning...'
              : `Assign ${selectedStudents.size} Student${selectedStudents.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
