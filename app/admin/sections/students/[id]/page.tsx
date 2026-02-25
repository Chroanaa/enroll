'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSectionById } from '../../../../utils/sectionApi';
import { SectionResponse } from '../../../../types/sectionTypes';
import Navigation from '../../../../components/Navigation';
import { colors } from '../../../../colors';
import {
  ArrowLeft,
  Search,
  UserPlus,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  User,
  GraduationCap,
  Trash2
} from 'lucide-react';

interface Student {
  studentId: number;
  studentNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  name: string;
  email: string;
  programId: number;
  programCode: string;
  programName: string;
  academicStatus: string;
}

interface ClassSchedule {
  id: number;
  curriculumCourseId: number;
  courseCode: string;
  courseTitle: string;
  facultyName: string;
  roomNumber: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  prerequisite: string | null;
  subjectYearLevel: number | null;
  subjectSemester: number | null;
  unitsTotal: number;
}

interface AssignedStudent {
  id: number;
  studentNumber: string;
  name: string;
  assignmentType: string;
  subjectCount?: number;
}

export default function ManualStudentAssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const sectionId = parseInt(params.id as string);

  const [section, setSection] = useState<SectionResponse | null>(null);
  const [loadingSection, setLoadingSection] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Student search
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Assignment type
  const [assignmentType, setAssignmentType] = useState<'regular' | 'irregular'>('irregular');

  // Schedules for subject selection
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [selectedSchedules, setSelectedSchedules] = useState<Set<number>>(new Set());
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Academic status filter
  const [statusFilter, setStatusFilter] = useState<'all' | 'regular' | 'irregular'>('all');

  // Assigned students list
  const [assignedStudents, setAssignedStudents] = useState<AssignedStudent[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);

  // Navigation handler
  const handleViewChange = (view: string) => {
    if (view === 'section-management') {
      router.push('/dashboard?view=section-management');
      return;
    }
    router.push(`/dashboard?view=${view}`);
  };

  useEffect(() => {
    loadSectionData();
  }, [sectionId]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchStudents();
    } else {
      setStudents([]);
    }
  }, [searchQuery, statusFilter]);

  const loadSectionData = async () => {
    try {
      setLoadingSection(true);
      const sectionData = await getSectionById(sectionId);
      setSection(sectionData);
      
      // Load schedules and assigned students
      await Promise.all([
        loadSchedules(sectionData),
        loadAssignedStudents(sectionData)
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load section');
    } finally {
      setLoadingSection(false);
    }
  };

  const loadSchedules = async (sectionData: SectionResponse) => {
    setLoadingSchedules(true);
    try {
      const response = await fetch(
        `/api/class-schedule?sectionId=${sectionData.id}&academicYear=${sectionData.academicYear}&semester=${sectionData.semester}`
      );

      if (response.ok) {
        const data = await response.json();
        const schedulesData = data.data || [];

        const schedulesWithDetails = schedulesData.map((schedule: any) => ({
          id: schedule.id,
          curriculumCourseId: schedule.curriculumCourseId,
          courseCode: schedule.courseCode || `Course ${schedule.curriculumCourseId}`,
          courseTitle: schedule.courseTitle || '',
          facultyName: schedule.faculty ? `${schedule.faculty.first_name} ${schedule.faculty.last_name}` : 'TBA',
          roomNumber: schedule.room?.room_number || 'TBA',
          dayOfWeek: schedule.dayOfWeek,
          startTime: formatTime(schedule.startTime),
          endTime: formatTime(schedule.endTime),
          prerequisite: schedule.prerequisite || null,
          subjectYearLevel: schedule.subjectYearLevel || null,
          subjectSemester: schedule.subjectSemester || null,
          unitsTotal: schedule.unitsTotal || 0
        }));

        setSchedules(schedulesWithDetails);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const loadAssignedStudents = async (sectionData: SectionResponse) => {
    setLoadingAssigned(true);
    try {
      const response = await fetch(
        `/api/student-section?sectionId=${sectionData.id}&academicYear=${sectionData.academicYear}&semester=${sectionData.semester}`
      );

      if (response.ok) {
        const data = await response.json();
        setAssignedStudents(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load assigned students:', err);
    } finally {
      setLoadingAssigned(false);
    }
  };

  const formatTime = (isoTime: string) => {
    const date = new Date(isoTime);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const searchStudents = async () => {
    setSearchLoading(true);
    try {
      const response = await fetch(
        `/api/auth/students/search?query=${encodeURIComponent(searchQuery)}&academicStatus=${statusFilter}`
      );

      if (response.ok) {
        const data = await response.json();
        setStudents(data.data || []);
      }
    } catch (err) {
      console.error('Failed to search students:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setStudents([]);
    setError(null);
    setSuccess(null);

    if (student.academicStatus === 'irregular') {
      setAssignmentType('irregular');
    }
  };

  const handleToggleSchedule = (scheduleId: number) => {
    const newSelected = new Set(selectedSchedules);
    if (newSelected.has(scheduleId)) {
      newSelected.delete(scheduleId);
    } else {
      newSelected.add(scheduleId);
    }
    setSelectedSchedules(newSelected);
  };

  const handleSelectAllSchedules = () => {
    if (selectedSchedules.size === schedules.length) {
      setSelectedSchedules(new Set());
    } else {
      setSelectedSchedules(new Set(schedules.map(s => s.id)));
    }
  };

  const handleSubmit = async () => {
    if (!section || !selectedStudent) return;

    if (assignmentType === 'irregular' && selectedSchedules.size === 0) {
      setError('Please select at least one subject for irregular student');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/student-section/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentNumber: selectedStudent.studentNumber,
          sectionId: section.id,
          academicYear: section.academicYear,
          semester: section.semester,
          assignmentType,
          classScheduleIds: assignmentType === 'irregular' ? Array.from(selectedSchedules) : []
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign student');
      }

      setSuccess(`Successfully assigned ${selectedStudent.name} to ${section.sectionName}`);
      setSelectedStudent(null);
      setSelectedSchedules(new Set());

      // Reload assigned students
      await loadAssignedStudents(section);
      
      // Reload section to update count
      const updatedSection = await getSectionById(sectionId);
      setSection(updatedSection);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStudent = async (studentNumber: string) => {
    if (!section) return;
    
    if (!confirm('Are you sure you want to remove this student from the section?')) return;

    try {
      const response = await fetch(
        `/api/student-section/manual?studentNumber=${studentNumber}&academicYear=${section.academicYear}&semester=${section.semester}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove student');
      }

      setSuccess('Student removed from section');
      await loadAssignedStudents(section);
      
      const updatedSection = await getSectionById(sectionId);
      setSection(updatedSection);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove student');
    }
  };

  if (loadingSection) {
    return (
      <div className="flex h-screen">
        <Navigation currentView="section-management" onViewChange={handleViewChange} />
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: colors.neutralLight }}>
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 mx-auto" style={{ color: colors.secondary }} />
            <p className="mt-4 text-sm" style={{ color: colors.neutral }}>Loading section...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="flex h-screen">
        <Navigation currentView="section-management" onViewChange={handleViewChange} />
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: colors.neutralLight }}>
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.danger }} />
            <p className="text-lg font-semibold" style={{ color: colors.primary }}>Section not found</p>
            <button
              onClick={() => router.push('/dashboard?view=section-management')}
              className="mt-4 px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: colors.secondary }}
            >
              Back to Sections
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Navigation currentView="section-management" onViewChange={handleViewChange} />
      <div className="flex-1 flex flex-col overflow-y-auto" style={{ backgroundColor: colors.neutralLight }}>
        {/* Header */}
        <div
          className="sticky top-0 z-20 px-6 py-4"
          style={{
            backgroundColor: 'rgba(253, 251, 248, 0.95)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(179, 116, 74, 0.1)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard?view=section-management')}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                style={{ color: colors.tertiary }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ backgroundColor: 'rgba(149, 90, 39, 0.08)' }}
                >
                  <UserPlus className="w-6 h-6" style={{ color: colors.secondary }} />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: colors.primary }}>
                    Student Assignment - {section.sectionName}
                  </h1>
                  <p className="text-sm" style={{ color: colors.neutral }}>
                    {section.programCode} • Year {section.yearLevel} • {section.academicYear} • {section.semester}
                  </p>
                </div>
              </div>
            </div>
            <div
              className="text-right px-4 py-2 rounded-lg"
              style={{ backgroundColor: 'rgba(149, 90, 39, 0.06)' }}
            >
              <div className="text-[10px] font-medium uppercase" style={{ color: colors.tertiary }}>Capacity</div>
              <div className="text-2xl font-bold" style={{ color: colors.secondary }}>
                {section.studentCount} / {section.maxCapacity}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Add Student */}
            <div className="space-y-4">
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: 'white',
                  border: '1px solid rgba(179, 116, 74, 0.12)',
                }}
              >
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: colors.primary }}>
                  <UserPlus className="w-5 h-5" style={{ color: colors.secondary }} />
                  Add Student
                </h2>

                {/* Messages */}
                {error && (
                  <div
                    className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: colors.danger }}
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {success && (
                  <div
                    className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm"
                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: colors.success }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {success}
                  </div>
                )}

                {/* Student Search */}
                <div className="mb-4">
                  <label className="block text-xs font-medium mb-2" style={{ color: colors.primary }}>
                    Search Student
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="px-3 py-2 rounded-lg text-sm border"
                      style={{ borderColor: 'rgba(179, 116, 74, 0.2)' }}
                    >
                      <option value="all">All</option>
                      <option value="regular">Regular</option>
                      <option value="irregular">Irregular</option>
                    </select>
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.neutral }} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or student number..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg text-sm border"
                        style={{ borderColor: 'rgba(179, 116, 74, 0.2)' }}
                      />
                    </div>
                  </div>

                  {/* Search Results */}
                  {searchLoading && (
                    <div className="flex items-center gap-2 py-3 text-sm" style={{ color: colors.neutral }}>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching...
                    </div>
                  )}

                  {students.length > 0 && (
                    <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto" style={{ borderColor: 'rgba(179, 116, 74, 0.2)' }}>
                      {students.map((student, index) => (
                        <button
                          key={`${student.studentNumber}-${index}`}
                          onClick={() => handleSelectStudent(student)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-sm" style={{ color: colors.primary }}>{student.name}</div>
                            <div className="text-xs" style={{ color: colors.neutral }}>{student.studentNumber} • {student.programCode}</div>
                          </div>
                          <span
                            className="px-2 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: student.academicStatus === 'irregular' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: student.academicStatus === 'irregular' ? colors.warning : colors.success
                            }}
                          >
                            {student.academicStatus || 'regular'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Student */}
                {selectedStudent && (
                  <>
                    <div
                      className="mb-4 p-4 rounded-lg"
                      style={{ backgroundColor: 'rgba(149, 90, 39, 0.05)', border: '1px solid rgba(149, 90, 39, 0.15)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(149, 90, 39, 0.1)' }}>
                            <User className="w-5 h-5" style={{ color: colors.secondary }} />
                          </div>
                          <div>
                            <div className="font-semibold" style={{ color: colors.primary }}>{selectedStudent.name}</div>
                            <div className="text-xs" style={{ color: colors.neutral }}>{selectedStudent.studentNumber} • {selectedStudent.programCode}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedStudent(null)}
                          className="text-xs px-2 py-1 rounded hover:bg-gray-100"
                          style={{ color: colors.neutral }}
                        >
                          Change
                        </button>
                      </div>
                    </div>

                    {/* Assignment Type */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium mb-2" style={{ color: colors.primary }}>Assignment Type</label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setAssignmentType('regular')}
                          className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-all ${assignmentType === 'regular' ? 'ring-2' : ''}`}
                          style={{
                            borderColor: assignmentType === 'regular' ? colors.success : 'rgba(179, 116, 74, 0.2)',
                            backgroundColor: assignmentType === 'regular' ? 'rgba(16, 185, 129, 0.05)' : 'white',
                            color: assignmentType === 'regular' ? colors.success : colors.neutral,
                          }}
                        >
                          <GraduationCap className="w-5 h-5 mx-auto mb-1" />
                          Regular
                          <div className="text-xs font-normal">All subjects</div>
                        </button>
                        <button
                          onClick={() => setAssignmentType('irregular')}
                          className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-all ${assignmentType === 'irregular' ? 'ring-2' : ''}`}
                          style={{
                            borderColor: assignmentType === 'irregular' ? colors.warning : 'rgba(179, 116, 74, 0.2)',
                            backgroundColor: assignmentType === 'irregular' ? 'rgba(245, 158, 11, 0.05)' : 'white',
                            color: assignmentType === 'irregular' ? colors.warning : colors.neutral,
                          }}
                        >
                          <BookOpen className="w-5 h-5 mx-auto mb-1" />
                          Irregular
                          <div className="text-xs font-normal">Select subjects</div>
                        </button>
                      </div>
                    </div>

                    {/* Subject Selection */}
                    {assignmentType === 'irregular' && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium" style={{ color: colors.primary }}>
                            Select Subjects ({selectedSchedules.size}/{schedules.length})
                          </label>
                          <button
                            onClick={handleSelectAllSchedules}
                            className="text-xs px-2 py-1 rounded hover:bg-gray-100"
                            style={{ color: colors.secondary }}
                          >
                            {selectedSchedules.size === schedules.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="border rounded-lg max-h-64 overflow-y-auto" style={{ borderColor: 'rgba(179, 116, 74, 0.2)' }}>
                          {loadingSchedules ? (
                            <div className="p-4 text-center text-sm" style={{ color: colors.neutral }}>
                              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                              Loading schedules...
                            </div>
                          ) : schedules.length === 0 ? (
                            <div className="p-4 text-center text-sm" style={{ color: colors.neutral }}>
                              No schedules found
                            </div>
                          ) : (
                            schedules.map((schedule) => (
                              <label
                                key={schedule.id}
                                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedSchedules.has(schedule.id)}
                                  onChange={() => handleToggleSchedule(schedule.id)}
                                  className="w-4 h-4 rounded mt-1"
                                  style={{ accentColor: colors.secondary }}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm" style={{ color: colors.primary }}>{schedule.courseCode}</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: 'rgba(149, 90, 39, 0.1)', color: colors.secondary }}>
                                      {schedule.unitsTotal} units
                                    </span>
                                  </div>
                                  <div className="text-xs mt-0.5" style={{ color: colors.neutral }}>{schedule.courseTitle}</div>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366F1' }}>
                                      Year {schedule.subjectYearLevel} • Sem {schedule.subjectSemester}
                                    </span>
                                    {schedule.prerequisite && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: colors.warning }}>
                                        Prereq: {schedule.prerequisite}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] mt-1.5" style={{ color: colors.tertiary }}>
                                    {schedule.dayOfWeek} {schedule.startTime}-{schedule.endTime} • {schedule.roomNumber} • {schedule.facultyName}
                                  </div>
                                </div>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || (assignmentType === 'irregular' && selectedSchedules.size === 0)}
                      className="w-full py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ backgroundColor: colors.secondary }}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Assign Student
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right Column - Assigned Students */}
            <div
              className="rounded-xl p-5"
              style={{
                backgroundColor: 'white',
                border: '1px solid rgba(179, 116, 74, 0.12)',
              }}
            >
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: colors.primary }}>
                <Users className="w-5 h-5" style={{ color: colors.secondary }} />
                Assigned Students ({assignedStudents.length})
              </h2>

              {loadingAssigned ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: colors.secondary }} />
                  <p className="text-sm mt-2" style={{ color: colors.neutral }}>Loading...</p>
                </div>
              ) : assignedStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 mx-auto mb-2" style={{ color: colors.neutral }} />
                  <p className="text-sm" style={{ color: colors.neutral }}>No students assigned yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {assignedStudents.map((student, index) => (
                    <div
                      key={`${student.studentNumber}-${index}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                      style={{ border: '1px solid rgba(179, 116, 74, 0.1)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'rgba(149, 90, 39, 0.1)' }}
                        >
                          <User className="w-4 h-4" style={{ color: colors.secondary }} />
                        </div>
                        <div>
                          <div className="font-medium text-sm" style={{ color: colors.primary }}>{student.name}</div>
                          <div className="text-xs" style={{ color: colors.neutral }}>{student.studentNumber}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: student.assignmentType === 'irregular' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: student.assignmentType === 'irregular' ? colors.warning : colors.success
                          }}
                        >
                          {student.assignmentType || 'regular'}
                        </span>
                        <button
                          onClick={() => handleRemoveStudent(student.studentNumber)}
                          className="p-1.5 rounded hover:bg-red-50 transition-colors"
                          style={{ color: colors.danger }}
                          title="Remove student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
