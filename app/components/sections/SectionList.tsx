'use client';

import React, { useState, useEffect } from 'react';
import { SectionResponse } from '../../types/sectionTypes';
import { getSections } from '../../utils/sectionApi';
import { colors } from '../../colors';
import { Users, GraduationCap, Calendar, BookOpen, Edit2, UserPlus, CheckCircle, PlayCircle, Lock, Unlock, Eye } from 'lucide-react';

interface SectionListProps {
  onEdit?: (section: SectionResponse) => void;
  onCreateSchedule?: (section: SectionResponse) => void;
  onViewSchedule?: (section: SectionResponse) => void;
  onAssignStudents?: (section: SectionResponse) => void;
  onActivate?: (section: SectionResponse) => void;
  onLock?: (section: SectionResponse) => void;
  onUnlock?: (section: SectionResponse) => void;
}

export function SectionList({
  onEdit,
  onCreateSchedule,
  onViewSchedule,
  onAssignStudents,
  onActivate,
  onLock,
  onUnlock
}: SectionListProps) {
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSections();
      setSections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

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
                {sections.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div
                          className="p-3 rounded-full"
                          style={{ backgroundColor: `${colors.primary}05` }}
                        >
                          <Users className="w-6 h-6" style={{ color: colors.primary }} />
                        </div>
                        <p className="font-medium">No sections found</p>
                        <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sections.map((section) => {
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
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-gray-400" />
                            <span className="text-xs font-medium text-gray-700">
                              {section.studentCount} / {section.maxCapacity}
                            </span>
                          </div>
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
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => onEdit?.(section)}
                              className="px-2 py-1 rounded-md hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all text-blue-600 flex items-center gap-1"
                              title="Edit Section"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span className="text-[10px] font-medium">Edit</span>
                            </button>
                            {section.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => onCreateSchedule?.(section)}
                                  className="px-2 py-1 rounded-md hover:bg-purple-50 border border-transparent hover:border-purple-200 transition-all text-purple-600 flex items-center gap-1"
                                  title="Build Schedule"
                                >
                                  <Calendar className="w-3 h-3" />
                                  <span className="text-[10px] font-medium">Schedule</span>
                                </button>
                                <button
                                  onClick={() => onActivate?.(section)}
                                  className="px-2 py-1 rounded-md hover:bg-green-50 border border-transparent hover:border-green-200 transition-all text-green-600 flex items-center gap-1"
                                  title="Activate Section"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  <span className="text-[10px] font-medium">Activate</span>
                                </button>
                              </>
                            )}
                            {section.status === 'active' && (
                              <>
                                <button
                                  onClick={() => onViewSchedule?.(section)}
                                  className="px-2 py-1 rounded-md hover:bg-purple-50 border border-transparent hover:border-purple-200 transition-all text-purple-600 flex items-center gap-1"
                                  title="View/Edit Schedule"
                                >
                                  <Calendar className="w-3 h-3" />
                                  <span className="text-[10px] font-medium">Schedule</span>
                                </button>
                                <button
                                  onClick={() => onAssignStudents?.(section)}
                                  className="px-2 py-1 rounded-md hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-all text-orange-600 flex items-center gap-1"
                                  title="Assign Students"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span className="text-[10px] font-medium">Students</span>
                                </button>
                                <button
                                  onClick={() => onLock?.(section)}
                                  className="px-2 py-1 rounded-md hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all text-indigo-600 flex items-center gap-1"
                                  title="Lock Section"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span className="text-[10px] font-medium">Lock</span>
                                </button>
                              </>
                            )}
                            {section.status === 'locked' && (
                              <button
                                onClick={() => onUnlock?.(section)}
                                className="px-2 py-1 rounded-md hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all text-amber-600 flex items-center gap-1"
                                title="Unlock Section"
                              >
                                <Unlock className="w-3 h-3" />
                                <span className="text-[10px] font-medium">Unlock</span>
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
        </div>
      )}
    </div>
  );
}
