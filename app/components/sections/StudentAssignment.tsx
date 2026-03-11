'use client';

import React, { useState, useEffect } from 'react';
import { SectionResponse } from '../../types/sectionTypes';
import {
  bulkAssignStudents,
  getStudentAssignments,
  getEligibleStudents
} from '../../utils/sectionApi';
import { colors } from '../../colors';
import { Users, Search, X, UserPlus, CheckCircle2, AlertTriangle, Eye, ChevronDown, FileText } from 'lucide-react';
import { formatProgramDisplay } from '../../utils/programUtils';
import ConfirmationModal from '../common/ConfirmationModal';
import RegistrationPDFViewer from '../enrollment/RegistrationPDFViewer';
import SectionStudentListPDFViewer from './SectionStudentListPDFViewer';

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
  const [assignedStudents, setAssignedStudents] = useState<any[]>([]);
  const [overrideCapacity, setOverrideCapacity] = useState(false);
  const [showAssigned, setShowAssigned] = useState(false);

  // Warning modal: shown when any selected student has no payment/assessment
  const [noPaymentWarning, setNoPaymentWarning] = useState<{ open: boolean; names: string[] }>({
    open: false,
    names: []
  });

  // Registration PDF viewer for assigned students
  const [pdfViewer, setPdfViewer] = useState<{ open: boolean; data: any | null; loading: boolean }>({
    open: false,
    data: null,
    loading: false
  });

  // Section student list PDF viewer
  const [sectionListOpen, setSectionListOpen] = useState(false);

  const [filters, setFilters] = useState({
    program: '',
    yearLevel: '',
    searchTerm: ''
  });

  type StatusFilter = 'ready' | 'no_payment' | 'assigned' | 'no_subjects' | 'all';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ready');

  useEffect(() => {
    if (isOpen && section) {
      loadEligibleStudents();
      loadAssignedStudents();
      setOverrideCapacity(false);
      setShowAssigned(false);
      setStatusFilter('ready');
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
      setAssignedStudents(assignments);
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
    const selectableStudents = filteredStudents.filter(s => !s.isAssigned);
    if (selectedStudents.size === selectableStudents.length && selectableStudents.length > 0) {
      setSelectedStudents(new Set());
    } else {
      const allNumbers = selectableStudents.map((s) => s.studentNumber);
      setSelectedStudents(new Set(allNumbers));
    }
  };

  const handleViewStudent = async (studentNumber: string) => {
    setPdfViewer({ open: true, data: null, loading: true });
    try {
      const params = new URLSearchParams({
        studentNumber,
        academicYear: section!.academicYear,
        semester: section!.semester
      });
      const res = await fetch(`/api/auth/enrollment/registration?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load registration');
      // API returns { success: true, data: registrationData } — pass only the inner data object
      setPdfViewer({ open: true, data: json.data ?? json, loading: false });
    } catch (err) {
      setPdfViewer({ open: false, data: null, loading: false });
      setError(err instanceof Error ? err.message : 'Failed to load student registration');
    }
  };

  const handleAssignStudents = async () => {
    if (selectedStudents.size === 0) {
      setError('Select at least one student');
      return;
    }

    // Check if any selected student has no assessment/payment
    const noPaymentStudents = students.filter(
      s => selectedStudents.has(s.studentNumber) && !s.hasAssessment
    );
    if (noPaymentStudents.length > 0 && !noPaymentWarning.open) {
      setNoPaymentWarning({
        open: true,
        names: noPaymentStudents.map(s => `${s.firstName} ${s.lastName} (${s.studentNumber})`)
      });
      return;
    }
    setNoPaymentWarning({ open: false, names: [] });

    setLoading(true);
    setError(null);

    try {
      const response = await bulkAssignStudents({
        sectionId: section!.id,
        studentNumbers: Array.from(selectedStudents),
        academicYear: section!.academicYear,
        semester: section!.semester,
        overrideCapacity
      });

      const failedCount = Array.isArray(response.failed) ? response.failed.length : (response.failed as unknown as number) || 0;
      const assignedCount = response.assigned ?? 0;
      if (failedCount > 0) {
        const failedReasons = Array.isArray(response.failed)
          ? response.failed.map((f: any) => `${f.studentNumber}: ${f.reason}`).join(', ')
          : '';
        setError(`Assigned: ${assignedCount}, Failed: ${failedCount}${failedReasons ? ` — ${failedReasons}` : ''}`);
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

  const categoryCounts = {
    ready:       students.filter(s => !s.isAssigned && s.hasEnrolledSubjects && s.hasAssessment && s.hasPaid).length,
    no_payment:  students.filter(s => !s.isAssigned && s.hasAssessment && !s.hasPaid).length,
    assigned:    students.filter(s => s.isAssigned).length,
    no_subjects: students.filter(s => !s.isAssigned && !s.hasEnrolledSubjects).length,
    all:         students.length,
  };

  const filteredStudents = students.filter((student) => {
    let matchesStatus = true;
    if (statusFilter === 'ready') {
      matchesStatus = !student.isAssigned && !!student.hasEnrolledSubjects && !!student.hasAssessment && !!student.hasPaid;
    } else if (statusFilter === 'no_payment') {
      matchesStatus = !student.isAssigned && !!student.hasAssessment && !student.hasPaid;
    } else if (statusFilter === 'assigned') {
      matchesStatus = !!student.isAssigned;
    } else if (statusFilter === 'no_subjects') {
      matchesStatus = !student.isAssigned && !student.hasEnrolledSubjects;
    }

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

    return matchesStatus && matchesSearch;
  });

  if (!section || !isOpen) return null;

  const assigned = assignedStudents.length;
  const regularCount = assignedStudents.filter(s => s.assignmentType === 'regular').length;
  const irregularCount = assignedStudents.filter(s => s.assignmentType === 'irregular').length;
  const isFull = section.maxCapacity > 0 && section.studentCount >= section.maxCapacity;
  const canAssignMore = !isFull || overrideCapacity;

  return (
    <>
      {/* Section student list PDF viewer — rendered outside the modal so it covers everything */}
      {sectionListOpen && (
        <SectionStudentListPDFViewer
          sectionName={section.sectionName}
          programCode={section.programCode ?? ''}
          programName={section.programName ?? ''}
          yearLevel={section.yearLevel}
          academicYear={section.academicYear}
          semester={section.semester}
          students={assignedStudents}
          onClose={() => setSectionListOpen(false)}
        />
      )}

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
                Capacity: {section.studentCount} / {section.maxCapacity === 0 ? '∞' : section.maxCapacity}
                {isFull && !overrideCapacity && <span className="text-red-600 font-medium"> (FULL)</span>}
                {isFull && overrideCapacity && <span className="text-yellow-600 font-medium"> (OVERRIDE ON)</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSectionListOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:shadow-sm"
              style={{ color: colors.primary, backgroundColor: `${colors.primary}12`, border: `1px solid ${colors.primary}20` }}
              title="View / Print student list for this section"
            >
              <FileText className="w-3.5 h-3.5" />
              View Section List ({assignedStudents.length})
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
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

            {/* Status filter dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-xs font-medium cursor-pointer transition-all focus:outline-none"
                style={{
                  color: colors.primary,
                  backgroundColor: colors.paper,
                  borderColor:
                    statusFilter === 'ready' ? `${colors.success}60` :
                    statusFilter === 'no_payment' ? '#F59E0B60' :
                    statusFilter === 'assigned' ? '#6B728060' :
                    statusFilter === 'no_subjects' ? `${colors.danger}60` :
                    '#E5E7EB',
                  boxShadow:
                    statusFilter === 'ready' ? `0 0 0 2px ${colors.success}20` :
                    statusFilter === 'no_payment' ? '0 0 0 2px #F59E0B20' :
                    statusFilter === 'assigned' ? '0 0 0 2px #6B728020' :
                    statusFilter === 'no_subjects' ? `0 0 0 2px ${colors.danger}20` :
                    'none',
                }}
              >
                <option value="ready">✓ Has Assessment &amp; Payment ({categoryCounts.ready})</option>
                <option value="no_payment">⚠ No Payment, Has Assessment ({categoryCounts.no_payment})</option>
                <option value="assigned">↗ Already Assigned ({categoryCounts.assigned})</option>
                <option value="no_subjects">✕ No Enrolled Subjects ({categoryCounts.no_subjects})</option>
                <option value="all">All Students ({categoryCounts.all})</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            </div>
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
                          selectedStudents.size > 0 &&
                          selectedStudents.size === filteredStudents.filter(s => !s.isAssigned).length
                        }
                        onChange={handleSelectAll}
                        disabled={!canAssignMore || filteredStudents.filter(s => !s.isAssigned).length === 0}
                        className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer"
                        style={{ accentColor: colors.secondary }}
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Student Number</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Name</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Payment</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Subjects</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Program</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Status</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.secondary }}></div>
                          <p className="text-sm text-gray-500">Loading students...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
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
                    filteredStudents.map((student) => {
                      const alreadyAssigned = !!student.isAssigned;
                      return (
                        <tr
                          key={student.studentId}
                          className={`group transition-colors ${
                            !student.hasEnrolledSubjects ? 'bg-red-50/40' :
                            'hover:bg-gray-50/50'
                          }`}
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedStudents.has(student.studentNumber)}
                              onChange={() => handleSelectStudent(student.studentNumber)}
                              disabled={
                                alreadyAssigned ||
                                !student.hasEnrolledSubjects ||
                                (!canAssignMore && !selectedStudents.has(student.studentNumber))
                              }
                              className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer"
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
                          {/* Payment Mode + Amount */}
                          <td className="px-3 py-2 whitespace-nowrap">
                            {student.hasAssessment ? (
                              <div className="flex flex-col gap-0.5">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  student.paymentMode === 'cash'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {student.paymentMode === 'cash' ? 'Cash' : 'Installment'}
                                </span>
                                <span className="text-[10px] text-gray-500 font-medium">
                                  ₱{(student.paymentMode === 'cash'
                                    ? (student.totalDueCash ?? student.totalDue)
                                    : (student.totalDueInstallment ?? student.totalDue)
                                  )?.toLocaleString()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">No assessment</span>
                            )}
                          </td>
                          {/* Enrolled Subjects Count */}
                          <td className="px-3 py-2 whitespace-nowrap">
                            {student.hasEnrolledSubjects ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700">
                                {student.enrolledSubjectCount} subj
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-600">
                                <AlertTriangle className="w-3 h-3" />
                                No subjects
                              </span>
                            )}
                          </td>
                          {/* Program + Major */}
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`text-[10px] font-medium ${alreadyAssigned ? 'text-gray-400' : 'text-gray-700'}`}>
                              {student.majorName
                                ? `${student.programCode} - ${student.majorName}`
                                : student.programCode}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {alreadyAssigned ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                                Assigned{student.assignedSectionName ? ` (${student.assignedSectionName})` : ''}
                              </span>
                            ) : !student.hasEnrolledSubjects ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600">
                                Cannot assign
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">
                                Available
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {alreadyAssigned && (
                              <button
                                onClick={() => handleViewStudent(student.studentNumber)}
                                title="View registration"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold border transition-colors hover:opacity-80"
                                style={{ color: colors.primary, borderColor: colors.primary, backgroundColor: `${colors.primary}10` }}
                              >
                                View
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
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
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: colors.info }}>
                <Users className="w-4 h-4" />
                <span>
                  Selected: <strong>{selectedStudents.size}</strong> |
                  Assigned: <strong>{assigned}</strong> |
                  Available: <strong>{section.maxCapacity === 0 ? '∞' : Math.max(0, section.maxCapacity - section.studentCount)}</strong>
                </span>
              </div>
              {assigned > 0 && (
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Regular: {regularCount}</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Irregular: {irregularCount}</span>
                  <button
                    onClick={() => setShowAssigned(v => !v)}
                    className="ml-auto text-blue-600 underline text-xs"
                  >
                    {showAssigned ? 'Hide' : 'View'} assigned list
                  </button>
                </div>
              )}
              {isFull && (
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={overrideCapacity}
                    onChange={e => setOverrideCapacity(e.target.checked)}
                    className="w-3.5 h-3.5 rounded"
                    style={{ accentColor: colors.secondary }}
                  />
                  <span className="font-medium text-yellow-700">Override capacity limit (section is full)</span>
                </label>
              )}
            </div>
          </div>

          {/* Assigned Students List */}
          {showAssigned && assignedStudents.length > 0 && (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: colors.neutralBorder }}
            >
              <div
                className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-600"
                style={{ backgroundColor: `${colors.primary}05`, borderBottom: `1px solid ${colors.primary}10` }}
              >
                Assigned Students ({assigned})
              </div>
              <div className="divide-y divide-gray-100 max-h-44 overflow-y-auto">
                {assignedStudents.map(s => (
                  <div key={s.studentNumber} className="flex items-center px-3 py-1.5 text-xs gap-2">
                    <span className="font-medium w-24 shrink-0" style={{ color: colors.primary }}>
                      {s.studentNumber}
                    </span>
                    <span className="text-gray-600 flex-1 truncate">{s.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium text-[10px] shrink-0 ${
                        s.assignmentType === 'irregular'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {s.assignmentType === 'irregular' ? 'Irregular' : 'Regular'}
                    </span>
                    {s.assignmentType === 'irregular' && s.subjectCount > 0 && (
                      <span className="text-gray-400 text-[10px] shrink-0">{s.subjectCount} subj</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* No-payment warning modal */}
        <ConfirmationModal
          isOpen={noPaymentWarning.open}
          onClose={() => setNoPaymentWarning({ open: false, names: [] })}
          onConfirm={() => handleAssignStudents()}
          variant="warning"
          title="Students Without Payment"
          message={`The following student${noPaymentWarning.names.length > 1 ? 's have' : ' has'} no assessment/payment on record. You can still assign them, but please verify their payment status.\n\n${noPaymentWarning.names.map(n => `• ${n}`).join('\n')}`}
          confirmText="Assign Anyway"
          cancelText="Cancel"
        />

        {/* Registration PDF viewer overlay */}
        {pdfViewer.open && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ backgroundColor: 'transparent' }}
            onClick={() => setPdfViewer({ open: false, data: null, loading: false })}
          >
            <div
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl bg-white"
              onClick={e => e.stopPropagation()}
            >
              {pdfViewer.loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: colors.secondary }} />
                  <p className="text-sm text-gray-500">Loading registration...</p>
                </div>
              ) : pdfViewer.data ? (
                <RegistrationPDFViewer
                  data={pdfViewer.data}
                  onClose={() => setPdfViewer({ open: false, data: null, loading: false })}
                />
              ) : null}
            </div>
          </div>
        )}

        {/* Section student list PDF viewer — moved outside modal, see above */}

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
              !canAssignMore
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
    </>
  );
}
