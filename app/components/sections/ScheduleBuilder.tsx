'use client';

import React, { useState, useEffect } from 'react';
import { SectionResponse } from '../../types/sectionTypes';
import {
  createClassSchedule,
  getClassSchedules,
  getSectionCurriculum,
  deleteClassSchedule
} from '../../utils/sectionApi';
import ConfirmationModal from '../common/ConfirmationModal';
import SuccessModal from '../common/SuccessModal';
import { WeeklyScheduleCalendar } from './WeeklyScheduleCalendar';
import { colors } from '../../colors';
import { 
  Calendar, 
  BookOpen, 
  Users, 
  MapPin, 
  Clock, 
  X, 
  CheckCircle2, 
  Trash2,
  GraduationCap,
  UserCircle,
  Building2,
  CalendarDays,
  Info
} from 'lucide-react';

interface ScheduleBuilderProps {
  section: SectionResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00'
];

export function ScheduleBuilder({
  section,
  isOpen,
  onClose
}: ScheduleBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [allSchedules, setAllSchedules] = useState<any[]>([]); // All schedules across all sections

  const [formData, setFormData] = useState({
    curriculumCourseId: '',
    facultyId: '',
    roomId: '',
    dayOfWeek: '',
    startTime: '',
    endTime: ''
  });

  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    scheduleId: number | null;
    scheduleInfo: string;
  }>({
    isOpen: false,
    scheduleId: null,
    scheduleInfo: ''
  });
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: ''
  });

  useEffect(() => {
    if (isOpen && section) {
      loadScheduleData();
    }
  }, [isOpen, section]);

  const loadScheduleData = async () => {
    try {
      setLoadingData(true);
      setError(null);

      // Load curriculum for section (with programId)
      const curricData = await getSectionCurriculum(
        section!.programId,
        section!.yearLevel,
        section!.semester
      );
      setCurriculum(curricData);

      // Load all faculty
      const facultyResponse = await fetch('/api/auth/faculty');
      if (facultyResponse.ok) {
        const facultyData = await facultyResponse.json();
        // Filter only active faculty
        setFaculty(Array.isArray(facultyData) ? facultyData.filter((f: any) => f.status === 'active' || f.status === 1) : []);
      }

      // Load all rooms
      const roomsResponse = await fetch('/api/auth/room');
      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json();
        // Filter only available rooms
        setRooms(Array.isArray(roomsData) ? roomsData.filter((r: any) => r.status === 'available' || r.status === 'active') : []);
      }

      // Load existing schedules for this section
      const scheduleData = await getClassSchedules({
        sectionId: section!.id,
        academicYear: section!.academicYear,
        semester: section!.semester
      });
      setSchedules(scheduleData);

      // Load ALL schedules for the same academic year and semester (across all sections)
      // This is used for room conflict prevention
      const allScheduleData = await getClassSchedules({
        academicYear: section!.academicYear,
        semester: section!.semester
      });
      setAllSchedules(allScheduleData);
    } catch (err) {
      console.error('Failed to load schedule data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schedule data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Check if a time slot conflicts with existing room schedules (across ALL sections)
  const hasRoomConflict = (roomId: string, day: string, startTime: string, endTime: string): boolean => {
    if (!roomId || !day || !startTime || !endTime) return false;

    const startHour = parseInt(startTime.split(':')[0]);
    const startMin = parseInt(startTime.split(':')[1]);
    const endHour = parseInt(endTime.split(':')[0]);
    const endMin = parseInt(endTime.split(':')[1]);
    
    const proposedStart = startHour * 60 + startMin;
    const proposedEnd = endHour * 60 + endMin;

    // Check ALL schedules (across all sections) for the same room and day
    return allSchedules.some(schedule => {
      if (schedule.roomId !== parseInt(roomId)) return false;
      if (schedule.dayOfWeek !== day) return false;

      const existingStartDate = new Date(schedule.startTime);
      const existingEndDate = new Date(schedule.endTime);
      const existingStart = existingStartDate.getHours() * 60 + existingStartDate.getMinutes();
      const existingEnd = existingEndDate.getHours() * 60 + existingEndDate.getMinutes();

      // Check for overlap: (start1 < end2) AND (start2 < end1)
      return proposedStart < existingEnd && existingStart < proposedEnd;
    });
  };

  // Check if a specific start time would conflict (across ALL sections)
  const isStartTimeConflicted = (time: string): boolean => {
    if (!formData.roomId || !formData.dayOfWeek) return false;
    
    // Check for any overlapping schedules at this start time
    const startHour = parseInt(time.split(':')[0]);
    const startMin = parseInt(time.split(':')[1]);
    const proposedStart = startHour * 60 + startMin;

    return allSchedules.some(schedule => {
      if (schedule.roomId !== parseInt(formData.roomId)) return false;
      if (schedule.dayOfWeek !== formData.dayOfWeek) return false;

      const existingStartDate = new Date(schedule.startTime);
      const existingEndDate = new Date(schedule.endTime);
      const existingStart = existingStartDate.getHours() * 60 + existingStartDate.getMinutes();
      const existingEnd = existingEndDate.getHours() * 60 + existingEndDate.getMinutes();

      // A start time is conflicted if it falls within an existing schedule
      return proposedStart >= existingStart && proposedStart < existingEnd;
    });
  };

  // Check if a specific end time would conflict
  const isEndTimeConflicted = (time: string): boolean => {
    if (!formData.roomId || !formData.dayOfWeek || !formData.startTime) return false;
    
    return hasRoomConflict(formData.roomId, formData.dayOfWeek, formData.startTime, time);
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (
        !formData.curriculumCourseId ||
        !formData.facultyId ||
        !formData.roomId ||
        !formData.dayOfWeek ||
        !formData.startTime ||
        !formData.endTime
      ) {
        setError('All fields are required');
        setLoading(false);
        return;
      }

      // Validate time
      const startHour = parseInt(formData.startTime.split(':')[0]);
      const startMin = parseInt(formData.startTime.split(':')[1]);
      const endHour = parseInt(formData.endTime.split(':')[0]);
      const endMin = parseInt(formData.endTime.split(':')[1]);
      
      const startTotal = startHour * 60 + startMin;
      const endTotal = endHour * 60 + endMin;
      
      if (endTotal <= startTotal) {
        setError('End time must be after start time');
        setLoading(false);
        return;
      }

      // Check for room conflicts
      if (hasRoomConflict(formData.roomId, formData.dayOfWeek, formData.startTime, formData.endTime)) {
        setError('This room is already occupied during the selected time slot. Please choose a different time or room.');
        setLoading(false);
        return;
      }

      const startDate = new Date();
      startDate.setHours(startHour, startMin, 0);

      const endDate = new Date();
      endDate.setHours(endHour, endMin, 0);

      const schedule = await createClassSchedule({
        sectionId: section!.id,
        curriculumCourseId: parseInt(formData.curriculumCourseId),
        facultyId: parseInt(formData.facultyId),
        roomId: parseInt(formData.roomId),
        dayOfWeek: formData.dayOfWeek,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        academicYear: section!.academicYear,
        semester: section!.semester
      });

      // Reload schedules to get updated data
      const updatedSchedules = await getClassSchedules({
        sectionId: section!.id,
        academicYear: section!.academicYear,
        semester: section!.semester
      });
      setSchedules(updatedSchedules);

      // Also reload all schedules for conflict checking
      const updatedAllSchedules = await getClassSchedules({
        academicYear: section!.academicYear,
        semester: section!.semester
      });
      setAllSchedules(updatedAllSchedules);
      
      // Show success message
      const course = curriculum.find(c => c.id === parseInt(formData.curriculumCourseId));
      setSuccessModal({
        isOpen: true,
        message: `Schedule for ${course?.course_code || 'subject'} has been added successfully.`
      });
      
      setFormData({
        curriculumCourseId: '',
        facultyId: '',
        roomId: '',
        dayOfWeek: '',
        startTime: '',
        endTime: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = (schedule: any) => {
    const course = curriculum.find(c => c.id === schedule.curriculumCourseId);
    const facultyMember = faculty.find(f => f.id === schedule.facultyId);
    const room = rooms.find(r => r.id === schedule.roomId);
    
    setDeleteConfirm({
      isOpen: true,
      scheduleId: schedule.id,
      scheduleInfo: `${course?.course_code || 'Course'} - ${facultyMember ? `${facultyMember.first_name} ${facultyMember.last_name}` : 'Faculty'} - ${room?.room_number || 'Room'}`
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.scheduleId) return;

    try {
      setLoading(true);
      setError(null);
      
      await deleteClassSchedule(deleteConfirm.scheduleId);
      
      // Reload schedules
      const updatedSchedules = await getClassSchedules({
        sectionId: section!.id,
        academicYear: section!.academicYear,
        semester: section!.semester
      });
      setSchedules(updatedSchedules);

      // Also reload all schedules for conflict checking
      const updatedAllSchedules = await getClassSchedules({
        academicYear: section!.academicYear,
        semester: section!.semester
      });
      setAllSchedules(updatedAllSchedules);
      
      setSuccessModal({
        isOpen: true,
        message: 'Schedule has been deleted successfully.'
      });
      
      setDeleteConfirm({
        isOpen: false,
        scheduleId: null,
        scheduleInfo: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule');
    } finally {
      setLoading(false);
    }
  };

  if (!section || !isOpen) return null;

  const isReadOnly = section.status === 'active' || section.status === 'locked';
  const statusMessage = section.status === 'active' 
    ? 'Section is active. Schedule is frozen and cannot be modified.'
    : section.status === 'locked'
    ? 'Section is locked. No modifications allowed.'
    : '';

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-6xl my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200"
        style={{
          backgroundColor: colors.paper,
          border: `1px solid ${colors.neutralBorder}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-3 flex items-center justify-between border-b sticky top-0 z-10"
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
              <Calendar className="w-5 h-5" style={{ color: colors.secondary }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.primary }}>
                Build Schedule - {section.sectionName}
              </h2>
              <p className="text-xs" style={{ color: colors.neutral }}>
                {section.academicYear} • {section.semester.charAt(0).toUpperCase() + section.semester.slice(1)} Semester
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

        {/* Status Warning */}
        {isReadOnly && (
          <div
            className="mx-5 mt-3 p-3 rounded-lg border text-sm"
            style={{
              backgroundColor: `${colors.warning}10`,
              borderColor: `${colors.warning}30`,
              color: colors.warning,
            }}
          >
            {statusMessage}
          </div>
        )}

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {loadingData ? (
            <div className="text-center py-12">
              <div 
                className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto"
                style={{ borderColor: colors.secondary }}
              ></div>
              <p className="mt-3 text-sm" style={{ color: colors.neutral }}>
                Loading schedule data...
              </p>
            </div>
          ) : (
            <>
              {/* Summary Card */}
              {curriculum.length > 0 && (
                <div
                  className="rounded-2xl shadow-sm border p-4"
                  style={{
                    backgroundColor: colors.paper,
                    borderColor: colors.neutralBorder,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4" style={{ color: colors.secondary }} />
                    <h3 className="text-sm font-semibold" style={{ color: colors.primary }}>
                      Schedule Progress
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${colors.info}05` }}>
                      <div className="text-2xl font-bold" style={{ color: colors.info }}>
                        {curriculum.length}
                      </div>
                      <div className="text-xs mt-1" style={{ color: colors.neutral }}>
                        Total Subjects
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${colors.success}05` }}>
                      <div className="text-2xl font-bold" style={{ color: colors.success }}>
                        {schedules.length}
                      </div>
                      <div className="text-xs mt-1" style={{ color: colors.neutral }}>
                        Scheduled
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${colors.warning}05` }}>
                      <div className="text-2xl font-bold" style={{ color: colors.warning }}>
                        {curriculum.length - schedules.length}
                      </div>
                      <div className="text-xs mt-1" style={{ color: colors.neutral }}>
                        Remaining
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: `${colors.secondary}05` }}>
                      <div className="text-2xl font-bold" style={{ color: colors.secondary }}>
                        {curriculum.length > 0 ? Math.round((schedules.length / curriculum.length) * 100) : 0}%
                      </div>
                      <div className="text-xs mt-1" style={{ color: colors.neutral }}>
                        Complete
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Curriculum Subjects Panel */}
              <div
                className="rounded-2xl shadow-sm border p-4"
                style={{
                  backgroundColor: colors.paper,
                  borderColor: colors.neutralBorder,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" style={{ color: colors.secondary }} />
                    <h3 className="text-sm font-semibold" style={{ color: colors.primary }}>
                      Curriculum Subjects ({curriculum.length})
                    </h3>
                  </div>
                  <div className="text-xs" style={{ color: colors.neutral }}>
                    <span className="font-medium">{schedules.length}</span> scheduled
                  </div>
                </div>
                {curriculum.length === 0 ? (
                  <div className="text-center py-6">
                    <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: colors.neutral }} />
                    <p className="text-sm" style={{ color: colors.neutral }}>
                      No curriculum courses found for this program, year level, and semester.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {curriculum.map((course) => {
                      const isScheduled = schedules.some(s => s.curriculumCourseId === course.id);
                      return (
                        <div
                          key={course.id}
                          className={`p-2.5 rounded-lg border transition-all ${
                            isScheduled
                              ? 'border-green-300'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={{
                            backgroundColor: isScheduled ? `${colors.success}08` : 'white',
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs" style={{ color: colors.primary }}>
                                {course.course_code}
                              </div>
                              <div className="text-[10px] truncate mt-0.5" style={{ color: colors.neutral }}>
                                {course.descriptive_title}
                              </div>
                              <div className="text-[10px] mt-1.5" style={{ color: colors.neutral }}>
                                {course.units_total} units
                              </div>
                            </div>
                            {isScheduled && (
                              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: colors.success }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Schedule Form */}
              {!isReadOnly && (
                <div
                  className="rounded-2xl shadow-sm border p-5"
                  style={{
                    backgroundColor: colors.paper,
                    borderColor: colors.neutralBorder,
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <CalendarDays className="w-4 h-4" style={{ color: colors.secondary }} />
                    <h3 className="text-sm font-semibold" style={{ color: colors.primary }}>
                      Add Class Schedule
                    </h3>
                  </div>

                  <form onSubmit={handleAddSchedule} className="space-y-4">
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: colors.primary }}>
                          <BookOpen className="w-3.5 h-3.5" />
                          Subject <span style={{ color: colors.danger }}>*</span>
                        </label>
                        <select
                          value={formData.curriculumCourseId}
                          onChange={(e) =>
                            handleInputChange('curriculumCourseId', e.target.value)
                          }
                          className="w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0"
                          style={{
                            outline: 'none',
                            color: colors.primary,
                            borderColor: colors.neutralBorder,
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = colors.secondary;
                            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = colors.neutralBorder;
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">Select subject</option>
                          {curriculum.map((course) => {
                            const isScheduled = schedules.some(s => s.curriculumCourseId === course.id);
                            return (
                              <option 
                                key={course.id} 
                                value={course.id.toString()}
                                disabled={isScheduled}
                              >
                                {course.course_code} - {course.descriptive_title}
                                {isScheduled && ' (Already Scheduled)'}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: colors.primary }}>
                          <UserCircle className="w-3.5 h-3.5" />
                          Faculty <span style={{ color: colors.danger }}>*</span>
                        </label>
                        <select
                          value={formData.facultyId}
                          onChange={(e) =>
                            handleInputChange('facultyId', e.target.value)
                          }
                          className="w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0"
                          style={{
                            outline: 'none',
                            color: colors.primary,
                            borderColor: colors.neutralBorder,
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = colors.secondary;
                            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = colors.neutralBorder;
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">Select faculty</option>
                          {faculty.map((f) => (
                            <option key={f.id} value={f.id.toString()}>
                              {f.first_name} {f.last_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: colors.primary }}>
                          <Building2 className="w-3.5 h-3.5" />
                          Room <span style={{ color: colors.danger }}>*</span>
                        </label>
                        <select
                          value={formData.roomId}
                          onChange={(e) =>
                            handleInputChange('roomId', e.target.value)
                          }
                          className="w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0"
                          style={{
                            outline: 'none',
                            color: colors.primary,
                            borderColor: colors.neutralBorder,
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = colors.secondary;
                            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = colors.neutralBorder;
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">Select room</option>
                          {rooms.map((room) => (
                            <option key={room.id} value={room.id.toString()}>
                              {room.room_number} (Cap: {room.capacity})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: colors.primary }}>
                          <Calendar className="w-3.5 h-3.5" />
                          Day <span style={{ color: colors.danger }}>*</span>
                        </label>
                        <select
                          value={formData.dayOfWeek}
                          onChange={(e) =>
                            handleInputChange('dayOfWeek', e.target.value)
                          }
                          className="w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0"
                          style={{
                            outline: 'none',
                            color: colors.primary,
                            borderColor: colors.neutralBorder,
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = colors.secondary;
                            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = colors.neutralBorder;
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">Select day</option>
                          {DAYS.map((day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Conflict Prevention Info */}
                    {formData.roomId && formData.dayOfWeek && (
                      <div
                        className="rounded-lg p-3 flex items-start gap-2.5 text-xs"
                        style={{
                          backgroundColor: `${colors.info}08`,
                          border: `1px solid ${colors.info}20`,
                        }}
                      >
                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: colors.info }} />
                        <div style={{ color: colors.neutralDark }}>
                          <strong>Smart Conflict Prevention:</strong> Time slots occupied by <strong>any section</strong> in this room will be automatically disabled.
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: colors.primary }}>
                          <Clock className="w-3.5 h-3.5" />
                          Start Time <span style={{ color: colors.danger }}>*</span>
                        </label>
                        <select
                          value={formData.startTime}
                          onChange={(e) =>
                            handleInputChange('startTime', e.target.value)
                          }
                          className="w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0"
                          style={{
                            outline: 'none',
                            color: colors.primary,
                            borderColor: colors.neutralBorder,
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = colors.secondary;
                            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = colors.neutralBorder;
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">Select start time</option>
                          {TIME_SLOTS.map((time) => {
                            const isConflicted = isStartTimeConflicted(time);
                            return (
                              <option key={time} value={time} disabled={isConflicted}>
                                {time} {isConflicted ? '(Room Occupied)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-xs font-semibold mb-1.5" style={{ color: colors.primary }}>
                          <Clock className="w-3.5 h-3.5" />
                          End Time <span style={{ color: colors.danger }}>*</span>
                        </label>
                        <select
                          value={formData.endTime}
                          onChange={(e) =>
                            handleInputChange('endTime', e.target.value)
                          }
                          className="w-full px-3 py-2 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0 disabled:opacity-50"
                          style={{
                            outline: 'none',
                            color: colors.primary,
                            borderColor: colors.neutralBorder,
                          }}
                          disabled={!formData.startTime}
                          onFocus={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.borderColor = colors.secondary;
                              e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                            }
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = colors.neutralBorder;
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">Select end time</option>
                          {TIME_SLOTS.map((time) => {
                            if (!formData.startTime) return (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            );
                            
                            const startHour = parseInt(formData.startTime.split(':')[0]);
                            const startMin = parseInt(formData.startTime.split(':')[1]);
                            const endHour = parseInt(time.split(':')[0]);
                            const endMin = parseInt(time.split(':')[1]);
                            
                            const startTotal = startHour * 60 + startMin;
                            const endTotal = endHour * 60 + endMin;
                            
                            const isInvalid = endTotal <= startTotal;
                            const isConflicted = !isInvalid && isEndTimeConflicted(time);
                            const disabled = isInvalid || isConflicted;
                            
                            let label = time;
                            if (isInvalid) label += ' (Invalid)';
                            else if (isConflicted) label += ' (Room Conflict)';
                            
                            return (
                              <option 
                                key={time} 
                                value={time}
                                disabled={disabled}
                              >
                                {label}
                              </option>
                            );
                          })}
                        </select>
                        {formData.startTime && formData.endTime && (
                          <p className="text-xs mt-1" style={{ color: colors.neutral }}>
                            Duration: {(() => {
                              const startHour = parseInt(formData.startTime.split(':')[0]);
                              const startMin = parseInt(formData.startTime.split(':')[1]);
                              const endHour = parseInt(formData.endTime.split(':')[0]);
                              const endMin = parseInt(formData.endTime.split(':')[1]);
                              const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
                              const hours = Math.floor(duration / 60);
                              const minutes = duration % 60;
                              return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
                            })()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            curriculumCourseId: '',
                            facultyId: '',
                            roomId: '',
                            dayOfWeek: '',
                            startTime: '',
                            endTime: ''
                          });
                          setError(null);
                        }}
                        disabled={loading}
                        className="flex-1 px-6 py-2.5 rounded-xl transition-all font-medium flex items-center justify-center gap-2"
                        style={{
                          color: colors.primary,
                          border: `1px solid ${colors.neutralBorder}`,
                          backgroundColor: colors.paper,
                        }}
                        onMouseEnter={(e) => {
                          if (!loading) {
                            e.currentTarget.style.backgroundColor = colors.neutralLight;
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = colors.paper;
                        }}
                      >
                        Clear
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-6 py-2.5 text-white rounded-xl transition-all font-medium flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: colors.secondary,
                          boxShadow: '0 4px 6px -1px rgba(149, 90, 39, 0.2)',
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {loading ? 'Adding...' : 'Add Schedule'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Weekly Schedule Calendar */}
              <div>
                <WeeklyScheduleCalendar
                  schedules={schedules.map(s => {
                    const course = curriculum.find(c => c.id === s.curriculumCourseId);
                    const facultyMember = faculty.find(f => f.id === s.facultyId);
                    const room = rooms.find(r => r.id === s.roomId);
                    
                    return {
                      id: s.id,
                      curriculumCourseId: s.curriculumCourseId,
                      courseCode: course?.course_code || 'N/A',
                      courseTitle: course?.descriptive_title || '',
                      facultyName: facultyMember 
                        ? `${facultyMember.first_name} ${facultyMember.last_name}`
                        : 'N/A',
                      roomNumber: room?.room_number || 'N/A',
                      dayOfWeek: s.dayOfWeek,
                      startTime: s.startTime,
                      endTime: s.endTime,
                    };
                  })}
                  previewBlock={
                    formData.dayOfWeek && formData.startTime && formData.endTime
                      ? {
                          dayOfWeek: formData.dayOfWeek,
                          startTime: (() => {
                            const [hour, minute] = formData.startTime.split(':').map(Number);
                            const date = new Date();
                            date.setHours(hour, minute, 0);
                            return date.toISOString();
                          })(),
                          endTime: (() => {
                            const [hour, minute] = formData.endTime.split(':').map(Number);
                            const date = new Date();
                            date.setHours(hour, minute, 0);
                            return date.toISOString();
                          })(),
                          courseCode: curriculum.find(c => c.id === parseInt(formData.curriculumCourseId))?.course_code,
                        }
                      : null
                  }
                  readOnly={isReadOnly}
                />
              </div>

              {/* Scheduled Courses List */}
              {schedules.length > 0 && (
                <div
                  className="rounded-2xl shadow-sm border overflow-hidden"
                  style={{
                    backgroundColor: colors.paper,
                    borderColor: colors.neutralBorder,
                  }}
                >
                  <div className="flex items-center gap-2 p-4 border-b" style={{ borderColor: colors.neutralBorder }}>
                    <BookOpen className="w-4 h-4" style={{ color: colors.secondary }} />
                    <h3 className="text-sm font-semibold" style={{ color: colors.primary }}>
                      Scheduled Courses ({schedules.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                      <thead>
                        <tr
                          style={{
                            backgroundColor: `${colors.primary}05`,
                            borderBottom: `1px solid ${colors.primary}10`,
                          }}
                        >
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.neutral }}>
                            Course
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.neutral }}>
                            Faculty
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.neutral }}>
                            Room
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.neutral }}>
                            Day
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.neutral }}>
                            Time
                          </th>
                          {!isReadOnly && (
                            <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.neutral }}>
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {schedules.map((schedule) => {
                          const course = curriculum.find(c => c.id === schedule.curriculumCourseId);
                          const facultyMember = faculty.find(f => f.id === schedule.facultyId);
                          const room = rooms.find(r => r.id === schedule.roomId);
                          
                          return (
                            <tr key={schedule.id} className="group hover:bg-gray-50/50 transition-colors">
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="font-medium text-xs" style={{ color: colors.primary }}>
                                  {course?.course_code || schedule.curriculumCourseId}
                                </div>
                                <div className="text-[10px] truncate max-w-xs mt-0.5" style={{ color: colors.neutral }}>
                                  {course?.descriptive_title || 'N/A'}
                                </div>
                                <div className="text-[10px] mt-1" style={{ color: colors.neutral }}>
                                  {course?.units_total || 0} units
                                </div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {facultyMember 
                                  ? (
                                    <div>
                                      <div className="font-medium text-xs" style={{ color: colors.primary }}>
                                        {facultyMember.first_name} {facultyMember.last_name}
                                      </div>
                                      {facultyMember.position && (
                                        <div className="text-[10px] mt-0.5" style={{ color: colors.neutral }}>
                                          {facultyMember.position}
                                        </div>
                                      )}
                                    </div>
                                  )
                                  : <span className="text-xs" style={{ color: colors.neutral }}>ID: {schedule.facultyId}</span>
                                }
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {room 
                                  ? (
                                    <div>
                                      <div className="font-medium text-xs" style={{ color: colors.primary }}>
                                        {room.room_number}
                                      </div>
                                      <div className="text-[10px] mt-0.5" style={{ color: colors.neutral }}>
                                        Cap: {room.capacity} • {room.room_type}
                                      </div>
                                    </div>
                                  )
                                  : <span className="text-xs" style={{ color: colors.neutral }}>ID: {schedule.roomId}</span>
                                }
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
                                  style={{
                                    backgroundColor: `${colors.info}10`,
                                    color: colors.info,
                                    borderColor: `${colors.info}30`,
                                  }}
                                >
                                  {schedule.dayOfWeek.substring(0, 3)}
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="font-medium text-xs" style={{ color: colors.primary }}>
                                  {schedule.startTime.split('T')[1].slice(0, 5)} -{' '}
                                  {schedule.endTime.split('T')[1].slice(0, 5)}
                                </div>
                                <div className="text-[10px] mt-0.5" style={{ color: colors.neutral }}>
                                  {(() => {
                                    const start = new Date(schedule.startTime);
                                    const end = new Date(schedule.endTime);
                                    const duration = (end.getTime() - start.getTime()) / (1000 * 60);
                                    const hours = Math.floor(duration / 60);
                                    const minutes = duration % 60;
                                    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
                                  })()}
                                </div>
                              </td>
                              {!isReadOnly && (
                                <td className="px-3 py-2 whitespace-nowrap text-center">
                                  <button
                                    onClick={() => handleDeleteSchedule(schedule)}
                                    disabled={loading}
                                    className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ color: colors.danger }}
                                    title="Delete schedule"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div
                className="flex justify-end gap-3 pt-4 border-t"
                style={{
                  borderColor: colors.neutralBorder,
                  backgroundColor: colors.neutralLight,
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
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({
          isOpen: false,
          scheduleId: null,
          scheduleInfo: ''
        })}
        onConfirm={confirmDelete}
        title="Delete Schedule"
        message={`Are you sure you want to delete this schedule?`}
        description={deleteConfirm.scheduleInfo}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={loading}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        title="Success"
        message={successModal.message}
        autoClose={true}
        autoCloseDelay={3000}
      />
    </div>
  );
}
