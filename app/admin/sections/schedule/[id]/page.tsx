'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  createClassSchedule,
  getClassSchedules,
  getSectionCurriculum,
  deleteClassSchedule,
  getSectionById
} from '../../../../utils/sectionApi';
import { SectionResponse } from '../../../../types/sectionTypes';
import ConfirmationModal from '../../../../components/common/ConfirmationModal';
import SuccessModal from '../../../../components/common/SuccessModal';
import ErrorModal from '../../../../components/common/ErrorModal';
import { WeeklyScheduleCalendar } from '../../../../components/sections/WeeklyScheduleCalendar';
import Navigation from '../../../../components/Navigation';
import { colors } from '../../../../colors';
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
  ArrowLeft,
  AlertCircle,
  Loader2
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
];

export default function BuildSchedulePage() {
  const router = useRouter();
  const params = useParams();
  const sectionId = parseInt(params.id as string);

  // Handle navigation view changes with Next.js routing
  const handleViewChange = (view: string) => {
    const routeMap: Record<string, string> = {
      'dashboard': '/dashboard',
      'students': '/dashboard',
      'courses': '/dashboard',
      'enrollments': '/dashboard',
      'enrollment-form': '/dashboard',
      'resident-enrollment': '/dashboard',
      'curriculum': '/dashboard',
      'curriculum-program': '/dashboard',
      'scheduling': '/dashboard',
      'section-management': '/admin/sections',
      'file-maintenance': '/dashboard',
      'file-maintenance-building': '/dashboard',
      'file-maintenance-section': '/dashboard',
      'file-maintenance-room': '/dashboard',
      'file-maintenance-department': '/dashboard',
      'file-maintenance-major': '/dashboard',
      'file-maintenance-faculty': '/dashboard',
      'file-maintenance-fees': '/dashboard',
      'file-maintenance-discount': '/dashboard',
      'file-maintenance-products': '/dashboard',
      'file-maintenance-schools-programs': '/dashboard',
      'file-maintenance-subject': '/dashboard',
      'reports': '/dashboard',
      'forecast-billing': '/dashboard',
      'settings': '/dashboard',
      'assessment': '/dashboard',
      'payment-billing': '/dashboard',
    };

    const route = routeMap[view] || '/dashboard';
    router.push(route);
  };

  const [section, setSection] = useState<SectionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  
  // Separate loading states for better UX
  const [loadingSection, setLoadingSection] = useState(true);
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);
  const [loadingResources, setLoadingResources] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    facultyId: '',
    roomId: '',
    dayOfWeek: '',
    startTime: '',
    endTime: ''
  });

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

  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string;
  }>({
    isOpen: false,
    title: 'Error',
    message: ''
  });

  // Tab state for switching between form and calendar view
  const [activeTab, setActiveTab] = useState<'schedule' | 'calendar'>('schedule');

  useEffect(() => {
    loadScheduleData();
  }, [sectionId]);

  const loadScheduleData = async () => {
    try {
      setError(null);

      // Step 1: Load section details first (critical)
      setLoadingSection(true);
      const sectionData = await getSectionById(sectionId);
      setSection(sectionData);
      setLoadingSection(false);

      // Step 2: Load curriculum and schedules in parallel (dependent on section)
      setLoadingCurriculum(true);
      setLoadingSchedules(true);
      
      let curricData: any[] = [];
      let scheduleData: any[] = [];
      
      try {
        [curricData, scheduleData] = await Promise.all([
          getSectionCurriculum(
            sectionData.programId,
            sectionData.yearLevel,
            sectionData.semester
          ),
          getClassSchedules({
            sectionId: sectionData.id,
            academicYear: sectionData.academicYear,
            semester: sectionData.semester
          })
        ]);
      } catch (curriculumErr) {
        // Handle curriculum fetch error with modal
        setErrorModal({
          isOpen: true,
          title: 'Curriculum Error',
          message: curriculumErr instanceof Error ? curriculumErr.message : 'Failed to fetch curriculum',
          details: 'Please ensure an active curriculum exists for this program, year level, and semester.'
        });
      }
      
      setCurriculum(curricData);
      setSchedules(scheduleData);
      setLoadingCurriculum(false);
      setLoadingSchedules(false);

      // Step 3: Load faculty and rooms in parallel (independent, can load in background)
      setLoadingResources(true);
      const [facultyResponse, roomsResponse] = await Promise.all([
        fetch('/api/auth/faculty'),
        fetch('/api/auth/room')
      ]);

      if (facultyResponse.ok) {
        const facultyData = await facultyResponse.json();
        setFaculty(Array.isArray(facultyData) ? facultyData.filter((f: any) => f.status === 'active' || f.status === 1) : []);
      }

      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json();
        setRooms(Array.isArray(roomsData) ? roomsData.filter((r: any) => r.status === 'available' || r.status === 'active') : []);
      }
      
      setLoadingResources(false);
    } catch (err) {
      console.error('Failed to load schedule data:', err);
      setErrorModal({
        isOpen: true,
        title: 'Loading Error',
        message: err instanceof Error ? err.message : 'Failed to load schedule data',
        details: 'Please try refreshing the page or contact support if the issue persists.'
      });
      setLoadingSection(false);
      setLoadingCurriculum(false);
      setLoadingSchedules(false);
      setLoadingResources(false);
    }
  };

  const handleCourseSelect = (course: any) => {
    const isScheduled = schedules.some(s => s.curriculumCourseId === course.id);
    if (isScheduled) return;
    
    setSelectedCourse(course);
    setFormData({
      facultyId: '',
      roomId: '',
      dayOfWeek: '',
      startTime: '',
      endTime: ''
    });
    setError(null);
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) {
      setError('Please select a subject first');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (
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

      const startDate = new Date();
      startDate.setHours(startHour, startMin, 0);

      const endDate = new Date();
      endDate.setHours(endHour, endMin, 0);

      await createClassSchedule({
        sectionId: section!.id,
        curriculumCourseId: selectedCourse.id,
        facultyId: parseInt(formData.facultyId),
        roomId: parseInt(formData.roomId),
        dayOfWeek: formData.dayOfWeek,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        academicYear: section!.academicYear,
        semester: section!.semester
      });

      // Reload schedules
      const updatedSchedules = await getClassSchedules({
        sectionId: section!.id,
        academicYear: section!.academicYear,
        semester: section!.semester
      });
      setSchedules(updatedSchedules);
      
      setSuccessModal({
        isOpen: true,
        message: `Schedule for ${selectedCourse.course_code} has been added successfully.`
      });
      
      // Reset form
      setSelectedCourse(null);
      setFormData({
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
      
      const updatedSchedules = await getClassSchedules({
        sectionId: section!.id,
        academicYear: section!.academicYear,
        semester: section!.semester
      });
      setSchedules(updatedSchedules);
      
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

  const isReadOnly = section?.status === 'active' || section?.status === 'locked';
  const statusMessage = section?.status === 'active' 
    ? 'Section is active. Schedule is frozen and cannot be modified.'
    : section?.status === 'locked'
    ? 'Section is locked. No modifications allowed.'
    : '';

  return (
    <div className="flex h-screen overflow-hidden">
      <Navigation currentView="section-management" onViewChange={handleViewChange} />
      <div className="flex-1 flex flex-col overflow-y-auto relative z-10" style={{ backgroundColor: colors.neutralLight }}>
      {/* Loading State */}
      {loadingSection ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 
              className="animate-spin h-12 w-12 mx-auto"
              style={{ color: colors.secondary }}
            />
            <p className="mt-4 text-sm font-medium" style={{ color: colors.neutral }}>
              Loading section details...
            </p>
          </div>
        </div>
      ) : !section ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.danger }} />
            <p className="text-lg font-semibold mb-2" style={{ color: colors.primary }}>Section not found</p>
            <button
              onClick={() => router.push('/admin/sections')}
              className="px-4 py-2 rounded-lg mt-4 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colors.secondary, color: 'white' }}
            >
              Back to Sections
            </button>
          </div>
        </div>
      ) : (
        <>
      {/* Header */}
      <div
        className="sticky top-0 z-20 border-b shadow-sm"
        style={{
          backgroundColor: colors.paper,
          borderColor: colors.neutralBorder,
        }}
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/sections')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: colors.neutral }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${colors.secondary}20` }}
                >
                  <Calendar className="w-6 h-6" style={{ color: colors.secondary }} />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: colors.primary }}>
                    Build Schedule - {section.sectionName}
                  </h1>
                  <p className="text-sm" style={{ color: colors.neutral }}>
                    {section.programCode} • Year {section.yearLevel} • {section.academicYear} • {section.semester.charAt(0).toUpperCase() + section.semester.slice(1)} Semester
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs" style={{ color: colors.neutral }}>Completion</div>
                <div className="text-2xl font-bold" style={{ color: colors.secondary }}>
                  {curriculum.length > 0 ? Math.round((schedules.length / curriculum.length) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Warning */}
      {isReadOnly && (
        <div className="px-6 pt-4">
          <div
            className="p-3 rounded-lg border text-sm flex items-center gap-2"
            style={{
              backgroundColor: `${colors.warning}10`,
              borderColor: `${colors.warning}30`,
              color: colors.warning,
            }}
          >
            <AlertCircle className="w-4 h-4" />
            {statusMessage}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {/* Content Area */}
          <div className="space-y-4">
            {/* Progress Summary */}
            <div
              className="rounded-xl shadow-sm border p-3"
              style={{
                backgroundColor: colors.paper,
                borderColor: colors.neutralBorder,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4" style={{ color: colors.secondary }} />
                <h2 className="text-sm font-semibold" style={{ color: colors.primary }}>
                  Schedule Progress
                </h2>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: `${colors.info}05` }}>
                  <div className="text-xl font-bold" style={{ color: colors.info }}>
                    {curriculum.length}
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: colors.neutral }}>
                    Total Subjects
                  </div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: `${colors.success}05` }}>
                  <div className="text-xl font-bold" style={{ color: colors.success }}>
                    {schedules.length}
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: colors.neutral }}>
                    Scheduled
                  </div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: `${colors.warning}05` }}>
                  <div className="text-xl font-bold" style={{ color: colors.warning }}>
                    {curriculum.length - schedules.length}
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: colors.neutral }}>
                    Remaining
                  </div>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: `${colors.secondary}05` }}>
                  <div className="text-xl font-bold" style={{ color: colors.secondary }}>
                    {curriculum.length > 0 ? Math.round((schedules.length / curriculum.length) * 100) : 0}%
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: colors.neutral }}>
                    Complete
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div
              className="rounded-xl shadow-sm border overflow-hidden"
              style={{
                backgroundColor: colors.paper,
                borderColor: colors.neutralBorder,
              }}
            >
              <div className="flex border-b" style={{ borderColor: colors.neutralBorder }}>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="flex-1 px-4 py-2 text-sm font-medium transition-all"
                  style={{
                    backgroundColor: activeTab === 'schedule' ? `${colors.secondary}10` : 'transparent',
                    color: activeTab === 'schedule' ? colors.secondary : colors.neutral,
                    borderBottom: activeTab === 'schedule' ? `2px solid ${colors.secondary}` : '2px solid transparent',
                  }}
                >
                  📝 Schedule Form
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className="flex-1 px-4 py-2 text-sm font-medium transition-all"
                  style={{
                    backgroundColor: activeTab === 'calendar' ? `${colors.secondary}10` : 'transparent',
                    color: activeTab === 'calendar' ? colors.secondary : colors.neutral,
                    borderBottom: activeTab === 'calendar' ? `2px solid ${colors.secondary}` : '2px solid transparent',
                  }}
                >
                  📅 Weekly Calendar
                </button>
              </div>
            </div>

            {/* Schedule Form Tab Content */}
            {activeTab === 'schedule' && (
              <>
            {/* Curriculum Subjects - Clickable Cards */}
            <div
              className="rounded-xl shadow-sm border p-3"
              style={{
                backgroundColor: colors.paper,
                borderColor: colors.neutralBorder,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" style={{ color: colors.secondary }} />
                  <h2 className="text-sm font-semibold" style={{ color: colors.primary }}>
                    Curriculum Subjects ({curriculum.length})
                  </h2>
                </div>
                <div className="text-xs" style={{ color: colors.neutral }}>
                  Click a subject to schedule
                </div>
              </div>
              {loadingCurriculum ? (
                <div className="text-center py-6">
                  <Loader2 className="animate-spin w-6 h-6 mx-auto mb-2" style={{ color: colors.secondary }} />
                  <p className="text-xs" style={{ color: colors.neutral }}>
                    Loading curriculum...
                  </p>
                </div>
              ) : curriculum.length === 0 ? (
                <div className="text-center py-6">
                  <BookOpen className="w-10 h-10 mx-auto mb-2" style={{ color: colors.neutral }} />
                  <p className="text-sm" style={{ color: colors.neutral }}>
                    No curriculum courses found for this program, year level, and semester.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {curriculum.map((course) => {
                    const isScheduled = schedules.some(s => s.curriculumCourseId === course.id);
                    const isSelected = selectedCourse?.id === course.id;
                    
                    return (
                      <button
                        key={course.id}
                        onClick={() => handleCourseSelect(course)}
                        disabled={isScheduled || isReadOnly}
                        className={`p-2 rounded-lg border transition-all text-left ${
                          isScheduled ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-md'
                        } ${isSelected ? 'ring-2 ring-offset-1' : ''}`}
                        style={{
                          backgroundColor: isScheduled 
                            ? `${colors.success}08` 
                            : isSelected 
                            ? `${colors.secondary}08`
                            : 'white',
                          borderColor: isScheduled 
                            ? colors.success 
                            : isSelected 
                            ? colors.secondary
                            : colors.neutralBorder,
                          ...(isSelected && { '--tw-ring-color': colors.secondary } as any),
                        }}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs mb-1" style={{ color: colors.primary }}>
                              {course.course_code}
                            </div>
                            <div className="text-[10px] line-clamp-2 leading-snug mb-1" style={{ color: colors.neutral }}>
                              {course.descriptive_title}
                            </div>
                            <div className="text-[10px]" style={{ color: colors.neutral }}>
                              {course.units_total} units
                            </div>
                          </div>
                          {isScheduled && (
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.success }} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Schedule Form */}
            {!isReadOnly && selectedCourse && (
              <div
                className="rounded-2xl shadow-sm border p-5"
                style={{
                  backgroundColor: colors.paper,
                  borderColor: colors.neutralBorder,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" style={{ color: colors.secondary }} />
                    <h2 className="text-base font-semibold" style={{ color: colors.primary }}>
                      Schedule for {selectedCourse.course_code}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedCourse(null)}
                    className="p-1 rounded hover:bg-gray-100"
                    style={{ color: colors.neutral }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddSchedule} className="space-y-4">
                  {error && (
                    <div
                      className="border rounded-lg p-3 text-sm flex items-center gap-2"
                      style={{
                        backgroundColor: `${colors.danger}10`,
                        borderColor: `${colors.danger}30`,
                        color: colors.danger,
                      }}
                    >
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: colors.primary }}>
                        <UserCircle className="w-4 h-4" />
                        Faculty <span style={{ color: colors.danger }}>*</span>
                      </label>
                      <select
                        value={formData.facultyId}
                        onChange={(e) => handleInputChange('facultyId', e.target.value)}
                        disabled={loadingResources}
                        className="w-full px-3 py-2.5 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          outline: 'none',
                          color: colors.primary,
                          borderColor: colors.neutralBorder,
                        }}
                        onFocus={(e) => {
                          if (!loadingResources) {
                            e.currentTarget.style.borderColor = colors.secondary;
                            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                          }
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = colors.neutralBorder;
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">{loadingResources ? 'Loading faculty...' : 'Select faculty'}</option>
                        {faculty.map((f) => (
                          <option key={f.id} value={f.id.toString()}>
                            {f.first_name} {f.last_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: colors.primary }}>
                        <Building2 className="w-4 h-4" />
                        Room <span style={{ color: colors.danger }}>*</span>
                      </label>
                      <select
                        value={formData.roomId}
                        onChange={(e) => handleInputChange('roomId', e.target.value)}
                        disabled={loadingResources}
                        className="w-full px-3 py-2.5 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          outline: 'none',
                          color: colors.primary,
                          borderColor: colors.neutralBorder,
                        }}
                        onFocus={(e) => {
                          if (!loadingResources) {
                            e.currentTarget.style.borderColor = colors.secondary;
                            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                          }
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = colors.neutralBorder;
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">{loadingResources ? 'Loading rooms...' : 'Select room'}</option>
                        {rooms.map((room) => (
                          <option key={room.id} value={room.id.toString()}>
                            {room.room_number} (Cap: {room.capacity})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: colors.primary }}>
                        <Calendar className="w-4 h-4" />
                        Day <span style={{ color: colors.danger }}>*</span>
                      </label>
                      <select
                        value={formData.dayOfWeek}
                        onChange={(e) => handleInputChange('dayOfWeek', e.target.value)}
                        className="w-full px-3 py-2.5 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0"
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

                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: colors.primary }}>
                        <Clock className="w-4 h-4" />
                        Start Time <span style={{ color: colors.danger }}>*</span>
                      </label>
                      <select
                        value={formData.startTime}
                        onChange={(e) => handleInputChange('startTime', e.target.value)}
                        className="w-full px-3 py-2.5 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0"
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
                        <option value="">Start time</option>
                        {TIME_SLOTS.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: colors.primary }}>
                        <Clock className="w-4 h-4" />
                        End Time <span style={{ color: colors.danger }}>*</span>
                      </label>
                      <select
                        value={formData.endTime}
                        onChange={(e) => handleInputChange('endTime', e.target.value)}
                        className="w-full px-3 py-2.5 border rounded-lg text-sm transition-all focus:ring-2 focus:ring-offset-0 disabled:opacity-50"
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
                        <option value="">End time</option>
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
                          
                          return (
                            <option 
                              key={time} 
                              value={time}
                              disabled={endTotal <= startTotal}
                            >
                              {time} {endTotal <= startTotal ? '(Invalid)' : ''}
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
                      onClick={() => setSelectedCourse(null)}
                      disabled={loading}
                      className="flex-1 px-6 py-2.5 rounded-xl transition-all font-medium flex items-center justify-center gap-2"
                      style={{
                        color: colors.primary,
                        border: `1px solid ${colors.neutralBorder}`,
                        backgroundColor: colors.paper,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || loadingResources}
                      className="flex-1 px-6 py-2.5 text-white rounded-xl transition-all font-medium flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: colors.secondary,
                        boxShadow: '0 4px 6px -1px rgba(149, 90, 39, 0.2)',
                      }}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Add Schedule
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
              </>
            )}

            {/* Calendar Tab Content */}
            {activeTab === 'calendar' && (
              <div
                className="rounded-2xl shadow-sm border p-5"
                style={{
                  backgroundColor: colors.paper,
                  borderColor: colors.neutralBorder,
                }}
              >
                <WeeklyScheduleCalendar
                  schedules={schedules.map(s => {
                    const course = curriculum.find(c => c.id === s.curriculumCourseId);
                    return {
                      id: s.id,
                      curriculumCourseId: s.curriculumCourseId,
                      courseCode: course?.course_code || 'N/A',
                      courseTitle: course?.descriptive_title || '',
                      facultyName: s.faculty 
                        ? `${s.faculty.first_name} ${s.faculty.last_name}`
                        : 'N/A',
                      roomNumber: s.room?.room_number || 'N/A',
                      dayOfWeek: s.dayOfWeek,
                      startTime: s.startTime,
                      endTime: s.endTime,
                    };
                  })}
                  previewBlock={
                    selectedCourse && formData.dayOfWeek && formData.startTime && formData.endTime
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
                          courseCode: selectedCourse?.course_code,
                        }
                      : null
                  }
                  readOnly={isReadOnly}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}
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
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        message={successModal.message}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: 'Error', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
        details={errorModal.details}
      />
    </div>
  );
}
