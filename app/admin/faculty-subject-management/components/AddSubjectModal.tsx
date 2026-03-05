'use client';

import React, { useState, useEffect } from 'react';
import { colors } from '../../../colors';
import { X, Loader2, AlertTriangle, Search } from 'lucide-react';

interface CurriculumCourse {
  id: number;
  course_code: string;
  descriptive_title: string;
  curriculum_id: number;
}

interface ScheduleSubject {
  id: number;
  sectionId: number;
  sectionName: string;
  curriculumCourseId: number;
  courseCode: string;
  courseTitle: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomId: number;
  roomNumber: string;
  facultyId: number | null;
}

interface AddSubjectModalProps {
  facultyId: number;
  academicYear: string;
  semester: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSubjectModal({
  facultyId,
  academicYear,
  semester,
  onClose,
  onSuccess,
}: AddSubjectModalProps) {
  const [subjects, setSubjects] = useState<CurriculumCourse[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<CurriculumCourse[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSubject[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<CurriculumCourse | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  useEffect(() => {
    fetchAllSubjects();
  }, []);

  useEffect(() => {
    filterSubjects();
  }, [subjects, searchTerm]);

  useEffect(() => {
    if (selectedSubject) {
      fetchSchedulesForSubject();
    } else {
      setSchedules([]);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedSchedule) {
      checkConflicts();
    }
  }, [selectedSchedule]);

  const fetchAllSubjects = async () => {
    try {
      setLoadingSubjects(true);
      const response = await fetch('/api/curriculum-courses');
      if (!response.ok) throw new Error('Failed to fetch subjects');
      const data = await response.json();
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const filterSubjects = () => {
    if (!searchTerm) {
      setFilteredSubjects(subjects);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = subjects.filter(subject =>
      subject.course_code.toLowerCase().includes(searchLower) ||
      subject.descriptive_title.toLowerCase().includes(searchLower)
    );
    setFilteredSubjects(filtered);
  };

  const fetchSchedulesForSubject = async () => {
    if (!selectedSubject) return;
    
    try {
      setLoadingSchedules(true);
      const response = await fetch(
        `/api/class-schedule?curriculumCourseId=${selectedSubject.id}&academicYear=${academicYear}&semester=${semester}`
      );
      if (!response.ok) throw new Error('Failed to fetch schedules');
      const result = await response.json();
      
      const availableSchedules = result.data.filter((s: any) => !s.facultyId);
      
      // Map schedules - section name is now included in the API response
      const mappedSchedules = availableSchedules.map((s: any) => ({
        id: s.id,
        sectionId: s.sectionId,
        sectionName: s.sectionName || s.section?.section_name || 'Unknown',
        curriculumCourseId: s.curriculumCourseId,
        courseCode: s.courseCode,
        courseTitle: s.courseTitle,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        roomId: s.roomId,
        roomNumber: s.room?.room_number || 'N/A',
        facultyId: s.facultyId,
      }));
      
      setSchedules(mappedSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setSchedules([]);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const checkConflicts = async () => {
    try {
      const schedule = schedules.find(s => s.id === parseInt(selectedSchedule));
      if (!schedule) return;

      const response = await fetch('/api/class-schedule/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facultyId,
          roomId: schedule.roomId,
          sectionId: schedule.sectionId,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          academicYear,
          semester,
        }),
      });

      if (!response.ok) throw new Error('Failed to check conflicts');
      const result = await response.json();
      
      if (result.conflicts && result.conflicts.length > 0) {
        const conflictTypes = result.conflicts.map((c: any) => c.type).join(', ');
        setConflict(`Conflict detected: ${conflictTypes}`);
      } else {
        setConflict(null);
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSubject || !selectedSchedule) {
      alert('Please select a subject and schedule');
      return;
    }

    if (conflict) {
      alert('Cannot assign subject due to schedule conflict');
      return;
    }

    try {
      setLoading(true);
      const schedule = schedules.find(s => s.id === parseInt(selectedSchedule));
      if (!schedule) throw new Error('Schedule not found');

      const response = await fetch(`/api/class-schedule/${schedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facultyId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign subject');
      }

      onSuccess();
    } catch (error) {
      console.error('Error assigning subject:', error);
      alert(error instanceof Error ? error.message : 'Failed to assign subject');
    } finally {
      setLoading(false);
    }
  };

  const selectedScheduleData = schedules.find(s => s.id === parseInt(selectedSchedule));

  const formatTime = (timeStr: string): string => {
    const date = new Date(timeStr);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        style={{ backgroundColor: colors.paper }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: `${colors.tertiary}20` }}
        >
          <h2 className="text-xl font-bold" style={{ color: colors.primary }}>
            Add Subject Assignment
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: `${colors.neutral}15` }}
          >
            <X className="w-5 h-5" style={{ color: colors.primary }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Subject List */}
          <div className="w-1/2 border-r flex flex-col" style={{ borderColor: `${colors.tertiary}20` }}>
            <div className="p-4 border-b" style={{ borderColor: `${colors.tertiary}20` }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: colors.primary }}>
                Step 1: Select Subject
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: colors.neutral }} />
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
                  style={{
                    backgroundColor: colors.paper,
                    borderColor: `${colors.tertiary}30`,
                    color: colors.primary,
                  }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingSubjects ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.primary }} />
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm" style={{ color: colors.neutral }}>
                    {searchTerm ? 'No subjects found' : 'No subjects available'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSubjects.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() => {
                        setSelectedSubject(subject);
                        setSelectedSchedule('');
                      }}
                      className="w-full text-left p-3 rounded-lg transition-all border"
                      style={{
                        backgroundColor: selectedSubject?.id === subject.id ? `${colors.primary}15` : colors.paper,
                        borderColor: selectedSubject?.id === subject.id ? colors.primary : `${colors.tertiary}20`,
                      }}
                    >
                      <div className="font-medium text-sm" style={{ color: colors.primary }}>
                        {subject.course_code}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: colors.neutral }}>
                        {subject.descriptive_title}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Section/Schedule List */}
          <div className="w-1/2 flex flex-col">
            <div className="p-4 border-b" style={{ borderColor: `${colors.tertiary}20` }}>
              <h3 className="text-sm font-semibold" style={{ color: colors.primary }}>
                Step 2: Select Section & Schedule
              </h3>
              {selectedSubject && (
                <p className="text-xs mt-1" style={{ color: colors.neutral }}>
                  Showing sections for: {selectedSubject.course_code}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!selectedSubject ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm" style={{ color: colors.neutral }}>
                    Select a subject to view available sections
                  </p>
                </div>
              ) : loadingSchedules ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.primary }} />
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm" style={{ color: colors.neutral }}>
                    No available sections for this subject
                  </p>
                  <p className="text-xs mt-1" style={{ color: colors.neutral }}>
                    All sections may already have faculty assigned
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {schedules.map((schedule) => (
                    <label
                      key={schedule.id}
                      className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border"
                      style={{
                        backgroundColor: selectedSchedule === schedule.id.toString() ? `${colors.primary}15` : colors.paper,
                        borderColor: selectedSchedule === schedule.id.toString() ? colors.primary : `${colors.tertiary}20`,
                      }}
                    >
                      <input
                        type="radio"
                        name="schedule"
                        value={schedule.id}
                        checked={selectedSchedule === schedule.id.toString()}
                        onChange={(e) => setSelectedSchedule(e.target.value)}
                        className="mt-1 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm mb-1" style={{ color: colors.primary }}>
                          {schedule.sectionName}
                        </div>
                        <div className="text-xs space-y-0.5" style={{ color: colors.neutral }}>
                          <div>{schedule.dayOfWeek} • {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</div>
                          <div>Room: {schedule.roomNumber}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview & Footer */}
        <div className="border-t" style={{ borderColor: `${colors.tertiary}20` }}>
          {selectedScheduleData && (
            <div className="p-4" style={{ backgroundColor: `${colors.primary}08` }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: colors.primary }}>
                Assignment Preview
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: colors.neutral }}>
                <div><span className="font-medium">Subject:</span> {selectedScheduleData.courseCode}</div>
                <div><span className="font-medium">Section:</span> {selectedScheduleData.sectionName}</div>
                <div><span className="font-medium">Day:</span> {selectedScheduleData.dayOfWeek}</div>
                <div><span className="font-medium">Time:</span> {formatTime(selectedScheduleData.startTime)} - {formatTime(selectedScheduleData.endTime)}</div>
                <div><span className="font-medium">Room:</span> {selectedScheduleData.roomNumber}</div>
              </div>
            </div>
          )}

          {conflict && (
            <div className="p-4 flex items-start gap-3" style={{ backgroundColor: '#FEF2F2' }}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: colors.danger }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: colors.danger }}>
                  Schedule Conflict
                </p>
                <p className="text-xs mt-1" style={{ color: colors.danger }}>
                  {conflict}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 p-4">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: `${colors.neutral}15`,
                color: colors.primary,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedSchedule || !!conflict}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ backgroundColor: colors.primary }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Assign Subject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
