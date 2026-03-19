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
import { getScheduleResources } from '../../../../utils/scheduleResourceCache';
import { SectionResponse } from '../../../../types/sectionTypes';
import ConfirmationModal from '../../../../components/common/ConfirmationModal';
import SuccessModal from '../../../../components/common/SuccessModal';
import ErrorModal from '../../../../components/common/ErrorModal';
import { WeeklyScheduleCalendar } from '../../../../components/sections/WeeklyScheduleCalendar';
import SectionSchedulePDFViewer from '../../../../components/sections/SectionSchedulePDFViewer';
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
  Search,
  Printer
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00'
];

const parseTimeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const formatMinutesAsHours = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
};

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
  const [includeIrregularStudents, setIncludeIrregularStudents] = useState(false);

  // Lab schedule block (used when selected course has lab hours)
  const [labFormData, setLabFormData] = useState({
    roomId: '',
    dayOfWeek: '',
    startTime: '',
    endTime: ''
  });
  const [breakMinutes, setBreakMinutes] = useState<number>(60);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    scheduleId: number | null;
    siblingIds: number[]; // all schedules for same course (lecture + lab)
    scheduleInfo: string;
    hasMultiple: boolean;
  }>({
    isOpen: false,
    scheduleId: null,
    siblingIds: [],
    scheduleInfo: '',
    hasMultiple: false
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

  // PDF viewer state
  const [showSchedulePDF, setShowSchedulePDF] = useState(false);

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

  // Occupied slots state - shows what rooms/faculty are already scheduled
  const [occupiedSlots, setOccupiedSlots] = useState<any[]>([]);
  const [loadingOccupied, setLoadingOccupied] = useState(false);

  // Lab occupied slots (for lab schedule conflict prevention)
  const [labOccupiedSlots, setLabOccupiedSlots] = useState<any[]>([]);
  const [loadingLabOccupied, setLoadingLabOccupied] = useState(false);

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

  // Edit modal conflict checking state
  const [editOccupiedSlots, setEditOccupiedSlots] = useState<any[]>([]);
  const [loadingEditOccupied, setLoadingEditOccupied] = useState(false);

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

  // Check for conflicts in edit modal (excludes the schedule being edited)
  const editConflicts = useMemo(() => {
    if (!editFormData.dayOfWeek || !editFormData.startTime || !editFormData.endTime || editOccupiedSlots.length === 0) {
      return { faculty: null, room: null, section: null };
    }

    const [startHour, startMin] = editFormData.startTime.split(':').map(Number);
    const [endHour, endMin] = editFormData.endTime.split(':').map(Number);
    const newStartMinutes = startHour * 60 + startMin;
    const newEndMinutes = endHour * 60 + endMin;

    // Helper to check time overlap
    const hasTimeOverlap = (slotStart: number, slotEnd: number) => {
      return (newStartMinutes < slotEnd && newEndMinutes > slotStart);
    };

    let facultyConflict = null;
    let roomConflict = null;
    let sectionConflict = null;

    for (const slot of editOccupiedSlots) {
      if (!hasTimeOverlap(slot.startMinutes, slot.endMinutes)) continue;

      // Check faculty conflict
      if (editFormData.facultyId && slot.facultyId === parseInt(editFormData.facultyId) && !facultyConflict) {
        facultyConflict = slot;
      }

      // Check room conflict
      if (editFormData.roomId && slot.roomId === parseInt(editFormData.roomId) && !roomConflict) {
        roomConflict = slot;
      }

      // Check section conflict (same section, different subject)
      if (section && slot.sectionId === section.id && !sectionConflict) {
        sectionConflict = slot;
      }
    }

    return { faculty: facultyConflict, room: roomConflict, section: sectionConflict };
  }, [editFormData, editOccupiedSlots, section]);

  const editCourse = useMemo(() => {
    if (!editScheduleModal.schedule) return null;
    return curriculum.find(c => c.id === editScheduleModal.schedule?.curriculumCourseId) || null;
  }, [curriculum, editScheduleModal.schedule]);

  const editIsLabOnly = !!(
    editCourse &&
    Number(editCourse.lecture_hour) === 0 &&
    (Number(editCourse.units_lab) > 0 || Number(editCourse.lab_hour) > 0)
  );

  const getEditMaxDurationMinutes = () => {
    if (!editCourse) return null;
    const totalHours = editIsLabOnly
      ? Number(editCourse.lab_hour)
      : Number(editCourse.lecture_hour) + Number(editCourse.lab_hour);

    if (!Number.isFinite(totalHours) || totalHours <= 0) return null;
    return totalHours * 60;
  };

  const getEditRelevantConflictSlots = () => {
    const selectedFacultyId = editFormData.facultyId ? parseInt(editFormData.facultyId) : null;
    const selectedRoomId = editFormData.roomId ? parseInt(editFormData.roomId) : null;

    return editOccupiedSlots.filter(slot => {
      const isSectionSlot = section && slot.sectionId === section.id;
      const isFacultySlot = selectedFacultyId !== null && slot.facultyId === selectedFacultyId;
      const isRoomSlot = selectedRoomId !== null && slot.roomId === selectedRoomId;
      return Boolean(isSectionSlot || isFacultySlot || isRoomSlot);
    });
  };

  const getEditAvailableStartTimes = () => {
    const conflictSlots = getEditRelevantConflictSlots();
    if (conflictSlots.length === 0) return TIME_SLOTS;

    return TIME_SLOTS.filter((time) => {
      const minutes = parseTimeToMinutes(time);
      return !conflictSlots.some((slot) => minutes >= slot.startMinutes && minutes < slot.endMinutes);
    });
  };

  const getEditAvailableEndTimes = (startTimeOverride?: string) => {
    const startTime = startTimeOverride ?? editFormData.startTime;
    if (!startTime) return [];

    const conflictSlots = getEditRelevantConflictSlots();
    const startTotal = parseTimeToMinutes(startTime);
    const maxDurationMinutes = getEditMaxDurationMinutes();

    return TIME_SLOTS.filter((time) => {
      const endTotal = parseTimeToMinutes(time);
      const duration = endTotal - startTotal;

      if (duration <= 0) return false;
      if (maxDurationMinutes !== null && duration > maxDurationMinutes) return false;

      const hasOverlap = conflictSlots.some(
        slot => startTotal < slot.endMinutes && endTotal > slot.startMinutes
      );
      return !hasOverlap;
    });
  };

  const editDurationMinutes = useMemo(() => {
    if (!editFormData.startTime || !editFormData.endTime) return 0;
    return parseTimeToMinutes(editFormData.endTime) - parseTimeToMinutes(editFormData.startTime);
  }, [editFormData.startTime, editFormData.endTime]);

  const isEditDurationInvalid = useMemo(() => {
    if (!editFormData.startTime || !editFormData.endTime) return false;
    if (editDurationMinutes <= 0) return true;
    const maxDuration = getEditMaxDurationMinutes();
    return maxDuration !== null && editDurationMinutes > maxDuration;
  }, [editFormData.startTime, editFormData.endTime, editDurationMinutes, editCourse, editIsLabOnly]);

  const editIsLectureOnly = !!(
    editCourse &&
    Number(editCourse.lecture_hour) > 0 &&
    Number(editCourse.lab_hour || 0) === 0 &&
    Number(editCourse.units_lab || 0) === 0
  );

  const editLectureOnlyWarning = useMemo(() => {
    if (!editIsLectureOnly || editDurationMinutes <= 0 || !editCourse) return null;
    const requiredMinutes = Number(editCourse.lecture_hour) * 60;
    if (editDurationMinutes >= requiredMinutes) return null;
    return { requiredMinutes, actualMinutes: editDurationMinutes };
  }, [editIsLectureOnly, editDurationMinutes, editCourse]);

  useEffect(() => {
    loadScheduleData();
  }, [sectionId]);

  // Fetch occupied slots when day changes (even without room selection)
  useEffect(() => {
    if (formData.dayOfWeek && section) {
      fetchOccupiedSlots(formData.dayOfWeek);
    } else {
      setOccupiedSlots([]);
    }
  }, [formData.dayOfWeek, formData.roomId, section]);

  // Fetch lab occupied slots when lab day changes
  useEffect(() => {
    if (labFormData.dayOfWeek && section) {
      fetchLabOccupiedSlots(labFormData.dayOfWeek);
    } else {
      setLabOccupiedSlots([]);
    }
  }, [labFormData.dayOfWeek, section]);

  // Fetch occupied slots for edit modal when day changes or modal opens (excludes current schedule)
  useEffect(() => {
    if (editScheduleModal.isOpen && editFormData.dayOfWeek && section && editScheduleModal.schedule) {
      fetchEditOccupiedSlots(editFormData.dayOfWeek, editScheduleModal.schedule.id);
    } else if (!editScheduleModal.isOpen) {
      setEditOccupiedSlots([]);
    }
  }, [editFormData.dayOfWeek, section, editScheduleModal.isOpen, editScheduleModal.schedule]);

  // Fetch all occupied slots for edit modal (excludes the schedule being edited)
  const fetchEditOccupiedSlots = async (day: string, excludeScheduleId: number) => {
    if (!section) return;
    
    setLoadingEditOccupied(true);
    try {
      const response = await fetch(
        `/api/class-schedule/conflicts?dayOfWeek=${day}&academicYear=${section.academicYear}&semester=${section.semester}&currentSectionId=${section.id}&excludeScheduleId=${excludeScheduleId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setEditOccupiedSlots(data.data?.occupiedSlots || []);
      }
    } catch (err) {
      console.error('Failed to fetch edit occupied slots:', err);
    } finally {
      setLoadingEditOccupied(false);
    }
  };

  // Fetch all occupied slots for a given day (from ALL sections including current))
  const fetchOccupiedSlots = async (day: string) => {
    if (!section) return;
    
    setLoadingOccupied(true);
    try {
      const url = `/api/class-schedule/conflicts?dayOfWeek=${day}&academicYear=${section.academicYear}&semester=${section.semester}&currentSectionId=${section.id}`;
      console.log('Fetching occupied slots:', url);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Occupied slots response:', data);
        setOccupiedSlots(data.data?.occupiedSlots || []);
      } else {
        console.error('Failed to fetch occupied slots:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Failed to fetch occupied slots:', err);
    } finally {
      setLoadingOccupied(false);
    }
  };

  // Fetch occupied slots for the lab day (for lab conflict prevention)
  const fetchLabOccupiedSlots = async (day: string) => {
    if (!section) return;
    setLoadingLabOccupied(true);
    try {
      const url = `/api/class-schedule/conflicts?dayOfWeek=${day}&academicYear=${section.academicYear}&semester=${section.semester}&currentSectionId=${section.id}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setLabOccupiedSlots(data.data?.occupiedSlots || []);
      }
    } catch (err) {
      console.error('Failed to fetch lab occupied slots:', err);
    } finally {
      setLoadingLabOccupied(false);
    }
  };

  const loadScheduleData = async () => {
    try {
      setError(null);
      setLoadingResources(true);
      const resourcesPromise = getScheduleResources();

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

      // Step 3: Resolve cached resources. This starts at the top of the load so it overlaps other requests.
      const resources = await resourcesPromise;
      setFaculty(resources.faculty);
      setRooms(resources.rooms);

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
    setIncludeIrregularStudents(false);
    setError(null);
  };

  const handleInputChange = (name: string, value: string) => {
    // When lecture day changes, auto-populate the lab day too
    if (name === 'dayOfWeek') {
      setLabFormData(prev => ({ ...prev, dayOfWeek: value, startTime: '', endTime: '' }));
    }

    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: value
      };
      
      // If day changes, reset times to avoid invalid selections
      if (name === 'dayOfWeek') {
        newData.startTime = '';
        newData.endTime = '';
      }
      
      // If start time changes, auto-calculate end time from curriculum (lab_hour for lab-only, lecture_hour otherwise)
      if (name === 'startTime' && value) {
        const lectureHours = selectedCourse
          ? (isLabOnly ? Number(selectedCourse.lab_hour) : Number(selectedCourse.lecture_hour))
          : 0;
        if (lectureHours > 0) {
          const [h, m] = value.split(':').map(Number);
          const totalMin = h * 60 + m + lectureHours * 60;
          const endH = Math.floor(totalMin / 60);
          const endM = totalMin % 60;
          if (endH < 24) {
            newData.endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
          } else {
            newData.endTime = '';
          }
        } else {
          newData.endTime = '';
        }
      }
      
      return newData;
    });
  };

  const handleLabInputChange = (name: string, value: string) => {
    setLabFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'dayOfWeek') { next.startTime = ''; next.endTime = ''; }
      // If lab start changes, auto-calculate lab end time from curriculum lab_hour
      if (name === 'startTime' && value) {
        const labHours = selectedCourse ? Number(selectedCourse.lab_hour) : 0;
        if (labHours > 0) {
          const [h, m] = value.split(':').map(Number);
          const totalMin = h * 60 + m + labHours * 60;
          const endH = Math.floor(totalMin / 60);
          const endM = totalMin % 60;
          if (endH < 24) {
            next.endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
          } else {
            next.endTime = '';
          }
        } else {
          next.endTime = '';
        }
      }
      return next;
    });
  };

  // Auto-fill lab start time whenever lecture end or break duration changes
  const getAutoLabStartTime = (): string => {
    if (!formData.endTime) return '';
    const [h, m] = formData.endTime.split(':').map(Number);
    const total = h * 60 + m + breakMinutes;
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    if (hh >= 24) return '';
    return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
  };

  /** True when the selected course is lab-only (lecture_hour === 0, has lab hours) — e.g. PE/PATHFIT */
  const isLabOnly = !!(
    selectedCourse &&
    Number(selectedCourse.lecture_hour) === 0 &&
    (Number(selectedCourse.units_lab) > 0 || Number(selectedCourse.lab_hour) > 0)
  );

  /** True when the selected course has BOTH lecture and lab hours (needs separate lab block) */
  const hasLab = !!(
    selectedCourse &&
    !isLabOnly &&
    (Number(selectedCourse.units_lab) > 0 || Number(selectedCourse.lab_hour) > 0)
  );

  const isLectureOnly = !!(
    selectedCourse &&
    Number(selectedCourse.lecture_hour) > 0 &&
    Number(selectedCourse.lab_hour || 0) === 0 &&
    Number(selectedCourse.units_lab || 0) === 0
  );

  const addDurationMinutes = useMemo(() => {
    if (!formData.startTime || !formData.endTime) return 0;
    return parseTimeToMinutes(formData.endTime) - parseTimeToMinutes(formData.startTime);
  }, [formData.startTime, formData.endTime]);

  const addLectureOnlyWarning = useMemo(() => {
    if (!isLectureOnly || addDurationMinutes <= 0 || !selectedCourse) return null;
    const requiredMinutes = Number(selectedCourse.lecture_hour) * 60;
    if (addDurationMinutes >= requiredMinutes) return null;
    return { requiredMinutes, actualMinutes: addDurationMinutes };
  }, [isLectureOnly, addDurationMinutes, selectedCourse]);

  // Get section's occupied time slots for the selected day
  const getSectionOccupiedSlots = () => {
    if (!section || !formData.dayOfWeek || occupiedSlots.length === 0) return [];
    
    const sectionSlots = occupiedSlots.filter(slot => 
      slot.isCurrentSection && slot.sectionId === section.id
    );
    
    // Debug logging
    console.log('getSectionOccupiedSlots:', {
      sectionId: section.id,
      dayOfWeek: formData.dayOfWeek,
      totalOccupiedSlots: occupiedSlots.length,
      sectionSlots: sectionSlots.length,
      occupiedSlots: occupiedSlots.map(s => ({
        id: s.id,
        sectionId: s.sectionId,
        isCurrentSection: s.isCurrentSection,
        time: `${s.startTime}-${s.endTime}`
      }))
    });
    
    return sectionSlots;
  };

  // Check if a time falls within or overlaps with any occupied slot
  const isTimeInOccupiedRange = (timeMinutes: number, sectionSlots: any[]): boolean => {
    return sectionSlots.some(slot => {
      // Time is occupied if it falls within an existing schedule (inclusive of start, exclusive of end)
      return timeMinutes >= slot.startMinutes && timeMinutes < slot.endMinutes;
    });
  };

  // Get available start times (excluding times that fall within occupied slots)
  const getAvailableStartTimes = () => {
    const sectionSlots = getSectionOccupiedSlots();
    if (sectionSlots.length === 0) return TIME_SLOTS;

    return TIME_SLOTS.filter(time => {
      const [hour, min] = time.split(':').map(Number);
      const timeMinutes = hour * 60 + min;
      
      // Exclude if this time falls within any occupied slot
      return !isTimeInOccupiedRange(timeMinutes, sectionSlots);
    });
  };

  // Get available end times (capped by lecture_hour from curriculum, no overlap with occupied slots)
  const getAvailableEndTimes = () => {
    if (!formData.startTime) return [];

    const sectionSlots = getSectionOccupiedSlots();
    const [startHour, startMin] = formData.startTime.split(':').map(Number);
    const startTotal = startHour * 60 + startMin;

    // Derive max duration: lab-only uses lab_hour; combined subjects use total (lec + lab) hours
    const totalHours = selectedCourse
      ? (isLabOnly
          ? Number(selectedCourse.lab_hour)
          : Number(selectedCourse.lecture_hour) + Number(selectedCourse.lab_hour))
      : 0;
    const maxDurationMinutes = totalHours > 0 ? totalHours * 60 : null;

    return TIME_SLOTS.filter(time => {
      const [endHour, endMin] = time.split(':').map(Number);
      const endTotal = endHour * 60 + endMin;
      const duration = endTotal - startTotal;

      // Must be after start time
      if (duration <= 0) return false;

      // Must not exceed the curriculum lecture hours (if defined)
      if (maxDurationMinutes !== null && duration > maxDurationMinutes) return false;

      // If no occupied slots, all valid times in range are good
      if (sectionSlots.length === 0) return true;

      // Check if the proposed time range overlaps with any occupied slot
      const hasOverlap = sectionSlots.some(slot =>
        startTotal < slot.endMinutes && endTotal > slot.startMinutes
      );
      return !hasOverlap;
    });
  };

  // Get section's occupied slots for the lab day
  const getLabSectionOccupiedSlots = () => {
    if (!section || !labFormData.dayOfWeek || labOccupiedSlots.length === 0) return [];
    return labOccupiedSlots.filter(slot => slot.isCurrentSection && slot.sectionId === section.id);
  };

  // Get available lab start times (all times, excluding occupied slots; suggested time is labelled in the UI)
  const getLabAvailableStartTimes = () => {
    const sectionSlots = getLabSectionOccupiedSlots();

    return TIME_SLOTS.filter(time => {
      const [hour, min] = time.split(':').map(Number);
      const timeMinutes = hour * 60 + min;
      // Exclude if this time falls within any occupied slot
      return !isTimeInOccupiedRange(timeMinutes, sectionSlots);
    });
  };

  // Get available lab end times (capped by lab_hour from curriculum, no overlap with occupied slots)
  const getLabAvailableEndTimes = () => {
    if (!labFormData.startTime) return [];
    const sectionSlots = getLabSectionOccupiedSlots();
    const [startHour, startMin] = labFormData.startTime.split(':').map(Number);
    const startTotal = startHour * 60 + startMin;

    // Derive max duration for lab: total hours minus however long the lecture was set
    const totalHours = selectedCourse
      ? Number(selectedCourse.lecture_hour) + Number(selectedCourse.lab_hour)
      : 0;
    let lectureDurationMinutes = 0;
    if (formData.startTime && formData.endTime) {
      const [lsh, lsm] = formData.startTime.split(':').map(Number);
      const [leh, lem] = formData.endTime.split(':').map(Number);
      lectureDurationMinutes = (leh * 60 + lem) - (lsh * 60 + lsm);
    }
    const remainingMinutes = totalHours > 0 ? totalHours * 60 - lectureDurationMinutes : null;
    const maxDurationMinutes = remainingMinutes !== null && remainingMinutes > 0 ? remainingMinutes : null;

    return TIME_SLOTS.filter(time => {
      const [endHour, endMin] = time.split(':').map(Number);
      const endTotal = endHour * 60 + endMin;
      const duration = endTotal - startTotal;

      if (duration <= 0) return false;

      // Must not exceed the curriculum lab hours (if defined)
      if (maxDurationMinutes !== null && duration > maxDurationMinutes) return false;

      if (sectionSlots.length === 0) return true;
      const hasOverlap = sectionSlots.some(slot =>
        startTotal < slot.endMinutes && endTotal > slot.startMinutes
      );
      return !hasOverlap;
    });
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
      // Faculty is optional - other fields are required
      if (
        !formData.roomId ||
        !formData.dayOfWeek ||
        !formData.startTime ||
        !formData.endTime
      ) {
        setError('Room, Day, Start Time, and End Time are required');
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
        facultyId: formData.facultyId ? parseInt(formData.facultyId) : null, // Optional faculty
        roomId: parseInt(formData.roomId),
        dayOfWeek: formData.dayOfWeek,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        academicYear: section!.academicYear,
        semester: section!.semester,
        // Lab-only subjects (lecture_hour=0) are treated as a single lab block
        isLabSchedule: isLabOnly,
        includeIrregularStudents,
      } as any);

      // If course has BOTH lecture and lab, also create the separate lab time-block schedule
      if (hasLab) {
        if (!labFormData.roomId || !labFormData.dayOfWeek || !labFormData.startTime || !labFormData.endTime) {
          setError('Lab Room, Day, Start Time and End Time are required for lab subjects');
          setLoading(false);
          return;
        }
        const [lsh, lsm] = labFormData.startTime.split(':').map(Number);
        const [leh, lem] = labFormData.endTime.split(':').map(Number);
        if (leh * 60 + lem <= lsh * 60 + lsm) {
          setError('Lab end time must be after lab start time');
          setLoading(false);
          return;
        }
        const labStart = new Date();
        labStart.setHours(lsh, lsm, 0);
        const labEnd = new Date();
        labEnd.setHours(leh, lem, 0);
        await createClassSchedule({
          sectionId: section!.id,
          curriculumCourseId: selectedCourse.id,
          facultyId: formData.facultyId ? parseInt(formData.facultyId) : null,
          roomId: parseInt(labFormData.roomId),
          dayOfWeek: labFormData.dayOfWeek,
          startTime: labStart.toISOString(),
          endTime: labEnd.toISOString(),
          academicYear: section!.academicYear,
          semester: section!.semester,
          isLabSchedule: true,
          includeIrregularStudents,
        } as any);
      }

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
      setIncludeIrregularStudents(false);
      setLabFormData({ roomId: '', dayOfWeek: '', startTime: '', endTime: '' });
      setBreakMinutes(60);
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
          title: 'Room Already Occupied',
          message: `Room ${selectedRoom?.room_number || ''} is already occupied during this time slot.`,
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

    // Find ALL schedules for the same subject (lecture + lab siblings)
    const siblings = schedules.filter(
      s => s.curriculumCourseId === schedule.curriculumCourseId
    );
    const siblingIds = siblings.map(s => s.id);
    const hasMultiple = siblings.length > 1;

    const baseInfo = `${course?.course_code || 'Course'} - ${facultyMember ? `${facultyMember.first_name} ${facultyMember.last_name}` : 'No Faculty'} - ${room?.room_number || 'Room'}`;
    const info = hasMultiple
      ? `${course?.course_code || 'Course'} (${siblings.length} schedules: lecture + lab)`
      : baseInfo;

    setDeleteConfirm({
      isOpen: true,
      scheduleId: schedule.id,
      siblingIds,
      scheduleInfo: info,
      hasMultiple
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
    
    // Clear any previous error
    setError(null);
    
    // Clear previous occupied slots to force re-fetch
    setEditOccupiedSlots([]);
    
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
    setEditFormData(prev => {
      const next = {
        ...prev,
        [name]: value
      };

      if (name === 'dayOfWeek') {
        next.startTime = '';
        next.endTime = '';
      }

      if (name === 'startTime') {
        next.endTime = '';
        const maxDuration = getEditMaxDurationMinutes();
        if (value && maxDuration && maxDuration > 0) {
          const proposedEnd = parseTimeToMinutes(value) + maxDuration;
          if (proposedEnd < 24 * 60) {
            const hh = Math.floor(proposedEnd / 60).toString().padStart(2, '0');
            const mm = (proposedEnd % 60).toString().padStart(2, '0');
            const proposedTime = `${hh}:${mm}`;
            if (getEditAvailableEndTimes(value).includes(proposedTime)) {
              next.endTime = proposedTime;
            }
          }
        }
      }

      return next;
    });
  };

  // Handle saving schedule changes
  const handleSaveScheduleChanges = async () => {
    if (!editScheduleModal.schedule) return;

    try {
      setLoading(true);
      setError(null);

      const currentSchedule = editScheduleModal.schedule;

      // Build update data - convert times to ISO
      const updateData: any = {};
      
      if (editFormData.facultyId && editFormData.facultyId !== currentSchedule.facultyId?.toString()) {
        updateData.facultyId = parseInt(editFormData.facultyId);
      }
      if (editFormData.roomId && editFormData.roomId !== currentSchedule.roomId?.toString()) {
        updateData.roomId = parseInt(editFormData.roomId);
      }
      if (editFormData.dayOfWeek && editFormData.dayOfWeek !== currentSchedule.dayOfWeek) {
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

      // Find sibling schedule (lecture ↔ lab partner for same subject)
      const siblings = schedules.filter(
        s => s.curriculumCourseId === currentSchedule.curriculumCourseId && s.id !== currentSchedule.id
      );

      // Save the main schedule
      await updateClassSchedule(currentSchedule.id, updateData);

      // If faculty changed, sync it to all sibling schedules (lecture ↔ lab)
      if (updateData.facultyId !== undefined && siblings.length > 0) {
        await Promise.all(
          siblings.map(sibling =>
            updateClassSchedule(sibling.id, { facultyId: updateData.facultyId })
          )
        );
      }

      // Reload schedules
      const updatedSchedules = await getClassSchedules({
        sectionId: section!.id,
        academicYear: section!.academicYear,
        semester: section!.semester
      });
      setSchedules(updatedSchedules);

      setSuccessModal({
        isOpen: true,
        message: siblings.length > 0 && updateData.facultyId !== undefined
          ? 'Schedule updated. Faculty has been synced to all lecture/lab schedules for this subject.'
          : 'Schedule updated successfully.'
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

      // Delete all siblings (lecture + lab) in parallel
      const idsToDelete = deleteConfirm.siblingIds.length > 0
        ? deleteConfirm.siblingIds
        : [deleteConfirm.scheduleId];

      await Promise.all(idsToDelete.map(id => deleteClassSchedule(id)));
      
      const updatedSchedules = await getClassSchedules({
        sectionId: section!.id,
        academicYear: section!.academicYear,
        semester: section!.semester
      });
      setSchedules(updatedSchedules);
      
      setSuccessModal({
        isOpen: true,
        message: deleteConfirm.hasMultiple
          ? 'All schedules (lecture + lab) for this subject have been deleted successfully.'
          : 'Schedule has been deleted successfully.'
      });
      
      setDeleteConfirm({
        isOpen: false,
        scheduleId: null,
        siblingIds: [],
        scheduleInfo: '',
        hasMultiple: false
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
              {/* Print schedule button */}
              <button
                onClick={() => setShowSchedulePDF(true)}
                disabled={schedules.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.secondary, color: 'white' }}
                title={schedules.length === 0 ? 'No schedules to print yet' : 'Print class schedule'}
              >
                <Printer className="w-4 h-4" />
                Print Schedule
              </button>
              <div 
                className="text-right px-4 py-2 rounded-lg"
                style={{ 
                  backgroundColor: 'rgba(149, 90, 39, 0.06)',
                  border: '1px solid rgba(149, 90, 39, 0.1)',
                }}
              >
                <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: colors.tertiary }}>Completion</div>
                <div className="text-2xl font-bold" style={{ color: colors.secondary }}>
                  {curriculum.length > 0
                    ? Math.round((new Set(schedules.map(s => s.curriculumCourseId)).size / curriculum.length) * 100)
                    : 0}%
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
                              {Number(course.lecture_hour) === 0 && (Number(course.units_lab) > 0 || Number(course.lab_hour) > 0)
                                ? `${course.units_total} units`
                                : Number(course.units_lec) > 0 && Number(course.units_lab) > 0
                                ? `${course.units_lec} lec / ${course.units_lab} lab`
                                : Number(course.units_lec) > 0
                                ? `${course.units_lec} lec`
                                : `${course.units_total} units`}
                            </div>
                            {Number(course.lecture_hour) === 0 && (Number(course.units_lab) > 0 || Number(course.lab_hour) > 0) && (
                              <div
                                className="mt-1 text-[9px] px-1.5 py-0.5 rounded-full inline-block font-medium"
                                style={{ backgroundColor: 'rgba(14,165,233,0.12)', color: '#0EA5E9', border: '1px solid rgba(14,165,233,0.25)' }}
                              >
                                Lab Only
                              </div>
                            )}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <CalendarDays className="w-5 h-5" style={{ color: colors.secondary }} />
                    <h2 className="text-base font-semibold" style={{ color: colors.primary }}>
                      Schedule for {selectedCourse.course_code}
                    </h2>
                    {isLabOnly && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: 'rgba(14, 165, 233, 0.12)',
                          color: '#0EA5E9',
                          border: '1px solid rgba(14, 165, 233, 0.3)',
                        }}
                      >
                        Lab Only · {selectedCourse.lab_hour}h
                      </span>
                    )}
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

                  {addLectureOnlyWarning && (
                    <div
                      className="rounded-lg p-3 text-sm flex items-start gap-2"
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        color: '#B45309',
                      }}
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        Lecture-hour warning: this subject requires <strong>{formatMinutesAsHours(addLectureOnlyWarning.requiredMinutes)} hours</strong>,
                        but selected time is only <strong>{formatMinutesAsHours(addLectureOnlyWarning.actualMinutes)} hours</strong>.
                      </span>
                    </div>
                  )}

                  <label
                    className="flex items-center gap-2 text-sm cursor-pointer select-none"
                    style={{ color: colors.primary }}
                  >
                    <input
                      type="checkbox"
                      checked={includeIrregularStudents}
                      onChange={(e) => setIncludeIrregularStudents(e.target.checked)}
                      className="rounded"
                    />
                    <span>Also apply to irregular students (explicit manual action)</span>
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: colors.primary }}>
                        <UserCircle className="w-4 h-4" style={{ color: colors.tertiary }} />
                        Faculty <span className="text-xs font-normal" style={{ color: colors.neutral }}>(Optional)</span>
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
                            : selectedFacultyDisplay || 'No faculty assigned'}
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

                  {isLabOnly && (
                    <div
                      className="rounded-lg p-3 flex items-start gap-2 text-xs"
                      style={{
                        backgroundColor: 'rgba(14, 165, 233, 0.06)',
                        border: '1px solid rgba(14, 165, 233, 0.2)',
                        color: '#0EA5E9',
                      }}
                    >
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>{selectedCourse.course_code}</strong> has no lecture hours — this is a <strong>lab-only</strong> subject.
                        Set the single lab schedule below (max {selectedCourse.lab_hour}h).
                      </span>
                    </div>
                  )}

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
                        disabled={!formData.dayOfWeek}
                        className="w-full px-3 py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          outline: 'none',
                          color: colors.primary,
                          backgroundColor: 'white',
                          border: '1px solid rgba(179, 116, 74, 0.2)',
                        }}
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
                        <option value="">Start time</option>
                        {getAvailableStartTimes().map((time) => (
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
                        {getAvailableEndTimes().map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
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
                          {isLabOnly
                            ? selectedCourse?.lab_hour > 0 && (
                                <span className="ml-2" style={{ color: '#0EA5E9' }}>
                                  (max {selectedCourse.lab_hour}h lab)
                                </span>
                              )
                            : (Number(selectedCourse?.lecture_hour) + Number(selectedCourse?.lab_hour)) > 0 && (
                                <span className="ml-2" style={{ color: colors.tertiary }}>
                                  (max {Number(selectedCourse?.lecture_hour) + Number(selectedCourse?.lab_hour)}h total)
                                </span>
                              )
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lab Schedule Block */}
                  {hasLab && (
                    <div
                      className="rounded-xl p-5 space-y-4"
                      style={{
                        backgroundColor: '#FDFCFA',
                        border: '1px solid rgba(179, 116, 74, 0.12)',
                        boxShadow: '0 2px 6px rgba(58, 35, 19, 0.06)',
                      }}
                    >
                      {/* Lab Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-5 h-5" style={{ color: colors.secondary }} />
                          <h2 className="text-base font-semibold" style={{ color: colors.primary }}>
                            Lab Schedule
                          </h2>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: `${colors.secondary}15`,
                              color: colors.secondary,
                              border: `1px solid ${colors.secondary}30`,
                            }}
                          >
                            {selectedCourse.units_lab} lab unit{selectedCourse.units_lab !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {/* Break selector */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium whitespace-nowrap" style={{ color: colors.neutral }}>
                            Break after lecture:
                          </span>
                          <div className="flex items-center gap-1">
                            {[30, 60, 90, 120].map(mins => (
                              <button
                                key={mins}
                                type="button"
                                onClick={() => setBreakMinutes(mins)}
                                className="px-2 py-1 rounded text-[10px] font-medium transition-all"
                                style={{
                                  backgroundColor: breakMinutes === mins ? `${colors.secondary}18` : 'white',
                                  border: `1px solid ${breakMinutes === mins ? colors.secondary : 'rgba(179,116,74,0.2)'}`,
                                  color: breakMinutes === mins ? colors.secondary : colors.neutral,
                                }}
                              >
                                {mins}m
                              </button>
                            ))}
                            <input
                              type="number"
                              min={0}
                              max={240}
                              value={breakMinutes}
                              onChange={e => setBreakMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-14 px-2 py-1 rounded text-[10px] text-center"
                              style={{ border: '1px solid rgba(179,116,74,0.2)', color: colors.primary, backgroundColor: 'white' }}
                            />
                            <span className="text-[10px]" style={{ color: colors.neutral }}>min</span>
                          </div>
                        </div>
                      </div>

                      {/* Lab Room + Day */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: colors.primary }}>
                            <Building2 className="w-4 h-4" style={{ color: colors.tertiary }} />
                            Lab Room <span style={{ color: colors.danger }}>*</span>
                          </label>
                          <select
                            value={labFormData.roomId}
                            onChange={e => handleLabInputChange('roomId', e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg text-sm transition-all"
                            style={{ outline: 'none', color: colors.primary, backgroundColor: 'white', border: '1px solid rgba(179, 116, 74, 0.2)' }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = colors.secondary;
                              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(149, 90, 39, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(179, 116, 74, 0.2)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <option value="">Select lab room</option>
                            {rooms.map(room => (
                              <option key={room.id} value={room.id.toString()}>
                                {room.room_number} (Cap: {room.capacity})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: colors.primary }}>
                            <Calendar className="w-4 h-4" style={{ color: colors.tertiary }} />
                            Lab Day <span style={{ color: colors.danger }}>*</span>
                          </label>
                          <select
                            value={labFormData.dayOfWeek}
                            onChange={e => handleLabInputChange('dayOfWeek', e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg text-sm transition-all"
                            style={{ outline: 'none', color: colors.primary, backgroundColor: 'white', border: '1px solid rgba(179, 116, 74, 0.2)' }}
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
                            {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Lab Start + End */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: colors.primary }}>
                            <Clock className="w-4 h-4" style={{ color: colors.tertiary }} />
                            Lab Start Time <span style={{ color: colors.danger }}>*</span>
                          </label>
                          <select
                            value={labFormData.startTime}
                            onChange={e => handleLabInputChange('startTime', e.target.value)}
                            disabled={!labFormData.dayOfWeek}
                            className="w-full px-3 py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ outline: 'none', color: colors.primary, backgroundColor: 'white', border: '1px solid rgba(179, 116, 74, 0.2)' }}
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
                            <option value="">Start time</option>
                            {getLabAvailableStartTimes().map(t => {
                              const suggestedTime = getAutoLabStartTime();
                              const isSuggested = suggestedTime && t === suggestedTime;
                              return (
                                <option key={t} value={t}>
                                  {isSuggested ? `⭐ ${t} (Suggested)` : t}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: colors.primary }}>
                            <Clock className="w-4 h-4" style={{ color: colors.tertiary }} />
                            Lab End Time <span style={{ color: colors.danger }}>*</span>
                          </label>
                          <select
                            value={labFormData.endTime}
                            onChange={e => handleLabInputChange('endTime', e.target.value)}
                            disabled={!labFormData.startTime}
                            className="w-full px-3 py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ outline: 'none', color: colors.primary, backgroundColor: 'white', border: '1px solid rgba(179, 116, 74, 0.2)' }}
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
                            {getLabAvailableEndTimes().map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          {labFormData.startTime && labFormData.endTime && (
                            <p className="text-xs mt-1" style={{ color: colors.neutral }}>
                              Duration: {(() => {
                                const [sh, sm] = labFormData.startTime.split(':').map(Number);
                                const [eh, em] = labFormData.endTime.split(':').map(Number);
                                const d = (eh * 60 + em) - (sh * 60 + sm);
                                return `${Math.floor(d/60)}h${d % 60 > 0 ? ` ${d % 60}m` : ''}`;
                              })()}
                              {selectedCourse && (Number(selectedCourse.lecture_hour) + Number(selectedCourse.lab_hour)) > 0 && (() => {
                                const totalMin = (Number(selectedCourse.lecture_hour) + Number(selectedCourse.lab_hour)) * 60;
                                let lecMin = 0;
                                if (formData.startTime && formData.endTime) {
                                  const [lsh, lsm] = formData.startTime.split(':').map(Number);
                                  const [leh, lem] = formData.endTime.split(':').map(Number);
                                  lecMin = (leh * 60 + lem) - (lsh * 60 + lsm);
                                }
                                const remMin = totalMin - lecMin;
                                const remH = Math.floor(remMin / 60);
                                const remM = remMin % 60;
                                return (
                                  <span className="ml-2" style={{ color: colors.tertiary }}>
                                    (max {remH}h{remM > 0 ? ` ${remM}m` : ''} remaining)
                                  </span>
                                );
                              })()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Occupied Slots Display - Shows section's existing schedules on selected day */}
                  {formData.dayOfWeek && section && (
                    <div
                      className="rounded-lg p-4"
                      style={{
                        backgroundColor: 'rgba(179, 116, 74, 0.04)',
                        border: '1px solid rgba(179, 116, 74, 0.15)',
                      }}
                    >
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-4 h-4" style={{ color: colors.warning }} />
                          <h3 className="text-xs font-semibold" style={{ color: colors.primary }}>
                            Section Schedule on {formData.dayOfWeek}
                          </h3>
                        </div>
                        <p className="text-[10px] ml-6" style={{ color: colors.neutral }}>
                          Existing schedules for this section on this day
                        </p>
                      </div>
                      
                      {loadingOccupied ? (
                        <div className="flex items-center gap-2 text-xs" style={{ color: colors.neutral }}>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Loading schedule...
                        </div>
                      ) : (() => {
                        const sectionSlots = getSectionOccupiedSlots();
                        
                        return sectionSlots.length === 0 ? (
                          <p className="text-xs" style={{ color: colors.success }}>
                            ✓ No existing schedules on {formData.dayOfWeek}. All times available.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {sectionSlots.map((slot, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 rounded text-xs"
                                style={{
                                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                  border: '1px solid rgba(239, 68, 68, 0.2)',
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-medium" style={{ color: colors.danger }}>
                                    {slot.startTime} - {slot.endTime}
                                  </span>
                                  <span style={{ color: colors.primary }}>
                                    <Building2 className="w-3 h-3 inline mr-1" />
                                    {slot.roomNumber}
                                  </span>
                                  <span style={{ color: colors.neutral }}>
                                    <UserCircle className="w-3 h-3 inline mr-1" />
                                    {slot.facultyName}
                                  </span>
                                </div>
                                <span 
                                  className="px-2 py-0.5 rounded text-[10px] font-medium"
                                  style={{ 
                                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                    color: colors.danger 
                                  }}
                                >
                                  (Occupied)
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

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
          siblingIds: [],
          scheduleInfo: '',
          hasMultiple: false
        })}
        onConfirm={confirmDelete}
        title={deleteConfirm.hasMultiple ? 'Delete Lecture + Lab Schedules' : 'Delete Schedule'}
        message={
          deleteConfirm.hasMultiple
            ? `This subject has both a lecture and a lab schedule. Deleting one will delete all ${deleteConfirm.siblingIds.length} schedules for this subject.`
            : `Are you sure you want to delete this schedule?`
        }
        description={deleteConfirm.scheduleInfo}
        confirmText="Delete All"
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
                                {f.departmentName || "N/A"}
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

              {/* Loading indicator for conflict checking */}
              {loadingEditOccupied && (
                <div
                  className="p-3 rounded-lg text-sm flex items-center gap-2"
                  style={{
                    backgroundColor: 'rgba(179, 116, 74, 0.08)',
                    border: '1px solid rgba(179, 116, 74, 0.2)',
                    color: colors.tertiary,
                  }}
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking for schedule conflicts...
                </div>
              )}

              {/* Real-time Conflict Warnings */}
              {editConflicts.faculty && (
                <div
                  className="p-3 rounded-lg text-sm flex items-center gap-2"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    color: '#B45309',
                  }}
                >
                  <AlertCircle className="w-4 h-4" />
                  <div>
                    <span className="font-medium">Faculty has schedule conflict on this day and time</span>
                    <span className="text-xs block mt-0.5">
                      {editConflicts.faculty.startTime} - {editConflicts.faculty.endTime} • {editConflicts.faculty.sectionName} • Room {editConflicts.faculty.roomNumber}
                    </span>
                  </div>
                </div>
              )}

              {editConflicts.room && (
                <div
                  className="p-3 rounded-lg text-sm flex items-center gap-2"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#B91C1C',
                  }}
                >
                  <AlertCircle className="w-4 h-4" />
                  <div>
                    <span className="font-medium">Room is already occupied on this day and time</span>
                    <span className="text-xs block mt-0.5">
                      {editConflicts.room.startTime} - {editConflicts.room.endTime} • {editConflicts.room.sectionName} • {editConflicts.room.facultyName}
                    </span>
                  </div>
                </div>
              )}

              {editConflicts.section && (
                <div
                  className="p-3 rounded-lg text-sm flex items-center gap-2"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    color: '#1D4ED8',
                  }}
                >
                  <AlertCircle className="w-4 h-4" />
                  <div>
                    <span className="font-medium">Section has another class scheduled at this time</span>
                    <span className="text-xs block mt-0.5">
                      {editConflicts.section.startTime} - {editConflicts.section.endTime} • Room {editConflicts.section.roomNumber} • {editConflicts.section.facultyName}
                    </span>
                  </div>
                </div>
              )}

              {editLectureOnlyWarning && (
                <div
                  className="p-3 rounded-lg text-sm flex items-center gap-2"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    color: '#B45309',
                  }}
                >
                  <AlertCircle className="w-4 h-4" />
                  <div>
                    <span className="font-medium">Lecture-hour warning</span>
                    <span className="text-xs block mt-0.5">
                      Required: {formatMinutesAsHours(editLectureOnlyWarning.requiredMinutes)} hours • Selected: {formatMinutesAsHours(editLectureOnlyWarning.actualMinutes)} hours
                    </span>
                  </div>
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
                    {getEditAvailableStartTimes().map((time) => (
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
                    {getEditAvailableEndTimes().map((time) => (
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
                    const maxDuration = getEditMaxDurationMinutes();
                    if (maxDuration !== null && duration > maxDuration) return 'Exceeds curriculum hours';
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
                disabled={loading || loadingEditOccupied || !editFormData.facultyId || !editFormData.roomId || !editFormData.dayOfWeek || !editFormData.startTime || !editFormData.endTime || editConflicts.faculty || editConflicts.room || editConflicts.section || isEditDurationInvalid}
                className="px-6 py-2.5 rounded-lg font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.secondary }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = colors.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = colors.secondary;
                  }
                }}
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

      {/* Section Schedule PDF Viewer */}
      {showSchedulePDF && section && (
        <SectionSchedulePDFViewer
          section={section}
          schedules={schedules}
          curriculum={curriculum}
          onClose={() => setShowSchedulePDF(false)}
        />
      )}
    </div>
  );
}
