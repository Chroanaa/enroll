'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import { colors } from '../../colors';
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
  Trash2,
  Plus,
  Calendar
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

interface Section {
  id: number;
  sectionName: string;
  programCode: string;
  programName: string;
  yearLevel: number;
  academicYear: string;
  semester: string;
  status: string;
}

interface ClassSchedule {
  id: number;
  sectionId: number;
  sectionName: string;
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

interface EnrolledSubject {
  id: number;
  classScheduleId: number;
  sectionId: number;
  sectionName: string;
  courseCode: string;
  courseTitle: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
  facultyName: string;
  unitsTotal: number;
}

export default function IrregularEnrollmentPage() {
  const router = useRouter();

  // Student selection
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Section selection
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [loadingSections, setLoadingSections] = useState(false);

  // Subject selection from section
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Enrolled subjects for student
  const [enrolledSubjects, setEnrolledSubjects] = useState<EnrolledSubject[]>([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Academic term
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [semester, setSemester] = useState('second');

  const handleViewChange = (view: string) => {
    router.push(`/dashboard?view=${view}`);
  };


  // Student status filter
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'regular' | 'irregular'>('all');

  // Search students
  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchStudents();
    } else {
      setStudents([]);
    }
  }, [searchQuery, studentStatusFilter]);

  // Load sections when student is selected
  useEffect(() => {
    if (selectedStudent) {
      loadSections();
      loadEnrolledSubjects();
    }
  }, [selectedStudent, academicYear, semester]);

  // Load schedules when section is selected
  useEffect(() => {
    if (selectedSection) {
      loadSchedules();
    }
  }, [selectedSection]);

  const searchStudents = async () => {
    setSearchLoading(true);
    try {
      const response = await fetch(
        `/api/auth/students/search?query=${encodeURIComponent(searchQuery)}&academicStatus=${studentStatusFilter}`
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

  const loadSections = async () => {
    setLoadingSections(true);
    try {
      const response = await fetch(`/api/auth/section`);
      if (response.ok) {
        const data = await response.json();
        // Map database fields to expected format and filter by status and term
        const allSections = (Array.isArray(data) ? data : data.data || []).map((s: any) => ({
          id: s.id,
          sectionName: s.section_name,
          programCode: s.program_code || '',
          programName: s.program_name || '',
          yearLevel: s.year_level,
          academicYear: s.academic_year,
          semester: s.semester,
          status: s.status
        }));
        
        // Filter sections by academic year, semester, and active status
        const filtered = allSections.filter((s: Section) => 
          s.academicYear === academicYear && 
          s.semester === semester && 
          s.status === 'active'
        );
        setSections(filtered);
      }
    } catch (err) {
      console.error('Failed to load sections:', err);
    } finally {
      setLoadingSections(false);
    }
  };

  const loadSchedules = async () => {
    if (!selectedSection) return;
    setLoadingSchedules(true);
    try {
      const response = await fetch(
        `/api/class-schedule?sectionId=${selectedSection.id}&academicYear=${academicYear}&semester=${semester}`
      );
      if (response.ok) {
        const data = await response.json();
        const schedulesData = (data.data || []).map((schedule: any) => ({
          id: schedule.id,
          sectionId: selectedSection.id,
          sectionName: selectedSection.sectionName,
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
        setSchedules(schedulesData);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const loadEnrolledSubjects = async () => {
    if (!selectedStudent) return;
    setLoadingEnrolled(true);
    try {
      const response = await fetch(
        `/api/irregular-enrollment?studentNumber=${selectedStudent.studentNumber}&academicYear=${academicYear}&semester=${semester}`
      );
      if (response.ok) {
        const data = await response.json();
        setEnrolledSubjects(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load enrolled subjects:', err);
      setEnrolledSubjects([]);
    } finally {
      setLoadingEnrolled(false);
    }
  };

  const formatTime = (isoTime: string) => {
    const date = new Date(isoTime);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setStudents([]);
    setSelectedSection(null);
    setSchedules([]);
    setError(null);
    setSuccess(null);
  };

  const handleAddSubject = async (schedule: ClassSchedule) => {
    if (!selectedStudent || !selectedSection) return;

    // Check if already enrolled
    if (enrolledSubjects.some(e => e.classScheduleId === schedule.id)) {
      setError('Student is already enrolled in this subject');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/irregular-enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentNumber: selectedStudent.studentNumber,
          classScheduleId: schedule.id,
          sectionId: selectedSection.id,
          academicYear,
          semester
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add subject');
      }

      setSuccess(`Added ${schedule.courseCode} successfully`);
      await loadEnrolledSubjects();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveSubject = async (enrolledSubject: EnrolledSubject) => {
    if (!selectedStudent) return;

    if (!confirm(`Remove ${enrolledSubject.courseCode} from enrollment?`)) return;

    try {
      const response = await fetch(
        `/api/irregular-enrollment?id=${enrolledSubject.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove subject');
      }

      setSuccess(`Removed ${enrolledSubject.courseCode}`);
      await loadEnrolledSubjects();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove subject');
    }
  };

  // Check if schedule is already enrolled
  const isEnrolled = (scheduleId: number) => {
    return enrolledSubjects.some(e => e.classScheduleId === scheduleId);
  };

  // Calculate total units
  const totalUnits = enrolledSubjects.reduce((sum, e) => sum + (e.unitsTotal || 0), 0);


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
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                  <BookOpen className="w-6 h-6" style={{ color: colors.warning }} />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: colors.primary }}>
                    Manual Subject Enrollment
                  </h1>
                  <p className="text-sm" style={{ color: colors.neutral }}>
                    Manually enroll students in subjects from any section (for irregular or advanced subjects)
                  </p>
                </div>
              </div>
            </div>

            {/* Term Selector */}
            <div className="flex items-center gap-3">
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm border"
                style={{ borderColor: 'rgba(179, 116, 74, 0.2)' }}
              >
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
              </select>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm border"
                style={{ borderColor: 'rgba(179, 116, 74, 0.2)' }}
              >
                <option value="first">First Semester</option>
                <option value="second">Second Semester</option>
                <option value="summer">Summer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Messages */}
            {error && (
              <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: colors.danger }}>
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm"
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: colors.success }}>
                <CheckCircle2 className="w-4 h-4" />
                {success}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column 1: Student Search */}
              <div className="rounded-xl p-5" style={{ backgroundColor: 'white', border: '1px solid rgba(179, 116, 74, 0.12)' }}>
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: colors.primary }}>
                  <User className="w-5 h-5" style={{ color: colors.secondary }} />
                  1. Select Student
                </h2>

                {!selectedStudent ? (
                  <>
                    <div className="flex gap-2 mb-2">
                      <select
                        value={studentStatusFilter}
                        onChange={(e) => setStudentStatusFilter(e.target.value as any)}
                        className="px-3 py-2 rounded-lg text-sm border"
                        style={{ borderColor: 'rgba(179, 116, 74, 0.2)' }}
                      >
                        <option value="all">All Students</option>
                        <option value="regular">Regular</option>
                        <option value="irregular">Irregular</option>
                      </select>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.neutral }} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search students..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg text-sm border"
                        style={{ borderColor: 'rgba(179, 116, 74, 0.2)' }}
                      />
                    </div>

                    {searchLoading && (
                      <div className="flex items-center gap-2 py-3 text-sm" style={{ color: colors.neutral }}>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Searching...
                      </div>
                    )}

                    {students.length > 0 && (
                      <div className="mt-2 border rounded-lg max-h-64 overflow-y-auto" style={{ borderColor: 'rgba(179, 116, 74, 0.2)' }}>
                        {students.map((student, index) => (
                          <button
                            key={`${student.studentNumber}-${index}`}
                            onClick={() => handleSelectStudent(student)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm" style={{ color: colors.primary }}>{student.name}</div>
                                <div className="text-xs" style={{ color: colors.neutral }}>{student.studentNumber} • {student.programCode}</div>
                              </div>
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-medium"
                                style={{
                                  backgroundColor: student.academicStatus === 'irregular' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                  color: student.academicStatus === 'irregular' ? '#D97706' : '#059669'
                                }}
                              >
                                {student.academicStatus || 'regular'}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 rounded-lg" style={{ backgroundColor: selectedStudent.academicStatus === 'irregular' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(16, 185, 129, 0.05)', border: `1px solid ${selectedStudent.academicStatus === 'irregular' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: selectedStudent.academicStatus === 'irregular' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)' }}>
                          <User className="w-5 h-5" style={{ color: selectedStudent.academicStatus === 'irregular' ? '#D97706' : '#059669' }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold" style={{ color: colors.primary }}>{selectedStudent.name}</span>
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-medium"
                              style={{
                                backgroundColor: selectedStudent.academicStatus === 'irregular' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: selectedStudent.academicStatus === 'irregular' ? '#D97706' : '#059669'
                              }}
                            >
                              {selectedStudent.academicStatus || 'regular'}
                            </span>
                          </div>
                          <div className="text-xs" style={{ color: colors.neutral }}>{selectedStudent.studentNumber} • {selectedStudent.programCode}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedStudent(null);
                          setSelectedSection(null);
                          setSchedules([]);
                          setEnrolledSubjects([]);
                        }}
                        className="text-xs px-2 py-1 rounded hover:bg-gray-100"
                        style={{ color: colors.neutral }}
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}
              </div>


              {/* Column 2: Section & Subject Selection */}
              <div className="rounded-xl p-5" style={{ backgroundColor: 'white', border: '1px solid rgba(179, 116, 74, 0.12)' }}>
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: colors.primary }}>
                  <Calendar className="w-5 h-5" style={{ color: colors.secondary }} />
                  2. Select Section & Subjects
                </h2>

                {!selectedStudent ? (
                  <div className="text-center py-8 text-sm" style={{ color: colors.neutral }}>
                    Select a student first
                  </div>
                ) : (
                  <>
                    {/* Section Dropdown */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium mb-2" style={{ color: colors.primary }}>
                        Choose Section
                      </label>
                      {loadingSections ? (
                        <div className="flex items-center gap-2 py-2 text-sm" style={{ color: colors.neutral }}>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading sections...
                        </div>
                      ) : (
                        <select
                          value={selectedSection?.id || ''}
                          onChange={(e) => {
                            const section = sections.find(s => s.id === parseInt(e.target.value));
                            setSelectedSection(section || null);
                          }}
                          className="w-full px-3 py-2 rounded-lg text-sm border"
                          style={{ borderColor: 'rgba(179, 116, 74, 0.2)' }}
                        >
                          <option value="">-- Select a section --</option>
                          {sections.map(section => (
                            <option key={section.id} value={section.id}>
                              {section.sectionName} - {section.programCode} Year {section.yearLevel}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Subjects from Section */}
                    {selectedSection && (
                      <div>
                        <label className="block text-xs font-medium mb-2" style={{ color: colors.primary }}>
                          Available Subjects
                        </label>
                        <div className="border rounded-lg max-h-80 overflow-y-auto" style={{ borderColor: 'rgba(179, 116, 74, 0.2)' }}>
                          {loadingSchedules ? (
                            <div className="p-4 text-center text-sm" style={{ color: colors.neutral }}>
                              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                              Loading subjects...
                            </div>
                          ) : schedules.length === 0 ? (
                            <div className="p-4 text-center text-sm" style={{ color: colors.neutral }}>
                              No subjects in this section
                            </div>
                          ) : (
                            schedules.map((schedule) => {
                              const enrolled = isEnrolled(schedule.id);
                              return (
                                <div
                                  key={schedule.id}
                                  className={`px-4 py-3 border-b last:border-b-0 ${enrolled ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm" style={{ color: enrolled ? colors.neutral : colors.primary }}>
                                          {schedule.courseCode}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" 
                                          style={{ backgroundColor: 'rgba(149, 90, 39, 0.1)', color: colors.secondary }}>
                                          {schedule.unitsTotal} units
                                        </span>
                                        {enrolled && (
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                            style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: colors.success }}>
                                            Enrolled
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs mt-0.5" style={{ color: colors.neutral }}>{schedule.courseTitle}</div>
                                      <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                                        <span className="text-[10px]" style={{ color: colors.tertiary }}>
                                          {schedule.dayOfWeek} {schedule.startTime}-{schedule.endTime}
                                        </span>
                                        {schedule.prerequisite && (
                                          <span className="text-[10px] px-1 rounded" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: colors.warning }}>
                                            Prereq: {schedule.prerequisite}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {!enrolled && (
                                      <button
                                        onClick={() => handleAddSubject(schedule)}
                                        disabled={submitting}
                                        className="p-1.5 rounded-lg transition-colors"
                                        style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: colors.success }}
                                        title="Add subject"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>


              {/* Column 3: Enrolled Subjects */}
              <div className="rounded-xl p-5" style={{ backgroundColor: 'white', border: '1px solid rgba(179, 116, 74, 0.12)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: colors.primary }}>
                    <GraduationCap className="w-5 h-5" style={{ color: colors.secondary }} />
                    Enrolled Subjects
                  </h2>
                  {selectedStudent && (
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-medium" style={{ color: colors.tertiary }}>Total Units</div>
                      <div className="text-lg font-bold" style={{ color: colors.secondary }}>{totalUnits}</div>
                    </div>
                  )}
                </div>

                {!selectedStudent ? (
                  <div className="text-center py-8 text-sm" style={{ color: colors.neutral }}>
                    Select a student to view enrolled subjects
                  </div>
                ) : loadingEnrolled ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: colors.secondary }} />
                    <p className="text-sm mt-2" style={{ color: colors.neutral }}>Loading...</p>
                  </div>
                ) : enrolledSubjects.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-10 h-10 mx-auto mb-2" style={{ color: colors.neutral }} />
                    <p className="text-sm" style={{ color: colors.neutral }}>No subjects enrolled yet</p>
                    <p className="text-xs mt-1" style={{ color: colors.tertiary }}>Select a section and add subjects</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {enrolledSubjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="p-3 rounded-lg"
                        style={{ border: '1px solid rgba(179, 116, 74, 0.1)', backgroundColor: 'rgba(253, 251, 248, 0.5)' }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm" style={{ color: colors.primary }}>{subject.courseCode}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                style={{ backgroundColor: 'rgba(149, 90, 39, 0.1)', color: colors.secondary }}>
                                {subject.unitsTotal} units
                              </span>
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: colors.neutral }}>{subject.courseTitle}</div>
                            <div className="flex flex-wrap gap-x-2 mt-1.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366F1' }}>
                                {subject.sectionName}
                              </span>
                              <span className="text-[10px]" style={{ color: colors.tertiary }}>
                                {subject.dayOfWeek} {subject.startTime}-{subject.endTime} • {subject.roomNumber}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveSubject(subject)}
                            className="p-1.5 rounded hover:bg-red-50 transition-colors"
                            style={{ color: colors.danger }}
                            title="Remove subject"
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
    </div>
  );
}
