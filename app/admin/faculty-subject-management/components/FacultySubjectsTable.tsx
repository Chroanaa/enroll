'use client';

import React, { useState, useEffect } from 'react';
import { colors } from '../../../colors';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import AddSubjectModal from './AddSubjectModal';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import SuccessModal from '../../../components/common/SuccessModal';

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
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    schedule: Schedule | null;
  }>({
    isOpen: false,
    schedule: null
  });

  // Success modal state
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: ''
  });

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

  const handleDelete = async () => {
    if (!confirmModal.schedule) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/class-schedule/${confirmModal.schedule.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete schedule');
      
      setSuccessModal({
        isOpen: true,
        message: `Subject "${confirmModal.schedule.courseCode}" has been successfully removed from the faculty's schedule.`
      });
      
      await fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    } finally {
      setIsDeleting(false);
      setConfirmModal({ isOpen: false, schedule: null });
    }
  };

  const handleDeleteClick = (schedule: Schedule) => {
    setConfirmModal({
      isOpen: true,
      schedule
    });
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
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-white transition-all hover:shadow-md"
          style={{ backgroundColor: colors.secondary }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.primary)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.secondary)}
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
          className="rounded-xl overflow-hidden shadow-sm"
          style={{
            backgroundColor: 'white',
            border: `1px solid ${colors.neutralBorder}`,
          }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: colors.secondary }}>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                  Subject
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                  Section
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                  Day
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                  Time
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                  Room
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-white">
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
                    className="border-t transition-colors hover:bg-gray-50"
                    style={{ borderColor: colors.neutralBorder }}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-sm" style={{ color: colors.primary }}>
                          {schedule.courseCode}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: colors.neutral }}>
                          {schedule.courseTitle}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: colors.primary }}>
                      {schedule.sectionName || schedule.section?.section_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: colors.neutralDark }}>
                      {schedule.dayOfWeek}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: colors.neutralDark }}>
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: colors.secondary }}>
                      {schedule.room.room_number}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDeleteClick(schedule)}
                        className="p-2 rounded-lg transition-all hover:shadow-sm"
                        style={{ backgroundColor: `${colors.danger}15` }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = `${colors.danger}25`;
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = `${colors.danger}15`;
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Trash2 className="w-4 h-4" style={{ color: colors.danger }} />
                      </button>
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, schedule: null })}
        onConfirm={handleDelete}
        title="Remove Subject Assignment"
        message={
          confirmModal.schedule
            ? `Are you sure you want to remove "${confirmModal.schedule.courseCode}" (${confirmModal.schedule.courseTitle}) from this faculty's schedule?\n\nSection: ${confirmModal.schedule.sectionName || 'N/A'}\nDay: ${confirmModal.schedule.dayOfWeek}\nTime: ${formatTime(confirmModal.schedule.startTime)} - ${formatTime(confirmModal.schedule.endTime)}`
            : ''
        }
        confirmText="Remove Subject"
        variant="danger"
        icon={<Trash2 className="w-6 h-6" />}
        isLoading={isDeleting}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        message={successModal.message}
        autoClose={true}
        autoCloseDelay={3000}
      />
    </div>
  );
}
