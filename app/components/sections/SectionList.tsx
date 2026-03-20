'use client';

import React, { useState, useEffect } from 'react';
import { SectionResponse } from '../../types/sectionTypes';
import { getSections } from '../../utils/sectionApi';
import { colors } from '../../colors';
import { Users, GraduationCap, Calendar, UserPlus, CheckCircle, Lock, Unlock, Pencil, Check, X as XIcon, Loader2 } from 'lucide-react';
import Pagination from '../common/Pagination';

interface SectionListProps {
  searchTerm?: string;
  statusFilter?: string;
  academicYearFilter?: string;
  semesterFilter?: string;
  onFilteredSectionsChange?: (sections: SectionResponse[]) => void;
  onPrefetchSchedule?: (section: SectionResponse) => void;
  onCreateSchedule?: (section: SectionResponse) => void;
  onViewSchedule?: (section: SectionResponse) => void;
  onAssignStudents?: (section: SectionResponse) => void;
  onActivate?: (section: SectionResponse) => void;
  onLock?: (section: SectionResponse) => void;
  onUnlock?: (section: SectionResponse) => void;
}

export function SectionList({
  searchTerm = '',
  statusFilter = 'all',
  academicYearFilter = '',
  semesterFilter = '',
  onFilteredSectionsChange,
  onPrefetchSchedule,
  onCreateSchedule,
  onViewSchedule,
  onAssignStudents,
  onActivate,
  onLock,
  onUnlock
}: SectionListProps) {
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [filteredSections, setFilteredSections] = useState<SectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Inline capacity editing
  const [editingCapacityId, setEditingCapacityId] = useState<number | null>(null);
  const [capacityInput, setCapacityInput] = useState('');
  const [savingCapacityId, setSavingCapacityId] = useState<number | null>(null);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);

  useEffect(() => {
    loadSections();
  }, [academicYearFilter, semesterFilter]);

  // Filter sections when search term or status filter changes
  useEffect(() => {
    filterSections();
  }, [sections, searchTerm, statusFilter]);

  useEffect(() => {
    onFilteredSectionsChange?.(filteredSections);
  }, [filteredSections, onFilteredSectionsChange]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, academicYearFilter, semesterFilter]);

  const loadSections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSections({
        academicYear: academicYearFilter || undefined,
        semester: semesterFilter || undefined,
      });
      setSections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const runActionWithLoading = async (key: string, action?: () => void | Promise<void>) => {
    if (!action) return;
    setActionLoadingKey(key);
    try {
      await Promise.resolve(action());
    } finally {
      setActionLoadingKey((current) => (current === key ? null : current));
    }
  };

  const saveCapacity = async (sectionId: number) => {
    const val = parseInt(capacityInput);
    if (isNaN(val) || val < 1) return;
    setSavingCapacityId(sectionId);
    try {
      const res = await fetch(`/api/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxCapacity: val }),
      });
      if (res.ok) {
        setSections(prev =>
          prev.map(s => s.id === sectionId ? { ...s, maxCapacity: val } : s)
        );
        setEditingCapacityId(null);
      }
    } catch {
      // ignore
    } finally {
      setSavingCapacityId(null);
    }
  };

  const filterSections = () => {
    let filtered = [...sections];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(section => 
        section.sectionName?.toLowerCase().includes(searchLower) ||
        section.programCode?.toLowerCase().includes(searchLower) ||
        section.programName?.toLowerCase().includes(searchLower) ||
        section.advisor?.toLowerCase().includes(searchLower) ||
        section.yearLevel?.toString().includes(searchLower) ||
        section.academicYear?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(section => section.status === statusFilter);
    }

    setFilteredSections(filtered);
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredSections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSections = filteredSections.slice(startIndex, endIndex);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          bg: '#FEF3C7',
          text: '#92400E',
          border: '#FDE68A',
        };
      case 'active':
        return {
          bg: '#ECFDF5',
          text: '#047857',
          border: '#A7F3D0',
        };
      case 'locked':
        return {
          bg: '#E0E7FF',
          text: '#3730A3',
          border: '#C7D2FE',
        };
      case 'closed':
        return {
          bg: '#FEE2E2',
          text: '#991B1B',
          border: '#FECACA',
        };
      default:
        return {
          bg: '#F3F4F6',
          text: '#374151',
          border: '#E5E7EB',
        };
    }
  };

  const formatSemesterLabel = (semester: string) => {
    switch (semester?.toLowerCase()) {
      case 'first':
        return 'First Semester';
      case 'second':
        return 'Second Semester';
      case 'summer':
        return 'Summer';
      default:
        return semester;
    }
  };

  return (
    <div>
      {error && (
        <div 
          className="border rounded-lg p-4 text-sm"
          style={{
            backgroundColor: `${colors.danger}10`,
            borderColor: `${colors.danger}30`,
            color: colors.danger,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.secondary }}></div>
            <p className="text-sm" style={{ color: colors.neutral }}>Loading sections...</p>
          </div>
        </div>
      ) : (
        <div 
          className="rounded-2xl shadow-sm border overflow-hidden"
          style={{
            backgroundColor: colors.paper,
            borderColor: colors.neutralBorder,
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr
                  style={{
                    backgroundColor: `${colors.primary}05`,
                    borderBottom: `1px solid ${colors.primary}10`,
                  }}
                >
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Section</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Program</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Year</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Term</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Advisor</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Capacity</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">Status</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedSections.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div
                          className="p-3 rounded-full"
                          style={{ backgroundColor: `${colors.primary}05` }}
                        >
                          <Users className="w-6 h-6" style={{ color: colors.primary }} />
                        </div>
                        <p className="font-medium">
                          {searchTerm || statusFilter !== 'all' ? 'No sections match your filters' : 'No sections found'}
                        </p>
                        <p className="text-sm text-gray-400">
                          {searchTerm || statusFilter !== 'all' 
                            ? 'Try adjusting your search or filters' 
                            : 'Create a new section to get started'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedSections.map((section) => {
                    const statusStyles = getStatusColor(section.status);
                    return (
                      <tr key={section.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-7 w-7">
                              <div
                                className="h-7 w-7 rounded-lg flex items-center justify-center shadow-sm"
                                style={{
                                  backgroundColor: 'white',
                                  border: `1px solid ${colors.primary}10`,
                                }}
                              >
                                <Users className="h-3.5 w-3.5" style={{ color: colors.primary }} />
                              </div>
                            </div>
                            <div className="ml-2">
                              <div className="text-xs font-semibold" style={{ color: colors.primary }}>
                                {section.sectionName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {section.programCode ? (
                            <div>
                              <div className="text-xs font-medium" style={{ color: colors.primary }}>
                                {section.programCode}
                              </div>
                              {section.programName && (
                                <div className="text-[10px] text-gray-500 truncate max-w-[150px]">
                                  {section.programName}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">ID: {section.programId}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="w-3 h-3 text-gray-400" />
                            <span className="text-xs font-medium text-gray-700">{section.yearLevel}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-xs font-medium text-gray-700">
                              {section.academicYear}-{formatSemesterLabel(section.semester)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="text-xs font-medium text-gray-700">{section.advisor}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {editingCapacityId === section.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                autoFocus
                                value={capacityInput}
                                onChange={e => setCapacityInput(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveCapacity(section.id);
                                  if (e.key === 'Escape') setEditingCapacityId(null);
                                }}
                                className="w-16 px-1.5 py-0.5 text-xs border rounded focus:outline-none focus:ring-1"
                                style={{ borderColor: colors.secondary, color: colors.primary }}
                              />
                              <button
                                onClick={() => saveCapacity(section.id)}
                                disabled={savingCapacityId === section.id}
                                className="p-0.5 rounded hover:bg-green-100"
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              </button>
                              <button
                                onClick={() => setEditingCapacityId(null)}
                                className="p-0.5 rounded hover:bg-red-100"
                                title="Cancel"
                              >
                                <XIcon className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group/cap">
                              <Users className="w-3 h-3 text-gray-400" />
                              <span className={`text-xs font-medium ${section.maxCapacity === 0 ? 'text-amber-600' : 'text-gray-700'}`}>
                                {section.studentCount} / {section.maxCapacity === 0 ? 'Not set' : section.maxCapacity}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingCapacityId(section.id);
                                  setCapacityInput(section.maxCapacity > 0 ? section.maxCapacity.toString() : '');
                                }}
                                className="opacity-0 group-hover/cap:opacity-100 p-0.5 rounded hover:bg-gray-100 transition-opacity"
                                title="Edit capacity"
                              >
                                <Pencil className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
                            style={{
                              backgroundColor: statusStyles.bg,
                              color: statusStyles.text,
                              borderColor: statusStyles.border,
                            }}
                          >
                            <span
                              className="w-1 h-1 rounded-full mr-1"
                              style={{ backgroundColor: statusStyles.text }}
                            />
                            {section.status.charAt(0).toUpperCase() + section.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex justify-end gap-2">
                            {section.status === 'draft' && (
                              <>
                                <button
                                  onClick={() =>
                                    runActionWithLoading(`schedule-${section.id}`, () =>
                                      onCreateSchedule?.(section),
                                    )
                                  }
                                  onMouseEnter={() => onPrefetchSchedule?.(section)}
                                  onFocus={() => onPrefetchSchedule?.(section)}
                                  disabled={actionLoadingKey === `schedule-${section.id}`}
                                  className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 hover:shadow-md"
                                  style={{
                                    backgroundColor: `${colors.primary}12`,
                                    color: colors.primary,
                                  }}
                                  title="Build Schedule"
                                >
                                  {actionLoadingKey === `schedule-${section.id}` ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>Loading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Calendar className="w-3.5 h-3.5" />
                                      <span>Schedule</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() =>
                                    runActionWithLoading(`activate-${section.id}`, () =>
                                      onActivate?.(section),
                                    )
                                  }
                                  disabled={actionLoadingKey === `activate-${section.id}`}
                                  className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 hover:shadow-md"
                                  style={{
                                    backgroundColor: '#D1FAE5',
                                    color: '#059669',
                                  }}
                                  title="Activate Section"
                                >
                                  {actionLoadingKey === `activate-${section.id}` ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>Loading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      <span>Activate</span>
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                            {section.status === 'active' && (
                              <>
                                <button
                                  onClick={() =>
                                    runActionWithLoading(`schedule-${section.id}`, () =>
                                      onViewSchedule?.(section),
                                    )
                                  }
                                  onMouseEnter={() => onPrefetchSchedule?.(section)}
                                  onFocus={() => onPrefetchSchedule?.(section)}
                                  disabled={actionLoadingKey === `schedule-${section.id}`}
                                  className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 hover:shadow-md"
                                  style={{
                                    backgroundColor: `${colors.primary}12`,
                                    color: colors.primary,
                                  }}
                                  title="View/Edit Schedule"
                                >
                                  {actionLoadingKey === `schedule-${section.id}` ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>Loading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Calendar className="w-3.5 h-3.5" />
                                      <span>Schedule</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() =>
                                    runActionWithLoading(`assign-${section.id}`, () =>
                                      onAssignStudents?.(section),
                                    )
                                  }
                                  disabled={actionLoadingKey === `assign-${section.id}`}
                                  className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 hover:shadow-md"
                                  style={{
                                    backgroundColor: `${colors.secondary}14`,
                                    color: colors.secondary,
                                  }}
                                  title="Assign Students to Section"
                                >
                                  {actionLoadingKey === `assign-${section.id}` ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>Loading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserPlus className="w-3.5 h-3.5" />
                                      <span>Assign</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() =>
                                    runActionWithLoading(`lock-${section.id}`, () =>
                                      onLock?.(section),
                                    )
                                  }
                                  disabled={actionLoadingKey === `lock-${section.id}`}
                                  className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 hover:shadow-md"
                                  style={{
                                    backgroundColor: `${colors.info}14`,
                                    color: colors.info,
                                  }}
                                  title="Lock Section"
                                >
                                  {actionLoadingKey === `lock-${section.id}` ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>Loading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-3.5 h-3.5" />
                                      <span>Lock</span>
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                            {section.status === 'locked' && (
                              <button
                                onClick={() =>
                                  runActionWithLoading(`unlock-${section.id}`, () =>
                                    onUnlock?.(section),
                                  )
                                }
                                disabled={actionLoadingKey === `unlock-${section.id}`}
                                className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 hover:shadow-md"
                                style={{
                                  backgroundColor: '#FEF3C7',
                                  color: '#D97706',
                                }}
                                title="Unlock Section"
                              >
                                {actionLoadingKey === `unlock-${section.id}` ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Loading...</span>
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>Unlock</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {filteredSections.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredSections.length}
              itemName="sections"
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
