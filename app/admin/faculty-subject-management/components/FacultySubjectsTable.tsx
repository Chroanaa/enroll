'use client';

import React, { useState, useEffect } from 'react';
import { colors } from '../../../colors';
import { Plus, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import AddSubjectModal from './AddSubjectModal';

interface Schedule {
  id: number;
  sectionId: number;
  sectionName: string;
  curriculumCourseId: number;
  facultyId: number | null;
  roomId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  academicYear: string;
  semester: string;
  courseCode: string;
  courseTitle: string;
  room: {
    id: number;
    room_number: string;
  };
  section?: {
    section_name: string;
  };
}

interface FacultySubjectsTableProps {
  facultyId: number;
  academicYear: string;
  semester: string;
  onWorkloadChange: (count: number) => void;
}

export default function FacultySubjectsTable({
  facultyId,
  academicYear,
  semester,
  onWorkloadChange,
}: FacultySubjectsTableProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, [facultyId, academicYear, semester]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/class-schedule?facultyId=${facultyId}&academicYear=${academicYear}&semester=${semester}`
      );
      if (!response.ok) throw new Error('Failed to fetch schedules');
      const result = await response.json();
      
      setSchedules(result.data);
      onWorkloadChange(result.data.length);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scheduleId: number) => {
    try {
      const response = await fetch(`/api/class-schedule/${scheduleId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete schedule');
      await fetchSchedules();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    }
  };

  const formatTime = (timeStr: string): string => {
    const date = new Date(timeStr);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="space-y-4">
      {/* Add Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
          style={{ backgroundColor: colors.primary }}
        >
          <Plus className="w-4 h-4" />
          Add Subject
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: colors.paper,
            border: `1px solid ${colors.tertiary}20`,
          }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: `${colors.primary}08` }}>
                <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>
                  Subject
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>
                  Section
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>
                  Day
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>
                  Time
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>
                  Room
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold" style={{ color: colors.primary }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm" style={{ color: colors.neutral }}>
                    No subjects assigned yet
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => (
                  <tr
                    key={schedule.id}
                    className="border-t transition-colors"
                    style={{ borderColor: `${colors.tertiary}15` }}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-sm" style={{ color: colors.primary }}>
                          {schedule.courseCode}
                        </div>
                        <div className="text-xs" style={{ color: colors.neutral }}>
                          {schedule.courseTitle}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: colors.primary }}>
                      {schedule.sectionName || schedule.section?.section_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: colors.primary }}>
                      {schedule.dayOfWeek}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: colors.primary }}>
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: colors.primary }}>
                      {schedule.room.room_number}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {deleteConfirm === schedule.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDelete(schedule.id)}
                            className="px-3 py-1 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: colors.danger }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: `${colors.neutral}20`,
                              color: colors.primary,
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(schedule.id)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ backgroundColor: `${colors.danger}15` }}
                        >
                          <Trash2 className="w-4 h-4" style={{ color: colors.danger }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddModal && (
        <AddSubjectModal
          facultyId={facultyId}
          academicYear={academicYear}
          semester={semester}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchSchedules();
          }}
        />
      )}
    </div>
  );
}
