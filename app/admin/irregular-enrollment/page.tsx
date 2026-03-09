'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../../components/Navigation';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import SuccessModal from '../../components/common/SuccessModal';
import RegistrationPDFViewer from '../../components/enrollment/RegistrationPDFViewer';
import { useProgramsWithMajors } from '../../hooks/useProgramsWithMajors';
import { colors } from '../../colors';
import {
  ArrowLeft, Search, AlertCircle, Loader2, BookOpen,
  User, GraduationCap, Trash2, Plus, Calendar, X, Users,
  CheckCircle2, Clock, MapPin, ChevronRight, Download
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
  paymentStatus?: 'Unpaid' | 'Partial' | 'Fully Paid' | null;
  paymentMode?: string | null;
  totalDue?: number | null;
  totalPaid?: number | null;
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
  curriculumCourseId: number;
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
  unitsLec: number;
  unitsLab: number;
  lectureHour: number;
  labHour: number;
}

// Step indicator component
function StepIndicator({ step, currentStep }: { step: number; currentStep: number }) {
  const done = currentStep > step;
  const active = currentStep === step;
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
      done ? 'text-white' : active ? 'text-white' : 'text-gray-400'
    }`} style={{
      backgroundColor: done ? colors.success : active ? colors.secondary : '#E2E8F0'
    }}>
      {done ? <CheckCircle2 className="w-4 h-4" /> : step}
    </div>
  );
}

export default function IrregularEnrollmentPage() {
  const router = useRouter();
  const { programs: programsWithMajors, loading: loadingPrograms } = useProgramsWithMajors();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSearchModal, setStudentSearchModal] = useState(false);
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'regular' | 'irregular'>('all');
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const [sectionSearchModal, setSectionSearchModal] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [sectionProgramFilter, setSectionProgramFilter] = useState('all');
  const [sectionYearFilter, setSectionYearFilter] = useState('all');
  const [selectedAssessmentSubject, setSelectedAssessmentSubject] = useState<any | null>(null);

  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const [enrolledSubjects, setEnrolledSubjects] = useState<EnrolledSubject[]>([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);
  const [enrolledSubjectsFromAssessment, setEnrolledSubjectsFromAssessment] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; subject: EnrolledSubject | null }>({ isOpen: false, subject: null });
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [paymentWarningModal, setPaymentWarningModal] = useState<{ isOpen: boolean; student: Student | null }>({ isOpen: false, student: null });
  const [enrollConfirmModal, setEnrollConfirmModal] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [showRegistrationPDF, setShowRegistrationPDF] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [loadingRegistration, setLoadingRegistration] = useState(false);

  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [semester, setSemester] = useState('second');

  // Derive current step for the progress indicator
  const currentStep = !selectedStudent ? 1 : !selectedSection ? 2 : 3;

  const handleViewChange = (view: string) => router.push(`/dashboard?view=${view}`);

  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return students;
    const q = studentSearchQuery.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.studentNumber.toLowerCase().includes(q) ||
      s.programCode?.toLowerCase().includes(q)
    );
  }, [students, studentSearchQuery]);

  const sectionYearOptions = useMemo(() => {
    const years = [...new Set(sections.map(s => s.yearLevel).filter(Boolean))].sort((a, b) => a - b);
    return years;
  }, [sections]);

  const filteredSections = useMemo(() => {
    return sections.filter(s => {
      const q = sectionSearchQuery.toLowerCase();
      const matchesSearch = !q || s.sectionName.toLowerCase().includes(q) || s.programCode?.toLowerCase().includes(q);
      
      // Handle program filter with new format (programId or programId-majorId)
      let matchesProgram = sectionProgramFilter === 'all';
      if (!matchesProgram && sectionProgramFilter) {
        // Extract programId from filter value (e.g., "7" or "7-9")
        const filterProgramId = sectionProgramFilter.split('-')[0];
        // Match against section's programCode (need to find programId from code)
        // For now, match by program code directly
        const selectedProgram = programsWithMajors.find(p => p.value === sectionProgramFilter);
        if (selectedProgram) {
          matchesProgram = s.programCode === selectedProgram.programCode;
        }
      }
      
      const matchesYear = sectionYearFilter === 'all' || s.yearLevel === parseInt(sectionYearFilter);
      return matchesSearch && matchesProgram && matchesYear;
    });
  }, [sections, sectionSearchQuery, sectionProgramFilter, sectionYearFilter, programsWithMajors]);

  useEffect(() => { if (studentSearchModal) searchStudents(); }, [studentSearchModal, studentStatusFilter]);
  useEffect(() => { if (selectedStudent) { loadEnrolledSubjects(); } }, [selectedStudent, academicYear, semester]);
  useEffect(() => { if (selectedSection) loadSchedules(); }, [selectedSection]);

  const searchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/auth/students/search?listAll=true&academicStatus=${studentStatusFilter}&limit=100&academicYear=${academicYear}&semester=${semester}`);
      if (res.ok) { const d = await res.json(); setStudents(d.data || []); }
    } catch (e) { console.error(e); } finally { setLoadingStudents(false); }
  };

  const loadSectionsBySubject = async (curriculumCourseId: number) => {
    setLoadingSections(true);
    try {
      console.log('[loadSectionsBySubject] Fetching sections for curriculum course:', curriculumCourseId);
      const res = await fetch(`/api/sections-by-subject?curriculumCourseId=${curriculumCourseId}&academicYear=${academicYear}&semester=${semester}`);
      console.log('[loadSectionsBySubject] Response status:', res.status);
      if (!res.ok) {
        const errorData = await res.json();
        console.error('[loadSectionsBySubject] Error:', errorData);
        setSections([]);
        return;
      }
      const data = await res.json();
      console.log('[loadSectionsBySubject] Data received:', data);
      setSections(data.data || []);
    } catch (e) { 
      console.error('[loadSectionsBySubject] Exception:', e); 
      setSections([]); 
    } finally { 
      setLoadingSections(false); 
    }
  };

  const handleSelectAssessmentSubject = async (subject: any) => {
    setSelectedAssessmentSubject(subject);
    await loadSectionsBySubject(subject.curriculum_course_id);
    setSectionSearchQuery('');
    setSectionProgramFilter('all');
    setSectionYearFilter('all');
    setSectionSearchModal(true);
  };

  const loadSchedules = async () => {
    if (!selectedSection || !selectedStudent) return;
    setLoadingSchedules(true);
    try {
      const semNum = semester === 'first' ? 1 : semester === 'second' ? 2 : parseInt(semester);
      const enrolledRes = await fetch(`/api/auth/enrolled-subjects?studentNumber=${selectedStudent.studentNumber}&academicYear=${academicYear}&semester=${semNum}`);
      let enrolledCourseIds: number[] = [];
      if (enrolledRes.ok) {
        const ed = await enrolledRes.json();
        enrolledCourseIds = (ed.data || []).map((s: any) => s.curriculum_course_id);
      }
      const res = await fetch(`/api/class-schedule?sectionId=${selectedSection.id}&academicYear=${academicYear}&semester=${semester}`);
      if (res.ok) {
        const data = await res.json();
        const all = (data.data || []).map((s: any) => ({
          id: s.id, sectionId: selectedSection.id, sectionName: selectedSection.sectionName,
          curriculumCourseId: s.curriculumCourseId,
          courseCode: s.courseCode || `Course ${s.curriculumCourseId}`,
          courseTitle: s.courseTitle || '',
          facultyName: s.faculty ? `${s.faculty.first_name} ${s.faculty.last_name}` : 'TBA',
          roomNumber: s.room?.room_number || 'TBA',
          dayOfWeek: s.dayOfWeek, startTime: formatTime(s.startTime), endTime: formatTime(s.endTime),
          prerequisite: s.prerequisite || null, subjectYearLevel: s.subjectYearLevel || null,
          subjectSemester: s.subjectSemester || null, unitsTotal: s.unitsTotal || 0
        }));
        setSchedules(all.filter((s: any) => enrolledCourseIds.includes(s.curriculumCourseId)));
      }
    } catch (e) { console.error(e); } finally { setLoadingSchedules(false); }
  };

  const loadEnrolledSubjects = async () => {
    if (!selectedStudent) return;
    setLoadingEnrolled(true);
    try {
      console.log('[loadEnrolledSubjects] Fetching for:', {
        studentNumber: selectedStudent.studentNumber,
        academicYear,
        semester
      });
      
      const res = await fetch(`/api/irregular-enrollment?studentNumber=${selectedStudent.studentNumber}&academicYear=${academicYear}&semester=${semester}`);
      if (res.ok) { 
        const d = await res.json(); 
        console.log('[loadEnrolledSubjects] Irregular enrollment data:', d.data);
        setEnrolledSubjects(d.data || []); 
      }
      
      const semNum = semester === 'first' ? 1 : semester === 'second' ? 2 : parseInt(semester);
      console.log('[loadEnrolledSubjects] Fetching assessment subjects with semNum:', semNum);
      
      const aRes = await fetch(`/api/auth/enrolled-subjects?studentNumber=${selectedStudent.studentNumber}&academicYear=${academicYear}&semester=${semNum}`);
      console.log('[loadEnrolledSubjects] Assessment API response status:', aRes.status);
      
      if (aRes.ok) { 
        const ad = await aRes.json(); 
        console.log('[loadEnrolledSubjects] Assessment subjects data:', ad);
        setEnrolledSubjectsFromAssessment(ad.data || []); 
      } else {
        const errorData = await aRes.json();
        console.error('[loadEnrolledSubjects] Assessment API error:', errorData);
      }
    } catch (e) { 
      console.error('[loadEnrolledSubjects] Exception:', e); 
      setEnrolledSubjects([]); 
      setEnrolledSubjectsFromAssessment([]); 
    } finally { 
      setLoadingEnrolled(false); 
    }
  };

  const formatTime = (isoTime: string) => {
    const d = new Date(isoTime);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSelectStudent = (student: Student) => {
    // Check if student has unpaid or no payment status
    if (!student.paymentStatus || student.paymentStatus === 'Unpaid') {
      setPaymentWarningModal({ isOpen: true, student });
      return;
    }
    
    // Proceed with selection for Partial or Fully Paid students
    setSelectedStudent(student); setStudentSearchModal(false);
    setStudentSearchQuery(''); setSelectedSection(null); setSchedules([]); setError(null);
    setSelectedAssessmentSubject(null);
  };

  const handleConfirmUnpaidStudent = () => {
    if (paymentWarningModal.student) {
      setSelectedStudent(paymentWarningModal.student);
      setStudentSearchModal(false);
      setStudentSearchQuery('');
      setSelectedSection(null);
      setSchedules([]);
      setError(null);
      setSelectedAssessmentSubject(null);
    }
    setPaymentWarningModal({ isOpen: false, student: null });
  };

  const handleEnrollStudent = async () => {
    if (!selectedStudent) return;
    
    setEnrolling(true);
    try {
      const response = await fetch(`/api/auth/enroll/${selectedStudent.studentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 1 }) // 1 = Enrolled
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to enroll student');
      }

      setEnrollConfirmModal(false);
      setSuccessModal({ 
        isOpen: true, 
        message: `${selectedStudent.name} has been successfully enrolled!\n\nStatus changed to "Enrolled" with ${enrolledSubjects.length} subjects (${totalUnits} units).` 
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to enroll student');
      setEnrollConfirmModal(false);
    } finally {
      setEnrolling(false);
    }
  };

  const handleViewRegistration = async () => {
    if (!selectedStudent) return;
    
    setLoadingRegistration(true);
    try {
      const response = await fetch(`/api/auth/enrollment/registration?studentNumber=${selectedStudent.studentNumber}&academicYear=${academicYear}&semester=${semester}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load registration data');
      }

      const result = await response.json();
      setRegistrationData(result.data);
      setShowRegistrationPDF(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load registration');
    } finally {
      setLoadingRegistration(false);
    }
  };

  const handleSelectSection = (section: Section) => {
    setSelectedSection(section); setSectionSearchModal(false); setSectionSearchQuery('');
    setSelectedAssessmentSubject(null);
  };

  const handleAddSubject = async (schedule: ClassSchedule) => {
    if (!selectedStudent || !selectedSection) return;
    if (enrolledSubjects.some(e => e.classScheduleId === schedule.id)) {
      setError('Student is already enrolled in this class schedule'); return;
    }
    const isDup = enrolledSubjects.some(e => {
      const es = schedules.find(s => s.id === e.classScheduleId);
      return es && es.curriculumCourseId === schedule.curriculumCourseId;
    });
    if (isDup) { setError(`Already enrolled in ${schedule.courseCode}`); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/irregular-enrollment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentNumber: selectedStudent.studentNumber, classScheduleId: schedule.id, sectionId: selectedSection.id, academicYear, semester })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to add subject');
      setSuccessModal({ isOpen: true, message: `Added ${schedule.courseCode} — ${schedule.courseTitle}` });
      await loadEnrolledSubjects();
      await loadSchedules(); // Reload schedules to update the available subjects list
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to add subject'); } finally { setSubmitting(false); }
  };

  const handleRemoveSubject = async () => {
    if (!selectedStudent || !deleteModal.subject) return;
    try {
      const res = await fetch(`/api/irregular-enrollment?id=${deleteModal.subject.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to remove'); }
      setDeleteModal({ isOpen: false, subject: null });
      setSuccessModal({ isOpen: true, message: `Removed ${deleteModal.subject.courseCode}` });
      await loadEnrolledSubjects();
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to remove'); setDeleteModal({ isOpen: false, subject: null }); }
  };

  const isEnrolled = (scheduleId: number) => enrolledSubjects.some(e => e.classScheduleId === scheduleId);
  const isSubjectEnrolled = (curriculumCourseId: number) => enrolledSubjects.some(e => {
    const es = schedules.find(s => s.id === e.classScheduleId);
    return es && es.curriculumCourseId === curriculumCourseId;
  });

  // Group enrolled subjects by curriculumCourseId so lecture+lab show as one card
  const groupedEnrolledSubjects = Object.values(
    enrolledSubjects.reduce((acc, subj) => {
      const key = subj.curriculumCourseId || subj.courseCode;
      if (!acc[key]) {
        acc[key] = { ...subj, slots: [subj] };
      } else {
        acc[key].slots.push(subj);
      }
      return acc;
    }, {} as Record<string | number, EnrolledSubject & { slots: EnrolledSubject[] }>)
  );

  // Determine if a slot is lecture or lab based on duration vs curriculum hours
  const getSlotLabel = (slot: EnrolledSubject, totalSlots: number): 'Lecture' | 'Lab' | null => {
    if (slot.lectureHour === 0) return 'Lab'; // lab-only subject
    if (totalSlots === 1) return null; // single slot, no label needed
    const [sh, sm] = slot.startTime.split(':').map(Number);
    const [eh, em] = slot.endTime.split(':').map(Number);
    const duration = (eh * 60 + em) - (sh * 60 + sm);
    const lecMin = slot.lectureHour * 60;
    const labMin = slot.labHour * 60;
    if (lecMin > 0 && Math.abs(duration - lecMin) <= 30) return 'Lecture';
    if (labMin > 0 && Math.abs(duration - labMin) <= 30) return 'Lab';
    // fallback: longer = lecture, shorter = lab
    return duration >= (lecMin || duration) ? 'Lecture' : 'Lab';
  };

  // Total units: count each unique subject only once
  const totalUnits = groupedEnrolledSubjects.reduce((sum, g) => sum + (g.unitsTotal || 0), 0);
  const assessmentTotalUnits = enrolledSubjectsFromAssessment.reduce((sum: number, s: any) => sum + (s.units_total || 0), 0);
  const hasAssessmentSubjects = enrolledSubjectsFromAssessment.length > 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <Navigation currentView="section-management" onViewChange={handleViewChange} />
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.neutralLight }}>

        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 z-20" style={{ backgroundColor: 'rgba(253,251,248,0.97)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(179,116,74,0.12)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/dashboard?view=section-management')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: colors.tertiary }}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
                  <BookOpen className="w-5 h-5" style={{ color: colors.warning }} />
                </div>
                <div>
                  <h1 className="text-lg font-bold" style={{ color: colors.primary }}>Manual Subject Enrollment</h1>
                  <p className="text-xs" style={{ color: colors.neutral }}>Assign class schedules to irregular students</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="px-3 py-2 rounded-lg text-sm border bg-white" style={{ borderColor: 'rgba(179,116,74,0.2)', color: colors.primary }}>
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
              </select>
              <select value={semester} onChange={e => setSemester(e.target.value)} className="px-3 py-2 rounded-lg text-sm border bg-white" style={{ borderColor: 'rgba(179,116,74,0.2)', color: colors.primary }}>
                <option value="first">1st Semester</option>
                <option value="second">2nd Semester</option>
                <option value="summer">Summer</option>
              </select>
            </div>
          </div>

          {/* Step Progress Bar */}
          <div className="flex items-center gap-2 mt-4">
            {[
              { n: 1, label: 'Select Student' },
              { n: 2, label: 'Pick Section' },
              { n: 3, label: 'Add Subjects' },
            ].map(({ n, label }, i) => (
              <React.Fragment key={n}>
                <div className="flex items-center gap-2">
                  <StepIndicator step={n} currentStep={currentStep} />
                  <span className="text-xs font-medium hidden sm:block" style={{ color: currentStep === n ? colors.secondary : currentStep > n ? colors.success : colors.neutral }}>{label}</span>
                </div>
                {i < 2 && <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: colors.neutralBorder }} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-3 p-3 rounded-lg flex items-center gap-2 text-sm flex-shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: colors.danger, border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Main 3-column layout */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-7xl mx-auto">

            {/* ── Column 1: Student ── */}
            <div className="flex flex-col rounded-2xl overflow-hidden" style={{ backgroundColor: 'white', border: '1px solid rgba(179,116,74,0.12)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(179,116,74,0.08)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: currentStep > 1 ? colors.success : colors.secondary }}>
                    {currentStep > 1 ? <CheckCircle2 className="w-3 h-3" /> : '1'}
                  </div>
                  <h2 className="text-sm font-semibold" style={{ color: colors.primary }}>Select Student</h2>
                </div>
                <p className="text-xs pl-7" style={{ color: colors.neutral }}>Search for the student to enroll</p>
              </div>
              <div className="p-5 flex-1 overflow-y-auto">
                <button
                  onClick={() => { setStudentSearchQuery(''); setStudentSearchModal(true); }}
                  className="w-full px-4 py-3 rounded-xl text-sm text-left flex items-center gap-3 transition-all hover:shadow-sm"
                  style={{ border: `1.5px dashed ${selectedStudent ? colors.secondary : 'rgba(179,116,74,0.3)'}`, backgroundColor: selectedStudent ? 'rgba(149,90,39,0.03)' : 'white', color: colors.neutral }}
                >
                  <Search className="w-4 h-4 flex-shrink-0" style={{ color: colors.tertiary }} />
                  <span className="truncate" style={{ color: selectedStudent ? colors.primary : colors.neutral }}>
                    {selectedStudent ? `${selectedStudent.name}` : 'Click to search student...'}
                  </span>
                </button>

                {selectedStudent && (
                  <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: 'rgba(253,251,248,0.8)', border: '1px solid rgba(179,116,74,0.15)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0" style={{ backgroundColor: 'rgba(149,90,39,0.12)', color: colors.secondary }}>
                        {selectedStudent.firstName?.charAt(0)}{selectedStudent.lastName?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: colors.primary }}>{selectedStudent.name}</div>
                        <div className="text-xs" style={{ color: colors.neutral }}>{selectedStudent.studentNumber}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0" style={{
                        backgroundColor: selectedStudent.academicStatus === 'irregular' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                        color: selectedStudent.academicStatus === 'irregular' ? '#D97706' : '#059669'
                      }}>
                        {selectedStudent.academicStatus || 'regular'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs px-1" style={{ color: colors.neutral }}>
                      <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.tertiary }} />
                      <span className="truncate">{selectedStudent.programCode} — {selectedStudent.programName || 'N/A'}</span>
                    </div>
                  </div>
                )}

                {/* Assessment subjects panel */}
                {selectedStudent && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold" style={{ color: colors.primary }}>Assessment Subjects</span>
                      {hasAssessmentSubjects && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                          {assessmentTotalUnits} units
                        </span>
                      )}
                    </div>
                    {loadingEnrolled ? (
                      <div className="flex items-center gap-2 py-3 px-3 rounded-lg" style={{ backgroundColor: 'rgba(99,102,241,0.05)' }}>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#6366F1' }} />
                        <span className="text-xs" style={{ color: '#6366F1' }}>Loading assessment subjects...</span>
                      </div>
                    ) : !hasAssessmentSubjects ? (
                      <div className="p-3 rounded-xl text-center" style={{ backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <AlertCircle className="w-5 h-5 mx-auto mb-1" style={{ color: colors.warning }} />
                        <p className="text-xs font-medium" style={{ color: colors.warning }}>No assessment subjects</p>
                        <p className="text-[10px] mt-0.5" style={{ color: colors.tertiary }}>Student must complete assessment first</p>
                      </div>
                    ) : (
                      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.15)' }}>
                        <div className="max-h-52 overflow-y-auto">
                          {enrolledSubjectsFromAssessment.map((subject: any, idx: number) => {
                            const isSectioned = enrolledSubjects.some(e => {
                              const sc = schedules.find(s => s.id === e.classScheduleId);
                              return sc && sc.curriculumCourseId === subject.curriculum_course_id;
                            });
                            return (
                              <div 
                                key={subject.id} 
                                onClick={() => handleSelectAssessmentSubject(subject)}
                                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors group" 
                                style={{ 
                                  borderBottom: idx < enrolledSubjectsFromAssessment.length - 1 ? '1px solid rgba(99,102,241,0.08)' : 'none', 
                                  backgroundColor: isSectioned ? 'rgba(16,185,129,0.04)' : 'white' 
                                }}
                                title="Click to find sections with this subject"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold truncate" style={{ color: colors.primary }}>{subject.course_code}</div>
                                  <div className="text-[10px] truncate" style={{ color: colors.neutral }}>{subject.descriptive_title}</div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(149,90,39,0.08)', color: colors.secondary }}>{subject.units_total}u</span>
                                  {isSectioned ? (
                                    <CheckCircle2 className="w-3 h-3" style={{ color: colors.success }} />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#6366F1' }} />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: 'rgba(99,102,241,0.04)', borderTop: '1px solid rgba(99,102,241,0.1)' }}>
                          <span className="text-[10px]" style={{ color: '#6366F1' }}>Click a subject to find sections</span>
                          <span className="text-[10px] font-semibold" style={{ color: '#6366F1' }}>{enrolledSubjects.length}/{enrolledSubjectsFromAssessment.length} sectioned</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Column 2: Section & Available Subjects ── */}
            <div className="flex flex-col rounded-2xl overflow-hidden" style={{ backgroundColor: 'white', border: '1px solid rgba(179,116,74,0.12)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(179,116,74,0.08)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: currentStep > 2 ? colors.success : currentStep === 2 ? colors.secondary : '#CBD5E1' }}>
                    {currentStep > 2 ? <CheckCircle2 className="w-3 h-3" /> : '2'}
                  </div>
                  <h2 className="text-sm font-semibold" style={{ color: colors.primary }}>Pick Section & Add Subjects</h2>
                </div>
                <p className="text-xs pl-7" style={{ color: colors.neutral }}>Browse schedules from a section</p>
              </div>

              {!selectedStudent ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <User className="w-10 h-10 mb-3" style={{ color: colors.neutralBorder }} />
                  <p className="text-sm font-medium" style={{ color: colors.neutral }}>Select a student first</p>
                  <p className="text-xs mt-1" style={{ color: colors.tertiary }}>Step 1 must be completed</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
                  {/* Section picker */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.primary }}>Section</label>
                    {selectedSection ? (
                      <div className="w-full px-4 py-2.5 rounded-xl text-sm text-left flex items-center gap-3 transition-all" style={{ border: `1.5px solid ${colors.secondary}`, backgroundColor: 'rgba(149,90,39,0.03)', color: colors.primary }}>
                        <Users className="w-4 h-4 flex-shrink-0" style={{ color: colors.tertiary }} />
                        <span className="flex-1 truncate">{selectedSection.sectionName} — {selectedSection.programCode} Yr {selectedSection.yearLevel}</span>
                        <button onClick={() => { setSelectedSection(null); setSchedules([]); }} className="p-0.5 rounded hover:bg-gray-100">
                          <X className="w-3.5 h-3.5" style={{ color: colors.tertiary }} />
                        </button>
                      </div>
                    ) : !hasAssessmentSubjects ? (
                      <div className="w-full px-4 py-2.5 rounded-xl text-sm text-left flex items-center gap-3" style={{ border: '1.5px dashed rgba(179,116,74,0.15)', backgroundColor: 'rgba(241,245,249,0.5)', color: colors.neutral, opacity: 0.6 }}>
                        <Users className="w-4 h-4 flex-shrink-0" style={{ color: colors.tertiary }} />
                        <span className="flex-1 truncate">Complete assessment first</span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl text-center" style={{ border: '1px dashed rgba(99,102,241,0.2)', backgroundColor: 'rgba(99,102,241,0.02)' }}>
                        <AlertCircle className="w-5 h-5 mx-auto mb-1" style={{ color: '#6366F1' }} />
                        <p className="text-xs font-medium" style={{ color: colors.primary }}>Click a subject above</p>
                        <p className="text-[10px] mt-0.5" style={{ color: colors.neutral }}>to see sections that offer it</p>
                      </div>
                    )}
                  </div>

                  {/* Available subjects list */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                      <label className="text-xs font-semibold" style={{ color: colors.primary }}>Available Subjects</label>
                      {selectedSection && !loadingSchedules && schedules.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(149,90,39,0.08)', color: colors.secondary }}>{schedules.length} subjects</span>
                      )}
                    </div>

                    {!selectedSection ? (
                      <div className="flex-1 flex flex-col items-center justify-center rounded-xl p-6 text-center" style={{ border: '1px dashed rgba(179,116,74,0.2)', backgroundColor: 'rgba(253,251,248,0.5)' }}>
                        <Calendar className="w-8 h-8 mb-2" style={{ color: colors.neutralBorder }} />
                        <p className="text-sm" style={{ color: colors.neutral }}>Pick a section above to see available subjects</p>
                      </div>
                    ) : loadingSchedules ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="w-full h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'rgba(179,116,74,0.06)' }} />
                        ))}
                      </div>
                    ) : schedules.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center rounded-xl p-6 text-center" style={{ border: '1px dashed rgba(179,116,74,0.2)', backgroundColor: 'rgba(253,251,248,0.5)' }}>
                        <BookOpen className="w-8 h-8 mb-2" style={{ color: colors.neutralBorder }} />
                        <p className="text-sm font-medium" style={{ color: colors.neutral }}>No matching subjects</p>
                        <p className="text-xs mt-1" style={{ color: colors.tertiary }}>This section has no schedules matching the student's assessment subjects</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                        {schedules.map(schedule => {
                          const enrolled = isEnrolled(schedule.id);
                          const subjectEnrolled = isSubjectEnrolled(schedule.curriculumCourseId);
                          const cannotAdd = enrolled || subjectEnrolled;
                          return (
                            <div key={schedule.id} className="rounded-xl p-3 transition-all" style={{
                              border: `1px solid ${enrolled ? 'rgba(16,185,129,0.25)' : subjectEnrolled ? 'rgba(245,158,11,0.25)' : 'rgba(179,116,74,0.12)'}`,
                              backgroundColor: enrolled ? 'rgba(16,185,129,0.04)' : subjectEnrolled ? 'rgba(245,158,11,0.04)' : 'white'
                            }}>
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold" style={{ color: cannotAdd ? colors.neutral : colors.primary }}>{schedule.courseCode}</span>
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(149,90,39,0.08)', color: colors.secondary }}>{schedule.unitsTotal}u</span>
                                    {enrolled && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: colors.success }}>✓ Enrolled</span>}
                                    {!enrolled && subjectEnrolled && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: colors.warning }}>Other section</span>}
                                  </div>
                                  <div className="text-xs mt-0.5 truncate" style={{ color: colors.neutral }}>{schedule.courseTitle}</div>
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                                    <span className="flex items-center gap-1 text-[10px]" style={{ color: colors.tertiary }}>
                                      <Clock className="w-3 h-3" />{schedule.dayOfWeek} {schedule.startTime}–{schedule.endTime}
                                    </span>
                                    <span className="flex items-center gap-1 text-[10px]" style={{ color: colors.tertiary }}>
                                      <MapPin className="w-3 h-3" />{schedule.roomNumber}
                                    </span>
                                    <span className="flex items-center gap-1 text-[10px]" style={{ color: colors.tertiary }}>
                                      <User className="w-3 h-3" />{schedule.facultyName}
                                    </span>
                                  </div>
                                  {schedule.prerequisite && (
                                    <div className="mt-1.5 text-[10px] px-2 py-0.5 rounded inline-block" style={{ backgroundColor: 'rgba(245,158,11,0.08)', color: colors.warning }}>
                                      Prereq: {schedule.prerequisite}
                                    </div>
                                  )}
                                </div>
                                {!cannotAdd && (
                                  <button
                                    onClick={() => handleAddSubject(schedule)}
                                    disabled={submitting}
                                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50"
                                    style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: colors.success }}
                                    title="Add to enrollment"
                                  >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Column 3: Enrolled Subjects (sticky sidebar) ── */}
            <div className="flex flex-col rounded-2xl overflow-hidden" style={{ backgroundColor: 'white', border: '1px solid rgba(179,116,74,0.12)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              {/* Header with total units */}
              <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(179,116,74,0.08)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: currentStep === 3 ? colors.secondary : '#CBD5E1' }}>3</div>
                    <h2 className="text-sm font-semibold" style={{ color: colors.primary }}>Enrolled Subjects</h2>
                  </div>
                  {selectedStudent && (
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-semibold tracking-wide" style={{ color: colors.tertiary }}>Total Units</div>
                      <div className="text-2xl font-black leading-none" style={{ color: totalUnits > 0 ? colors.secondary : colors.neutralBorder }}>{totalUnits}</div>
                    </div>
                  )}
                </div>
              </div>

              {!selectedStudent ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <GraduationCap className="w-10 h-10 mb-3" style={{ color: colors.neutralBorder }} />
                  <p className="text-sm font-medium" style={{ color: colors.neutral }}>No student selected</p>
                  <p className="text-xs mt-1" style={{ color: colors.tertiary }}>Enrolled subjects will appear here</p>
                </div>
              ) : loadingEnrolled ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-5">
                  {[1,2,3].map(i => <div key={i} className="w-full h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'rgba(179,116,74,0.06)' }} />)}
                </div>
              ) : enrolledSubjects.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'rgba(179,116,74,0.06)' }}>
                    <BookOpen className="w-7 h-7" style={{ color: colors.neutralBorder }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: colors.neutral }}>No subjects enrolled yet</p>
                  <p className="text-xs mt-1" style={{ color: colors.tertiary }}>Add subjects from the section in Step 2</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {groupedEnrolledSubjects.map(group => (
                    <div key={group.curriculumCourseId || group.courseCode} className="rounded-xl p-3 group" style={{ border: '1px solid rgba(16,185,129,0.2)', backgroundColor: 'rgba(16,185,129,0.03)' }}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Course header */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold" style={{ color: colors.primary }}>{group.courseCode}</span>
                            {/* Unit breakdown */}
                            {group.unitsLec > 0 && group.unitsLab > 0 ? (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(149,90,39,0.08)', color: colors.secondary }}>
                                {group.unitsLec}lec / {group.unitsLab}lab
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(149,90,39,0.08)', color: colors.secondary }}>
                                {group.unitsTotal}u
                              </span>
                            )}
                          </div>
                          <div className="text-xs mt-0.5 truncate" style={{ color: colors.neutral }}>{group.courseTitle}</div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium inline-block mt-1" style={{ backgroundColor: 'rgba(99,102,241,0.08)', color: '#6366F1' }}>{group.sectionName}</span>

                          {/* One row per slot (lecture / lab) */}
                          <div className="mt-2 space-y-1.5">
                            {group.slots.map(slot => {
                              const label = getSlotLabel(slot, group.slots.length);
                              const isLab = label === 'Lab';
                              return (
                                <div key={slot.id} className="rounded-lg px-2 py-1.5" style={{ backgroundColor: isLab ? 'rgba(14,165,233,0.06)' : 'rgba(149,90,39,0.04)', border: `1px solid ${isLab ? 'rgba(14,165,233,0.15)' : 'rgba(179,116,74,0.1)'}` }}>
                                  {label && (
                                    <span className="text-[9px] font-bold uppercase tracking-wide mr-1.5" style={{ color: isLab ? '#0EA5E9' : colors.secondary }}>{label}</span>
                                  )}
                                  <span className="text-[10px]" style={{ color: colors.primary }}>
                                    <Clock className="w-3 h-3 inline mr-0.5" style={{ color: colors.tertiary }} />
                                    {slot.dayOfWeek} {slot.startTime}–{slot.endTime}
                                  </span>
                                  <span className="text-[10px] ml-2" style={{ color: colors.tertiary }}>
                                    <MapPin className="w-3 h-3 inline mr-0.5" />{slot.roomNumber}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, subject: group.slots[0] })}
                          className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                          style={{ color: colors.danger }}
                          title="Remove subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer summary */}
              {selectedStudent && enrolledSubjects.length > 0 && (
                <>
                  <div className="px-5 py-3 flex-shrink-0 flex items-center justify-between" style={{ borderTop: '1px solid rgba(179,116,74,0.08)', backgroundColor: 'rgba(253,251,248,0.6)' }}>
                    <span className="text-xs" style={{ color: colors.neutral }}>{groupedEnrolledSubjects.length} of {enrolledSubjectsFromAssessment.length} subjects sectioned</span>
                    <span className="text-xs font-semibold" style={{ color: totalUnits >= 18 ? colors.success : colors.warning }}>
                      {totalUnits >= 18 ? '✓ Full load' : 'Partial load'}
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="px-5 py-4 flex-shrink-0 space-y-2" style={{ borderTop: '1px solid rgba(179,116,74,0.08)', backgroundColor: 'white' }}>
                    <button
                      onClick={handleViewRegistration}
                      disabled={loadingRegistration}
                      className="w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ backgroundColor: colors.secondary, color: 'white' }}
                    >
                      {loadingRegistration ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Loading...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>View Registration</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => setEnrollConfirmModal(true)}
                      disabled={enrolling}
                      className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ backgroundColor: colors.success }}
                    >
                      {enrolling ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enrolling...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Enroll Student</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Student Search Modal */}
      {studentSearchModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setStudentSearchModal(false)}>
          <div className="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: 'rgba(179,116,74,0.12)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(149,90,39,0.1)' }}><Search className="w-5 h-5" style={{ color: colors.secondary }} /></div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: colors.primary }}>Search Student</h2>
                  <p className="text-xs" style={{ color: colors.neutral }}>Search by name or student number</p>
                </div>
              </div>
              <button onClick={() => setStudentSearchModal(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><X className="w-5 h-5" style={{ color: colors.neutral }} /></button>
            </div>
            <div className="p-5 border-b flex gap-3" style={{ borderColor: 'rgba(179,116,74,0.08)' }}>
              <select value={studentStatusFilter} onChange={e => setStudentStatusFilter(e.target.value as any)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" style={{ color: colors.primary }}>
                <option value="all">All Students</option>
                <option value="regular">Regular</option>
                <option value="irregular">Irregular</option>
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.tertiary }} />
                <input type="text" value={studentSearchQuery} onChange={e => setStudentSearchQuery(e.target.value)} placeholder="Name or student number..." autoFocus className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
              {loadingStudents ? (
                <div className="text-center py-12"><Loader2 className="w-7 h-7 animate-spin mx-auto mb-3" style={{ color: colors.secondary }} /><p className="text-sm" style={{ color: colors.neutral }}>Loading students...</p></div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12"><User className="w-10 h-10 mx-auto mb-3" style={{ color: colors.neutralBorder }} /><p className="text-sm" style={{ color: colors.neutral }}>No students found</p></div>
              ) : (
                <div className="bg-white rounded-xl overflow-hidden border border-gray-100">
                  <table className="w-full">
                    <thead><tr style={{ borderBottom: '1px solid rgba(179,116,74,0.1)' }}>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.tertiary }}>Student</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.tertiary }}>Program</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.tertiary }}>Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.tertiary }}>Payment</th>
                      <th className="py-3 px-4" />
                    </tr></thead>
                    <tbody>
                      {filteredStudents.map((student, i) => (
                        <tr key={`${student.studentId}-${i}`} className="hover:bg-gray-50 cursor-pointer transition-colors" style={{ borderBottom: '1px solid rgba(179,116,74,0.06)' }} onClick={() => handleSelectStudent(student)}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: 'rgba(149,90,39,0.1)', color: colors.secondary }}>{student.firstName?.charAt(0)}{student.lastName?.charAt(0)}</div>
                              <div><div className="text-sm font-medium" style={{ color: colors.primary }}>{student.name}</div><div className="text-xs" style={{ color: colors.neutral }}>{student.studentNumber}</div></div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm" style={{ color: colors.neutral }}>{student.programCode || '—'}</td>
                          <td className="py-3 px-4">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: student.academicStatus === 'irregular' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: student.academicStatus === 'irregular' ? '#D97706' : '#059669' }}>
                              {student.academicStatus || 'regular'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {student.paymentStatus ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium inline-block w-fit" style={{
                                  backgroundColor: student.paymentStatus === 'Fully Paid' ? 'rgba(16,185,129,0.1)' : student.paymentStatus === 'Partial' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                  color: student.paymentStatus === 'Fully Paid' ? '#059669' : student.paymentStatus === 'Partial' ? '#D97706' : '#DC2626'
                                }}>
                                  {student.paymentStatus}
                                </span>
                                {student.totalDue !== null && student.totalPaid !== null && (
                                  <span className="text-[10px]" style={{ color: colors.tertiary }}>
                                    ₱{student.totalPaid.toLocaleString()} / ₱{student.totalDue.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs" style={{ color: colors.neutral }}>—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={e => { e.stopPropagation(); handleSelectStudent(student); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90" style={{ backgroundColor: colors.secondary }}>Select</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section Search Modal */}
      {sectionSearchModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setSectionSearchModal(false)}>
          <div className="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(179,116,74,0.12)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(149,90,39,0.1)' }}><Users className="w-5 h-5" style={{ color: colors.secondary }} /></div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: colors.primary }}>Pick a Section</h2>
                    <p className="text-xs" style={{ color: colors.neutral }}>
                      {selectedAssessmentSubject 
                        ? `Sections offering ${selectedAssessmentSubject.course_code}` 
                        : `Active sections for ${academicYear} — ${semester} semester`}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSectionSearchModal(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors"><X className="w-5 h-5" style={{ color: colors.neutral }} /></button>
              </div>
              {selectedAssessmentSubject && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <BookOpen className="w-4 h-4 flex-shrink-0" style={{ color: '#6366F1' }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold" style={{ color: colors.primary }}>{selectedAssessmentSubject.course_code}</span>
                    <span className="text-xs ml-2" style={{ color: colors.neutral }}>— {selectedAssessmentSubject.descriptive_title}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ backgroundColor: 'rgba(149,90,39,0.1)', color: colors.secondary }}>{selectedAssessmentSubject.units_total}u</span>
                </div>
              )}
            </div>
            <div className="p-5 border-b flex flex-wrap gap-3" style={{ borderColor: 'rgba(179,116,74,0.08)' }}>
              <div className="relative flex-1 min-w-40">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.tertiary }} />
                <input type="text" value={sectionSearchQuery} onChange={e => setSectionSearchQuery(e.target.value)} placeholder="Section name..." autoFocus className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <select value={sectionProgramFilter} onChange={e => setSectionProgramFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" style={{ color: colors.primary }} disabled={loadingPrograms}>
                <option value="all">{loadingPrograms ? "Loading..." : "All Programs"}</option>
                {programsWithMajors.map(program => (
                  <option key={program.value} value={program.value}>
                    {program.label}
                  </option>
                ))}
              </select>
              <select value={sectionYearFilter} onChange={e => setSectionYearFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" style={{ color: colors.primary }}>
                <option value="all">All Years</option>
                {sectionYearOptions.map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
              {loadingSections ? (
                <div className="text-center py-12"><Loader2 className="w-7 h-7 animate-spin mx-auto mb-3" style={{ color: colors.secondary }} /><p className="text-sm" style={{ color: colors.neutral }}>Loading sections...</p></div>
              ) : filteredSections.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 mx-auto mb-3" style={{ color: colors.neutralBorder }} />
                  <p className="text-sm font-medium" style={{ color: colors.neutral }}>
                    {selectedAssessmentSubject ? `No sections offer ${selectedAssessmentSubject.course_code}` : 'No active sections found'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: colors.tertiary }}>
                    {selectedAssessmentSubject 
                      ? `This subject is not available in any section for ${academicYear} ${semester}` 
                      : `Check that sections are active for ${academicYear} ${semester}`}
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl overflow-hidden border border-gray-100">
                  <table className="w-full">
                    <thead><tr style={{ borderBottom: '1px solid rgba(179,116,74,0.1)' }}>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.tertiary }}>Section</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.tertiary }}>Program</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: colors.tertiary }}>Year</th>
                      <th className="py-3 px-4" />
                    </tr></thead>
                    <tbody>
                      {filteredSections.map(section => (
                        <tr key={section.id} className="hover:bg-gray-50 cursor-pointer transition-colors" style={{ borderBottom: '1px solid rgba(179,116,74,0.06)' }} onClick={() => handleSelectSection(section)}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: 'rgba(149,90,39,0.1)', color: colors.secondary }}>{section.sectionName?.charAt(0)}</div>
                              <span className="text-sm font-medium" style={{ color: colors.primary }}>{section.sectionName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm" style={{ color: colors.neutral }}>{section.programCode || '—'}</td>
                          <td className="py-3 px-4 text-sm" style={{ color: colors.neutral }}>Year {section.yearLevel}</td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={e => { e.stopPropagation(); handleSelectSection(section); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90" style={{ backgroundColor: colors.secondary }}>Select</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={enrollConfirmModal}
        onClose={() => setEnrollConfirmModal(false)}
        onConfirm={handleEnrollStudent}
        title="Confirm Enrollment"
        message={`Are you sure you want to enroll ${selectedStudent?.name}?\n\nThis will change their enrollment status to "Enrolled".\n\n${enrolledSubjects.length} subjects enrolled\n${totalUnits} total units\nAcademic Year: ${academicYear}\nSemester: ${semester}`}
        confirmText="Enroll Student"
        cancelText="Cancel"
        variant="success"
        isLoading={enrolling}
      />

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, subject: null })}
        onConfirm={handleRemoveSubject}
        title="Remove Subject"
        message={`Remove ${deleteModal.subject?.courseCode || ''} — ${deleteModal.subject?.courseTitle || ''} from this student's enrollment?`}
        confirmText="Remove"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={paymentWarningModal.isOpen}
        onClose={() => setPaymentWarningModal({ isOpen: false, student: null })}
        onConfirm={handleConfirmUnpaidStudent}
        title="Payment Warning"
        message={
          paymentWarningModal.student?.paymentStatus === 'Unpaid'
            ? `${paymentWarningModal.student?.name || 'This student'} (${paymentWarningModal.student?.studentNumber || ''}) has not made any payment for ${academicYear} ${semester} semester.\n\nTotal Due: ₱${paymentWarningModal.student?.totalDue?.toLocaleString() || '0'}\nTotal Paid: ₱${paymentWarningModal.student?.totalPaid?.toLocaleString() || '0'}\n\nDo you want to proceed with sectioning this student?`
            : `${paymentWarningModal.student?.name || 'This student'} (${paymentWarningModal.student?.studentNumber || ''}) has no payment assessment for ${academicYear} ${semester} semester.\n\nThe student may not have completed the assessment process or payment has not been recorded.\n\nDo you want to proceed with sectioning this student?`
        }
        confirmText="Proceed Anyway"
        cancelText="Cancel"
        variant="warning"
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        message={successModal.message}
        autoClose={true}
        autoCloseDelay={3000}
      />

      {/* Registration PDF Viewer */}
      {showRegistrationPDF && registrationData && (
        <RegistrationPDFViewer
          data={registrationData}
          onClose={() => {
            setShowRegistrationPDF(false);
            setRegistrationData(null);
          }}
        />
      )}
    </div>
  );
}
