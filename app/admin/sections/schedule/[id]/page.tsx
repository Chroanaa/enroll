'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  createClassSchedule,
  getClassSchedules,
  getSectionCurriculum,
  deleteClassSchedule,
  getSectionById,
  updateClassSchedule
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
  Loader2,
  Search
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
    if (view === 'section-management') {
      router.push('/dashboard?view=section-management');
      return;
    }
    router.push(`/dashboard?view=${view}`);
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

  // Conflict warning modal state
  const [conflictModal, setConflictModal] = useState<{
    isOpen: boolean;
    type: 'faculty' | 'room' | 'section' | 'subject' | null;
    title: string;
    message: string;
    day: string;
    startTime: string;
    endTime: string;
    resourceName: string;
  }>({
    isOpen: false,
    type: null,
    title: '',
    message: '',
    day: '',
    startTime: '',
    endTime: '',
    resourceName: ''
  });

  // Faculty search modal state
  const [facultySearchModal, setFacultySearchModal] = useState(false);
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [selectedFacultyDisplay, setSelectedFacultyDisplay] = useState('');

  // Filtered faculty based on search
  const filteredFaculty = useMemo(() => {
    if (!facultySearchQuery.trim()) return faculty;
    const query = facultySearchQuery.toLowerCase();
    return faculty.filter(f => 
      `${f.first_name} ${f.last_name}`.toLowerCase().includes(query) ||
      f.first_name.toLowerCase().includes(query) ||
      f.last_name.toLowerCase().includes(query)
    );
  }, [faculty, facultySearchQuery]);

  // Tab state for switching between form and calendar view
  const [activeTab, setActiveTab] = useState<'schedule' | 'calendar'>('schedule');

  // Edit schedule modal state (full edit: faculty, room, day, time)
  const [editScheduleModal, setEditScheduleModal] = useState<{
    isOpen: boolean;
    schedule: any | null;
  }>({
    isOpen: false,
    schedule: null
  });
  const [editFormData, setEditFormData] = useState({
    facultyId: '',
    roomId: '',
    dayOfWeek: '',
    startTime: '',
    endTime: ''
  });
  const [editFacultySearchQuery, setEditFacultySearchQuery] = useState('');
  const [editFacultySearchModal, setEditFacultySearchModal] = useState(false);
  const [selectedEditFacultyDisplay, setSelectedEditFacultyDisplay] = useState('');

  // Filtered faculty for edit modal
  const filteredEditFaculty = useMemo(() => {
    if (!editFacultySearchQuery.trim()) return faculty;
    const query = editFacultySearchQuery.toLowerCase();
    return faculty.filter(f => 
      `${f.first_name} ${f.last_name}`.toLowerCase().includes(query) ||
      f.first_name.toLowerCase().includes(query) ||
      f.last_name.toLowerCase().includes(query)
    );
  }, [faculty, editFacultySearchQuery]);

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
    setSelectedFacultyDisplay('');
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
      setSelectedFacultyDisplay('');
      setFormData({
        facultyId: '',
        roomId: '',
        dayOfWeek: '',
        startTime: '',
        endTime: ''
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add schedule';
      
      // Parse conflict errors and show user-friendly modal
      const selectedFaculty = faculty.find(f => f.id === parseInt(formData.facultyId));
      const selectedRoom = rooms.find(r => r.id === parseInt(formData.roomId));
      
      // Format time for display
      const formatTimeDisplay = (time: string) => {
        const [hour, min] = time.split(':').map(Number);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
      };
      
      if (errorMessage.toLowerCase().includes('faculty') && errorMessage.toLowerCase().includes('conflict')) {
        setConflictModal({
          isOpen: true,
          type: 'faculty',
          title: 'Faculty Schedule Conflict',
          message: `${selectedFaculty ? `${selectedFaculty.first_name} ${selectedFaculty.last_name}` : 'The selected faculty'} already has a class scheduled during this time slot.`,
          day: formData.dayOfWeek,
          startTime: formatTimeDisplay(formData.startTime),
          endTime: formatTimeDisplay(formData.endTime),
          resourceName: selectedFaculty ? `${selectedFaculty.first_name} ${selectedFaculty.last_name}` : 'Faculty'
        });
      } else if (errorMessage.toLowerCase().includes('room') && errorMessage.toLowerCase().includes('conflict')) {
        setConflictModal({
          isOpen: true,
          type: 'room',
          title: 'Room Already Booked',
          message: `Room ${selectedRoom?.room_number || ''} is already booked during this time slot.`,
          day: formData.dayOfWeek,
          startTime: formatTimeDisplay(formData.startTime),
          endTime: formatTimeDisplay(formData.endTime),
          resourceName: selectedRoom?.room_number || 'Room'
        });
      } else if (errorMessage.toLowerCase().includes('section') && errorMessage.toLowerCase().includes('conflict')) {
        setConflictModal({
          isOpen: true,
          type: 'section',
          title: 'Section Time Overlap',
          message: 'This section already has another subject scheduled during this time slot.',
          day: formData.dayOfWeek,
          startTime: formatTimeDisplay(formData.startTime),
          endTime: formatTimeDisplay(formData.endTime),
          resourceName: section?.sectionName || 'Section'
        });
      } else if (errorMessage.toLowerCase().includes('subject') && errorMessage.toLowerCase().includes('duplicate')) {
        setConflictModal({
          isOpen: true,
          type: 'subject',
          title: 'Subject Already Scheduled',
          message: `${selectedCourse?.course_code || 'This subject'} is already scheduled in this section for this term.`,
          day: '',
          startTime: '',
          endTime: '',
          resourceName: selectedCourse?.course_code || 'Subject'
        });
      } else {
        setError(errorMessage);
      }
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

  // Handle opening edit schedule modal
  const handleEditSchedule = (schedule: any) => {
    // Parse times from ISO to HH:mm format
    const startDate = new Date(schedule.startTime);
    const endDate = new Date(schedule.endTime);
    const startTimeStr = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
    const endTimeStr = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    
    const facultyMember = faculty.find(f => f.id === schedule.facultyId);
    
    setEditScheduleModal({
      isOpen: true,
      schedule
    });
    setEditFormData({
      facultyId: schedule.facultyId?.toString() || '',
      roomId: schedule.roomId?.toString() || '',
      dayOfWeek: schedule.dayOfWeek || '',
      startTime: startTimeStr,
      endTime: endTimeStr
    });
    setSelectedEditFacultyDisplay(facultyMember ? `${facultyMember.first_name} ${facultyMember.last_name}` : '');
    setEditFacultySearchQuery('');
  };

  // Handle edit form input change
  const handleEditInputChange = (name: string, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle saving schedule changes
  const handleSaveScheduleChanges = async () => {
    if (!editScheduleModal.schedule) return;

    try {
      setLoading(true);
      setError(null);

      // Build update data - convert times to ISO
      const updateData: any = {};
      
      if (editFormData.facultyId && editFormData.facultyId !== editScheduleModal.schedule.facultyId?.toString()) {
        updateData.facultyId = parseInt(editFormData.facultyId);
      }
      if (editFormData.roomId && editFormData.roomId !== editScheduleModal.schedule.roomId?.toString()) {
        updateData.roomId = parseInt(editFormData.roomId);
      }
      if (editFormData.dayOfWeek && editFormData.dayOfWeek !== editScheduleModal.schedule.dayOfWeek) {
        updateData.dayOfWeek = editFormData.dayOfWeek;
      }
      
      // Convert time strings to ISO
      if (editFormData.startTime) {
        const [hour, min] = editFormData.startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hour, min, 0, 0);
        updateData.startTime = startDate.toISOString();
      }
      if (editFormData.endTime) {
        const [hour, min] = editFormData.endTime.split(':').map(Number);
        const endDate = new Date();
        endDate.setHours(hour, min, 0, 0);
        updateData.endTime = endDate.toISOString();
      }

      await updateClassSchedule(editScheduleModal.schedule.id, updateData);

      // Reload schedules
      const updatedSchedules = await getClassSchedules({
        sectionId: section!.id,
        academicYear: section!.academicYear,
        semester: section!.semester
      });
      setSchedules(updatedSchedules);

      setSuccessModal({
        isOpen: true,
        message: 'Schedule updated successfully.'
      });

      setEditScheduleModal({ isOpen: false, schedule: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule');
    } finally {
      setLoading(false);
    }
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

  const isReadOnly = section?.status === 'locked';
  const isActiveSection = section?.status === 'active';
  const canEditFaculty = section?.status === 'active' || section?.status === 'draft';
  const statusMessage = section?.status === 'locked'
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
              onClick={() => router.push('/dashboard?view=section-management')}
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
        className="sticky top-0 z-20"
        style={{
          backgroundColor: 'rgba(253, 251, 248, 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(179, 116, 74, 0.1)',
          boxShadow: '0 1px 3px rgba(58, 35, 19, 0.03)',
        }}
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard?view=section-management')}
                className="p-2 rounded-lg transition-colors"
                style={{ 
                  color: colors.tertiary,
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(179, 116, 74, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ 
                    backgroundColor: 'rgba(149, 90, 39, 0.08)', 
                    border: '1px solid rgba(149, 90, 39, 0.12)' 
                  }}
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
              <div 
                className="text-right px-4 py-2 rounded-lg"
                style={{ 
                  backgroundColor: 'rgba(149, 90, 39, 0.06)',
                  border: '1px solid rgba(149, 90, 39, 0.1)',
                }}
              >
                <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: colors.tertiary }}>Completion</div>
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
            className="p-3 rounded-lg text-sm flex items-center gap-2"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              color: '#B45309',
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
            <div className="grid grid-cols-4 gap-4">
              <div 
                className='rounded-xl p-5'
                style={{
                  backgroundColor: 'white',
                  border: '1px solid rgba(179, 116, 74, 0.12)',
                  boxShadow: '0 1px 3px rgba(58, 35, 19, 0.06), 0 1px 2px rgba(58, 35, 19, 0.04)',
                }}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs font-medium mb-1' style={{ color: colors.tertiary }}>Total Subjects</p>
                    <p className='text-2xl font-bold' style={{ color: colors.primary }}>
                      {curriculum.length}
                    </p>
                  </div>
                  <div 
                    className='p-3 rounded-lg'
                    style={{ backgroundColor: 'rgba(179, 116, 74, 0.08)' }}
                  >
                    <BookOpen className='w-5 h-5' style={{ color: colors.tertiary }} />
                  </div>
                </div>
              </div>
              <div 
                className='rounded-xl p-5'
                style={{
                  backgroundColor: 'white',
                  border: '1px solid rgba(179, 116, 74, 0.12)',
                  boxShadow: '0 1px 3px rgba(58, 35, 19, 0.06), 0 1px 2px rgba(58, 35, 19, 0.04)',
                }}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs font-medium mb-1' style={{ color: colors.success }}>Scheduled</p>
                    <p className='text-2xl font-bold' style={{ color: colors.primary }}>
                      {schedules.length}
                    </p>
                  </div>
                  <div 
                    className='p-3 rounded-lg'
                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)' }}
                  >
                    <CheckCircle2 className='w-5 h-5' style={{ color: colors.success }} />
                  </div>
                </div>
              </div>
              <div 
                className='rounded-xl p-5'
                style={{
                  backgroundColor: 'white',
                  border: '1px solid rgba(179, 116, 74, 0.12)',
                  boxShadow: '0 1px 3px rgba(58, 35, 19, 0.06), 0 1px 2px rgba(58, 35, 19, 0.04)',
                }}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs font-medium mb-1' style={{ color: colors.warning }}>Remaining</p>
                    <p className='text-2xl font-bold' style={{ color: colors.primary }}>
                      {curriculum.length - schedules.length}
                    </p>
                  </div>
                  <div 
                    className='p-3 rounded-lg'
                    style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)' }}
                  >
                    <Clock className='w-5 h-5' style={{ color: colors.warning }} />
                  </div>
                </div>
              </div>
              <div 
                className='rounded-xl p-5'
                style={{
                  backgroundColor: 'white',
                  border: '1px solid rgba(179, 116, 74, 0.12)',
                  boxShadow: '0 1px 3px rgba(58, 35, 19, 0.06), 0 1px 2px rgba(58, 35, 19, 0.04)',
                }}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-xs font-medium mb-1' style={{ color: colors.secondary }}>Complete</p>
                    <p className='text-2xl font-bold' style={{ color: colors.primary }}>
                      {curriculum.length > 0 ? Math.round((schedules.length / curriculum.length) * 100) : 0}%
                    </p>
                  </div>
                  <div 
                    className='p-3 rounded-lg'
                    style={{ backgroundColor: 'rgba(149, 90, 39, 0.08)' }}
                  >
                    <Calendar className='w-5 h-5' style={{ color: colors.secondary }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: '#FDFCFA',
                border: '1px solid rgba(179, 116, 74, 0.15)',
                boxShadow: '0 1px 2px rgba(58, 35, 19, 0.03)',
              }}
            >
              <div className="flex" style={{ borderBottom: '1px solid rgba(179, 116, 74, 0.1)' }}>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="flex-1 px-4 py-3.5 text-sm font-medium transition-all"
                  style={{
                    backgroundColor: activeTab === 'schedule' ? 'rgba(149, 90, 39, 0.06)' : 'transparent',
                    color: activeTab === 'schedule' ? colors.secondary : colors.neutral,
                    borderBottom: activeTab === 'schedule' ? `2px solid ${colors.secondary}` : '2px solid transparent',
                  }}
                >
                  📝 Schedule Form
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className="flex-1 px-4 py-3.5 text-sm font-medium transition-all"
                  style={{
                    backgroundColor: activeTab === 'calendar' ? 'rgba(149, 90, 39, 0.06)' : 'transparent',
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
              className="rounded-xl p-5"
              style={{
                backgroundColor: '#FDFCFA',
                border: '1px solid rgba(179, 116, 74, 0.12)',
                boxShadow: '0 1px 3px rgba(58, 35, 19, 0.04)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
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
                <div className="text-center py-8">
                  <Loader2 className="animate-spin w-6 h-6 mx-auto mb-2" style={{ color: colors.secondary }} />
                  <p className="text-xs" style={{ color: colors.neutral }}>
                    Loading curriculum...
                  </p>
                </div>
              ) : curriculum.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-10 h-10 mx-auto mb-2" style={{ color: colors.neutral }} />
                  <p className="text-sm" style={{ color: colors.neutral }}>
                    No curriculum courses found for this program, year level, and semester.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {curriculum.map((course) => {
                    const isScheduled = schedules.some(s => s.curriculumCourseId === course.id);
                    const isSelected = selectedCourse?.id === course.id;
                    
                    return (
                      <button
                        key={course.id}
                        onClick={() => handleCourseSelect(course)}
                        disabled={isScheduled || isReadOnly}
                        className={`p-3 rounded-lg transition-all text-left ${
                          isScheduled ? 'cursor-not-allowed' : 'cursor-pointer'
                        } ${isSelected ? 'ring-2 ring-offset-1' : ''}`}
                        style={{
                          backgroundColor: isScheduled 
                            ? 'rgba(16, 185, 129, 0.06)' 
                            : isSelected 
                            ? 'rgba(149, 90, 39, 0.06)'
                            : 'white',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: isScheduled 
                            ? 'rgba(16, 185, 129, 0.3)' 
                            : isSelected 
                            ? colors.secondary
                            : 'rgba(179, 116, 74, 0.15)',
                          boxShadow: isSelected 
                            ? '0 2px 8px rgba(149, 90, 39, 0.15)' 
                            : isScheduled 
                            ? 'none'
                            : '0 1px 2px rgba(58, 35, 19, 0.04)',
                          ...(isSelected && { '--tw-ring-color': colors.secondary } as any),
                        }}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs mb-1" style={{ color: colors.primary }}>
                              {course.course_code}
                            </div>
                            <div className="text-[10px] line-clamp-2 leading-snug mb-1.5" style={{ color: colors.neutral }}>
                              {course.descriptive_title}
                            </div>
                            <div className="text-[10px]" style={{ color: colors.tertiary }}>
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
                className="rounded-xl p-5"
                style={{
                  backgroundColor: '#FDFCFA',
                  border: '1px solid rgba(179, 116, 74, 0.12)',
                  boxShadow: '0 2px 6px rgba(58, 35, 19, 0.06)',
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
                      className="rounded-lg p-3 text-sm flex items-center gap-2"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.06)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
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
                        <UserCircle className="w-4 h-4" style={{ color: colors.tertiary }} />
                        Faculty <span style={{ color: colors.danger }}>*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setFacultySearchQuery('');
                          setFacultySearchModal(true);
                        }}
                        disabled={loadingResources}
                        className="w-full px-3 py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left flex items-center justify-between gap-2"
                        style={{
                          outline: 'none',
                          color: formData.facultyId ? colors.primary : colors.neutral,
                          backgroundColor: 'white',
                          border: '1px solid rgba(179, 116, 74, 0.2)',
                        }}
                      >
                        <span className="truncate">
                          {loadingResources 
                            ? 'Loading faculty...' 
                            : selectedFacultyDisplay || 'Search faculty...'}
                        </span>
                        <Search className="w-4 h-4 flex-shrink-0" style={{ color: colors.tertiary }} />
                      </button>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: colors.primary }}>
                        <Building2 className="w-4 h-4" style={{ color: colors.tertiary }} />
                        Room <span style={{ color: colors.danger }}>*</span>
                      </label>
                      <select
                        value={formData.roomId}
                        onChange={(e) => handleInputChange('roomId', e.target.value)}
                        disabled={loadingResources}
                        className="w-full px-3 py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          outline: 'none',
                          color: colors.primary,
                          backgroundColor: 'white',
                          border: '1px solid rgba(179, 116, 74, 0.2)',
                        }}
                        onFocus={(e) => {
                          if (!loadingResources) {
                            e.currentTarget.style.borderColor = colors.secondary;
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(149, 90, 39, 0.1)';
                          }
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(179, 116, 74, 0.2)';
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
                        <Calendar className="w-4 h-4" style={{ color: colors.tertiary }} />
                        Day <span style={{ color: colors.danger }}>*</span>
                      </label>
                      <select
                        value={formData.dayOfWeek}
                        onChange={(e) => handleInputChange('dayOfWeek', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-sm transition-all"
                        style={{
                          outline: 'none',
                          color: colors.primary,
                          backgroundColor: 'white',
                          border: '1px solid rgba(179, 116, 74, 0.2)',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = colors.secondary;
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(149, 90, 39, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(179, 116, 74, 0.2)';
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
                        <Clock className="w-4 h-4" style={{ color: colors.tertiary }} />
                        Start Time <span style={{ color: colors.danger }}>*</span>
                      </label>
                      <select
                        value={formData.startTime}
                        onChange={(e) => handleInputChange('startTime', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-sm transition-all"
                        style={{
                          outline: 'none',
                          color: colors.primary,
                          backgroundColor: 'white',
                          border: '1px solid rgba(179, 116, 74, 0.2)',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = colors.secondary;
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(149, 90, 39, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(179, 116, 74, 0.2)';
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
                        <Clock className="w-4 h-4" style={{ color: colors.tertiary }} />
                        End Time <span style={{ color: colors.danger }}>*</span>
                      </label>
                      <select
                        value={formData.endTime}
                        onChange={(e) => handleInputChange('endTime', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-sm transition-all disabled:opacity-50"
                        style={{
                          outline: 'none',
                          color: colors.primary,
                          backgroundColor: 'white',
                          border: '1px solid rgba(179, 116, 74, 0.2)',
                        }}
                        disabled={!formData.startTime}
                        onFocus={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.borderColor = colors.secondary;
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(149, 90, 39, 0.1)';
                          }
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(179, 116, 74, 0.2)';
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
                      className="flex-1 px-6 py-2.5 rounded-lg transition-all font-medium flex items-center justify-center gap-2"
                      style={{
                        color: colors.primary,
                        border: '1px solid rgba(179, 116, 74, 0.2)',
                        backgroundColor: 'white',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || loadingResources}
                      className="flex-1 px-6 py-2.5 text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: colors.secondary,
                        boxShadow: '0 2px 4px rgba(149, 90, 39, 0.2), 0 1px 2px rgba(149, 90, 39, 0.1)',
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
                className="rounded-xl p-5"
                style={{
                  backgroundColor: '#FDFCFA',
                  border: '1px solid rgba(179, 116, 74, 0.12)',
                  boxShadow: '0 1px 3px rgba(58, 35, 19, 0.04)',
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
                  onDeleteSchedule={(schedule) => {
                    const originalSchedule = schedules.find(s => s.id === schedule.id);
                    if (originalSchedule) {
                      handleDeleteSchedule(originalSchedule);
                    }
                  }}
                  onEditFaculty={(schedule) => {
                    const originalSchedule = schedules.find(s => s.id === schedule.id);
                    if (originalSchedule) {
                      handleEditSchedule(originalSchedule);
                    }
                  }}
                  readOnly={isReadOnly}
                  canEditFaculty={canEditFaculty}
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

      {/* Schedule Conflict Warning Modal */}
      {conflictModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setConflictModal({ ...conflictModal, isOpen: false })}
          />
          
          {/* Modal */}
          <div 
            className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: colors.paper,
              boxShadow: '0 25px 50px -12px rgba(58, 35, 19, 0.25)',
            }}
          >
            {/* Header with warning color */}
            <div 
              className="px-6 py-4 flex items-center gap-3"
              style={{
                backgroundColor: conflictModal.type === 'faculty' ? 'rgba(245, 158, 11, 0.1)' :
                                conflictModal.type === 'room' ? 'rgba(239, 68, 68, 0.1)' :
                                conflictModal.type === 'section' ? 'rgba(59, 130, 246, 0.1)' :
                                'rgba(149, 90, 39, 0.1)',
                borderBottom: '1px solid rgba(179, 116, 74, 0.1)',
              }}
            >
              <div 
                className="p-2.5 rounded-xl"
                style={{
                  backgroundColor: conflictModal.type === 'faculty' ? 'rgba(245, 158, 11, 0.15)' :
                                  conflictModal.type === 'room' ? 'rgba(239, 68, 68, 0.15)' :
                                  conflictModal.type === 'section' ? 'rgba(59, 130, 246, 0.15)' :
                                  'rgba(149, 90, 39, 0.15)',
                }}
              >
                <AlertCircle 
                  className="w-6 h-6" 
                  style={{ 
                    color: conflictModal.type === 'faculty' ? colors.warning :
                           conflictModal.type === 'room' ? colors.danger :
                           conflictModal.type === 'section' ? colors.info :
                           colors.secondary
                  }} 
                />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: colors.primary }}>
                  {conflictModal.title}
                </h3>
                <p className="text-xs" style={{ color: colors.neutral }}>
                  Schedule conflict detected
                </p>
              </div>
            </div>
            
            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-sm mb-4" style={{ color: colors.primary }}>
                {conflictModal.message}
              </p>
              
              {/* Conflict Details */}
              {conflictModal.day && (
                <div 
                  className="rounded-xl p-4 space-y-3"
                  style={{ 
                    backgroundColor: 'rgba(179, 116, 74, 0.05)',
                    border: '1px solid rgba(179, 116, 74, 0.1)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: 'rgba(149, 90, 39, 0.1)' }}
                    >
                      <Calendar className="w-4 h-4" style={{ color: colors.secondary }} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: colors.neutral }}>
                        Day
                      </p>
                      <p className="text-sm font-semibold" style={{ color: colors.primary }}>
                        {conflictModal.day}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: 'rgba(149, 90, 39, 0.1)' }}
                    >
                      <Clock className="w-4 h-4" style={{ color: colors.secondary }} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: colors.neutral }}>
                        Time Slot
                      </p>
                      <p className="text-sm font-semibold" style={{ color: colors.primary }}>
                        {conflictModal.startTime} - {conflictModal.endTime}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: 'rgba(149, 90, 39, 0.1)' }}
                    >
                      {conflictModal.type === 'faculty' ? (
                        <UserCircle className="w-4 h-4" style={{ color: colors.secondary }} />
                      ) : conflictModal.type === 'room' ? (
                        <Building2 className="w-4 h-4" style={{ color: colors.secondary }} />
                      ) : (
                        <BookOpen className="w-4 h-4" style={{ color: colors.secondary }} />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: colors.neutral }}>
                        {conflictModal.type === 'faculty' ? 'Faculty' : 
                         conflictModal.type === 'room' ? 'Room' : 'Resource'}
                      </p>
                      <p className="text-sm font-semibold" style={{ color: colors.primary }}>
                        {conflictModal.resourceName}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Suggestion */}
              <div 
                className="mt-4 p-3 rounded-lg flex items-start gap-2"
                style={{ 
                  backgroundColor: 'rgba(59, 130, 246, 0.06)',
                  border: '1px solid rgba(59, 130, 246, 0.15)',
                }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.info }} />
                <p className="text-xs" style={{ color: colors.info }}>
                  {conflictModal.type === 'faculty' 
                    ? 'Try selecting a different faculty member or choose another time slot.'
                    : conflictModal.type === 'room'
                    ? 'Try selecting a different room or choose another time slot.'
                    : conflictModal.type === 'section'
                    ? 'This section already has a class at this time. Please choose a different time slot.'
                    : 'Please review your selection and try again.'}
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div 
              className="px-6 py-4 flex justify-end"
              style={{ 
                backgroundColor: 'rgba(179, 116, 74, 0.03)',
                borderTop: '1px solid rgba(179, 116, 74, 0.1)',
              }}
            >
              <button
                onClick={() => setConflictModal({ ...conflictModal, isOpen: false })}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ 
                  backgroundColor: colors.secondary,
                  boxShadow: '0 2px 4px rgba(149, 90, 39, 0.2)',
                }}
              >
                Got it, I'll adjust
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Faculty Search Modal */}
      {facultySearchModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setFacultySearchModal(false)}
        >
          <div
            className="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-6 py-4 flex items-center justify-between border-b"
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
                  <Search className="w-6 h-6" style={{ color: colors.secondary }} />
                </div>
                <div>
                  <h2
                    className="text-xl font-bold"
                    style={{ color: colors.primary }}
                  >
                    Search Faculty
                  </h2>
                  <p className="text-sm text-gray-600">
                    Search by faculty name to assign to this schedule
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFacultySearchModal(false)}
                className="p-2 rounded-full hover:bg-white/60 transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-6 border-b" style={{ borderColor: `${colors.primary}15` }}>
              <div className="relative">
                <Search 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
                  style={{ color: colors.tertiary }} 
                />
                <input
                  type="text"
                  value={facultySearchQuery}
                  onChange={(e) => setFacultySearchQuery(e.target.value)}
                  placeholder="Enter faculty name..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {loadingResources && (
                <div className="text-center py-12">
                  <Loader2 
                    className="w-8 h-8 animate-spin mx-auto mb-4" 
                    style={{ color: colors.secondary }} 
                  />
                  <p className="text-gray-600">Loading faculty...</p>
                </div>
              )}

              {!loadingResources && filteredFaculty.length === 0 && (
                <div className="text-center py-12">
                  <UserCircle
                    size={48}
                    className="mx-auto mb-4"
                    style={{ color: colors.tertiary, opacity: 0.5 }}
                  />
                  <p className="text-gray-600">No faculty found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Try a different search term
                  </p>
                </div>
              )}

              {!loadingResources && filteredFaculty.length > 0 && (
                <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-100">
                  <table className="w-full">
                    <thead>
                      <tr
                        className="border-b"
                        style={{ borderColor: colors.tertiary + "30" }}
                      >
                        <th
                          className="text-left py-3 px-4 text-sm font-semibold"
                          style={{ color: colors.primary }}
                        >
                          Faculty Name
                        </th>
                        <th
                          className="text-left py-3 px-4 text-sm font-semibold"
                          style={{ color: colors.primary }}
                        >
                          Department
                        </th>
                        <th
                          className="text-left py-3 px-4 text-sm font-semibold"
                          style={{ color: colors.primary }}
                        >
                          Status
                        </th>
                        <th
                          className="text-right py-3 px-4 text-sm font-semibold"
                          style={{ color: colors.primary }}
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFaculty.map((f) => {
                        const isSelected = formData.facultyId === f.id.toString();
                        return (
                          <tr
                            key={f.id}
                            className={`border-b hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-amber-50' : ''}`}
                            style={{ borderColor: colors.tertiary + "20" }}
                            onClick={() => {
                              handleInputChange('facultyId', f.id.toString());
                              setSelectedFacultyDisplay(`${f.first_name} ${f.last_name}`);
                              setFacultySearchModal(false);
                            }}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
                                  style={{ 
                                    backgroundColor: isSelected ? colors.secondary : 'rgba(179, 116, 74, 0.1)',
                                    color: isSelected ? 'white' : colors.secondary,
                                  }}
                                >
                                  {f.first_name.charAt(0)}{f.last_name.charAt(0)}
                                </div>
                                <span
                                  className="font-medium text-sm"
                                  style={{ color: colors.primary }}
                                >
                                  {f.first_name} {f.last_name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-700">
                                {f.department || "N/A"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  f.status === 'active' || f.status === 1
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {f.status === 'active' || f.status === 1 ? 'Active' : f.status || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInputChange('facultyId', f.id.toString());
                                  setSelectedFacultyDisplay(`${f.first_name} ${f.last_name}`);
                                  setFacultySearchModal(false);
                                }}
                                className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-all"
                                style={{ backgroundColor: isSelected ? colors.success : colors.secondary }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = colors.tertiary;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = colors.secondary;
                                  }
                                }}
                              >
                                {isSelected ? 'Selected' : 'Select'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-6 py-4 border-t flex items-center justify-between"
              style={{
                borderColor: `${colors.primary}15`,
                backgroundColor: `${colors.primary}04`,
              }}
            >
              <p className="text-sm text-gray-600">
                {filteredFaculty.length} faculty member{filteredFaculty.length !== 1 ? 's' : ''} found
              </p>
              <button
                onClick={() => setFacultySearchModal(false)}
                className="px-6 py-2.5 rounded-lg font-medium transition-colors"
                style={{
                  color: colors.primary,
                  border: "1px solid #D1D5DB",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.tertiary + "10";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Schedule Modal (full edit: faculty, room, day, time) */}
      {editScheduleModal.isOpen && editScheduleModal.schedule && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setEditScheduleModal({ isOpen: false, schedule: null })}
        >
          <div
            className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-6 py-4 flex items-center justify-between border-b"
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
                  <Calendar className="w-6 h-6" style={{ color: colors.secondary }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: colors.primary }}>
                    Edit Schedule
                  </h2>
                  <p className="text-sm text-gray-600">
                    {(() => {
                      const course = curriculum.find(c => c.id === editScheduleModal.schedule?.curriculumCourseId);
                      return course?.course_code || 'Schedule';
                    })()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditScheduleModal({ isOpen: false, schedule: null })}
                className="p-2 rounded-full hover:bg-white/60 transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && (
                <div
                  className="p-3 rounded-lg text-sm flex items-center gap-2"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#B91C1C',
                  }}
                >
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Faculty */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: colors.primary }}>
                  <UserCircle className="w-3.5 h-3.5" style={{ color: colors.tertiary }} />
                  Faculty <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setEditFacultySearchModal(true)}
                  className="w-full px-3 py-2.5 text-left rounded-lg transition-all flex items-center justify-between"
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid rgba(179, 116, 74, 0.2)',
                    color: selectedEditFacultyDisplay ? colors.primary : colors.neutral,
                  }}
                >
                  <span className="text-sm">
                    {selectedEditFacultyDisplay || 'Select faculty...'}
                  </span>
                  <Search className="w-4 h-4" style={{ color: colors.tertiary }} />
                </button>
              </div>

              {/* Room */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: colors.primary }}>
                  <Building2 className="w-3.5 h-3.5" style={{ color: colors.tertiary }} />
                  Room <span className="text-red-500">*</span>
                </label>
                <select
                  value={editFormData.roomId}
                  onChange={(e) => handleEditInputChange('roomId', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm transition-all"
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid rgba(179, 116, 74, 0.2)',
                    color: colors.primary,
                  }}
                >
                  <option value="">Select room...</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_number} (Cap: {room.capacity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Day */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: colors.primary }}>
                  <CalendarDays className="w-3.5 h-3.5" style={{ color: colors.tertiary }} />
                  Day <span className="text-red-500">*</span>
                </label>
                <select
                  value={editFormData.dayOfWeek}
                  onChange={(e) => handleEditInputChange('dayOfWeek', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm transition-all"
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid rgba(179, 116, 74, 0.2)',
                    color: colors.primary,
                  }}
                >
                  <option value="">Select day...</option>
                  {DAYS.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              {/* Time Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: colors.primary }}>
                    <Clock className="w-3.5 h-3.5" style={{ color: colors.tertiary }} />
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editFormData.startTime}
                    onChange={(e) => handleEditInputChange('startTime', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm transition-all"
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid rgba(179, 116, 74, 0.2)',
                      color: colors.primary,
                    }}
                  >
                    <option value="">Select time...</option>
                    {TIME_SLOTS.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: colors.primary }}>
                    <Clock className="w-3.5 h-3.5" style={{ color: colors.tertiary }} />
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editFormData.endTime}
                    onChange={(e) => handleEditInputChange('endTime', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm transition-all"
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid rgba(179, 116, 74, 0.2)',
                      color: colors.primary,
                    }}
                  >
                    <option value="">Select time...</option>
                    {TIME_SLOTS.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Duration Display */}
              {editFormData.startTime && editFormData.endTime && (
                <div className="text-xs text-right" style={{ color: colors.neutral }}>
                  Duration: {(() => {
                    const [startHour, startMin] = editFormData.startTime.split(':').map(Number);
                    const [endHour, endMin] = editFormData.endTime.split(':').map(Number);
                    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
                    if (duration <= 0) return 'Invalid';
                    const hours = Math.floor(duration / 60);
                    const minutes = duration % 60;
                    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
                  })()}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-6 py-4 border-t flex items-center justify-end gap-3"
              style={{
                borderColor: `${colors.primary}15`,
                backgroundColor: `${colors.primary}04`,
              }}
            >
              <button
                onClick={() => setEditScheduleModal({ isOpen: false, schedule: null })}
                className="px-6 py-2.5 rounded-lg font-medium transition-colors"
                style={{
                  color: colors.primary,
                  border: "1px solid #D1D5DB",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScheduleChanges}
                disabled={loading || !editFormData.facultyId || !editFormData.roomId || !editFormData.dayOfWeek || !editFormData.startTime || !editFormData.endTime}
                className="px-6 py-2.5 rounded-lg font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.secondary }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Faculty Search Modal */}
      {editFacultySearchModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-[60] backdrop-blur-sm"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setEditFacultySearchModal(false)}
        >
          <div
            className="rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: `${colors.primary}15` }}>
              <h3 className="text-lg font-bold" style={{ color: colors.primary }}>Select Faculty</h3>
              <button onClick={() => setEditFacultySearchModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 border-b" style={{ borderColor: `${colors.primary}15` }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: colors.tertiary }} />
                <input
                  type="text"
                  value={editFacultySearchQuery}
                  onChange={(e) => setEditFacultySearchQuery(e.target.value)}
                  placeholder="Search faculty..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: '400px' }}>
              {filteredEditFaculty.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No faculty found</p>
              ) : (
                <div className="space-y-2">
                  {filteredEditFaculty.map((f) => {
                    const isSelected = editFormData.facultyId === f.id.toString();
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          handleEditInputChange('facultyId', f.id.toString());
                          setSelectedEditFacultyDisplay(`${f.first_name} ${f.last_name}`);
                          setEditFacultySearchModal(false);
                        }}
                        className={`w-full p-3 rounded-lg text-left flex items-center gap-3 transition-all ${isSelected ? 'bg-amber-50 border-amber-300' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
                        style={{ border: '1px solid' }}
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                          style={{ 
                            backgroundColor: isSelected ? colors.secondary : 'rgba(179, 116, 74, 0.1)',
                            color: isSelected ? 'white' : colors.secondary,
                          }}
                        >
                          {f.first_name.charAt(0)}{f.last_name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm" style={{ color: colors.primary }}>
                            {f.first_name} {f.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{f.department || 'No department'}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5" style={{ color: colors.success }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
