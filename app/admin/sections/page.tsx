'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SectionResponse } from '../../types/sectionTypes';
import { SectionList } from '../../components/sections/SectionList';
import { StudentAssignment } from '../../components/sections/StudentAssignment';
import { activateSection, lockSection, unlockSection } from '../../utils/sectionApi';
import { colors } from '../../colors';
import { Lock, Unlock, CheckCircle, BookOpen, Printer } from 'lucide-react';
import SearchFilters from '../../components/common/SearchFilters';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import SuccessModal from '../../components/common/SuccessModal';
import ErrorModal from '../../components/common/ErrorModal';
import AllSectionSchedulesPDF, { SectionForPDF } from './components/AllSectionSchedulesPDF';

export default function SectionsPage() {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState<SectionResponse | null>(
    null
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'locked' | 'closed'>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Bulk schedule PDF state
  const [showBulkPDF, setShowBulkPDF] = useState(false);
  const [printPopup, setPrintPopup] = useState<Window | null>(null);
  const [pdfSections, setPdfSections] = useState<SectionForPDF[]>([]);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Modal states
  const [isStudentAssignmentOpen, setIsStudentAssignmentOpen] = useState(false);

  // Confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'activate' | 'lock' | 'unlock' | null;
    section: SectionResponse | null;
  }>({
    isOpen: false,
    type: null,
    section: null
  });

  // Success modal state
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: ''
  });

  // Error modal state
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });





  const handlePrintAll = async () => {
    // Open popup synchronously inside the click handler — browsers block window.open in async
    const popup = window.open('', '_blank', 'width=1100,height=820,scrollbars=yes');
    if (!popup) {
      alert('Popup was blocked. Please allow popups for this site and try again.');
      return;
    }
    setPrintPopup(popup);
    setLoadingPdf(true);

    try {
      // Fetch all active sections
      const res = await fetch('/api/sections');
      const json = await res.json();
      const sections: SectionForPDF[] = (json.data ?? []).map((s: any) => ({
        id: s.id,
        programId: s.programId,
        sectionName: s.sectionName,
        programCode: s.programCode ?? '',
        programName: s.programName ?? '',
        yearLevel: s.yearLevel,
        academicYear: s.academicYear,
        semester: s.semester,
      }));
      setPdfSections(sections);
      setShowBulkPDF(true);
    } catch (err) {
      console.error('Failed to fetch sections for PDF:', err);
      popup.close();
      setPrintPopup(null);
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleCreateSchedule = (section: SectionResponse) => {
    // Navigate to dedicated schedule page
    router.push(`/admin/sections/schedule/${section.id}`);
  };

  const handleViewSchedule = (section: SectionResponse) => {
    // Navigate to schedule page for viewing/editing faculty
    router.push(`/admin/sections/schedule/${section.id}`);
  };

  const handleAssignStudents = (section: SectionResponse) => {
    setSelectedSection(section);
    setIsStudentAssignmentOpen(true);
  };

  // Show confirmation modal for activate
  const handleActivate = (section: SectionResponse) => {
    setConfirmModal({
      isOpen: true,
      type: 'activate',
      section
    });
  };

  // Show confirmation modal for lock
  const handleLock = (section: SectionResponse) => {
    setConfirmModal({
      isOpen: true,
      type: 'lock',
      section
    });
  };

  // Show confirmation modal for unlock
  const handleUnlock = (section: SectionResponse) => {
    setConfirmModal({
      isOpen: true,
      type: 'unlock',
      section
    });
  };

  // Handle confirmation
  const handleConfirmAction = async () => {
    if (!confirmModal.section || !confirmModal.type) return;

    setIsLoading(true);
    try {
      switch (confirmModal.type) {
        case 'activate':
          await activateSection(confirmModal.section.id);
          setSuccessModal({
            isOpen: true,
            message: `Section "${confirmModal.section.sectionName}" has been activated successfully. Students can now be assigned to this section.`
          });
          break;
        case 'lock':
          await lockSection(confirmModal.section.id);
          setSuccessModal({
            isOpen: true,
            message: `Section "${confirmModal.section.sectionName}" has been locked. No further modifications can be made.`
          });
          break;
        case 'unlock':
          await unlockSection(confirmModal.section.id);
          setSuccessModal({
            isOpen: true,
            message: `Section "${confirmModal.section.sectionName}" has been unlocked. You can now make modifications.`
          });
          break;
      }
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      const msg = error instanceof Error ? error.message : `Failed to ${confirmModal.type} section`;
      const isScheduleError = msg.toLowerCase().includes('schedule');
      setErrorModal({
        isOpen: true,
        title: isScheduleError ? 'Cannot Activate Section' : 'Action Failed',
        message: isScheduleError
          ? 'This section has no class schedules yet.'
          : msg,
        details: isScheduleError
          ? 'Please build the class schedule for this section before activating it. Go to the Schedule button to add subjects and faculty assignments.'
          : undefined,
      });
    } finally {
      setIsLoading(false);
      setConfirmModal({ isOpen: false, type: null, section: null });
    }
  };

  // Get confirmation modal content based on type
  const getConfirmModalContent = () => {
    if (!confirmModal.section) return { title: '', message: '', variant: 'info' as const, confirmText: '' };

    switch (confirmModal.type) {
      case 'activate':
        return {
          title: 'Activate Section',
          message: `Are you sure you want to activate "${confirmModal.section.sectionName}"?\n\nOnce activated, the schedule will be frozen and students can be assigned to this section.`,
          variant: 'success' as const,
          confirmText: 'Activate',
          icon: <CheckCircle className="w-6 h-6" />
        };
      case 'lock':
        return {
          title: 'Lock Section',
          message: `Are you sure you want to lock "${confirmModal.section.sectionName}"?\n\nThis will prevent any further modifications to the section, schedule, and student assignments.`,
          variant: 'warning' as const,
          confirmText: 'Lock Section',
          icon: <Lock className="w-6 h-6" />
        };
      case 'unlock':
        return {
          title: 'Unlock Section',
          message: `Are you sure you want to unlock "${confirmModal.section.sectionName}"?\n\nThis will allow modifications to student assignments again.`,
          variant: 'info' as const,
          confirmText: 'Unlock Section',
          icon: <Unlock className="w-6 h-6" />
        };
      default:
        return { title: '', message: '', variant: 'info' as const, confirmText: '' };
    }
  };

  const confirmContent = getConfirmModalContent();

  return (
    <div className="w-full space-y-6 p-6 font-sans" style={{ backgroundColor: colors.paper }}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ color: colors.primary }}
            >
              Section Management
            </h1>
            <p className="text-gray-500 mt-1">
              Create, schedule, and manage academic sections
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrintAll}
              disabled={loadingPdf}
              className="flex items-center gap-2 px-5 py-3 rounded-lg font-medium text-sm transition-colors hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: colors.primary, color: 'white' }}
              onMouseEnter={(e) => { if (!loadingPdf) e.currentTarget.style.backgroundColor = colors.secondary; }}
              onMouseLeave={(e) => { if (!loadingPdf) e.currentTarget.style.backgroundColor = colors.primary; }}
            >
              <Printer className="w-4 h-4" />
              {loadingPdf ? 'Loading…' : 'Print All Schedules'}
            </button>
            <button
              onClick={() => router.push('/admin/irregular-enrollment')}
              className="flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium text-sm transition-colors hover:shadow-md"
              style={{ backgroundColor: colors.secondary }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.primary)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.secondary)}
            >
              <BookOpen className="w-4 h-4" />
              Manual Enrollment
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search sections..."
          filters={[
            {
              value: statusFilter,
              onChange: (value) =>
                setStatusFilter(value as 'all' | 'draft' | 'active' | 'locked' | 'closed'),
              options: [
                { value: 'all', label: 'All Status' },
                { value: 'draft', label: 'Draft' },
                { value: 'active', label: 'Active' },
                { value: 'locked', label: 'Locked' },
                { value: 'closed', label: 'Closed' },
              ],
              placeholder: 'All Status',
            },
          ]}
        />

        {/* Section List */}
        <div key={refreshKey}>
          <SectionList
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            onCreateSchedule={handleCreateSchedule}
            onViewSchedule={handleViewSchedule}
            onAssignStudents={handleAssignStudents}
            onActivate={handleActivate}
            onLock={handleLock}
            onUnlock={handleUnlock}
          />
        </div>

        {/* Modals */}
        <StudentAssignment
          section={selectedSection}
          isOpen={isStudentAssignmentOpen}
          onClose={() => {
            setIsStudentAssignmentOpen(false);
            setSelectedSection(null);
          }}
          onSuccess={() => {
            setRefreshKey((prev) => prev + 1);
          }}
        />

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false, type: null, section: null })}
          onConfirm={handleConfirmAction}
          title={confirmContent.title}
          message={confirmContent.message}
          confirmText={confirmContent.confirmText}
          variant={confirmContent.variant}
          icon={confirmContent.icon}
          isLoading={isLoading}
        />

        {/* Success Modal */}
        <SuccessModal
          isOpen={successModal.isOpen}
          onClose={() => setSuccessModal({ isOpen: false, message: '' })}
          message={successModal.message}
          autoClose={true}
          autoCloseDelay={3000}
        />

        {/* Error / Warning Modal */}
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
          title={errorModal.title}
          message={errorModal.message}
          details={errorModal.details}
        />

        {/* Bulk section schedules PDF — mounts, writes to popup, then unmounts */}
        {showBulkPDF && printPopup && (
          <AllSectionSchedulesPDF
            sections={pdfSections}
            popupWindow={printPopup}
            onClose={() => { setShowBulkPDF(false); setPrintPopup(null); setPdfSections([]); }}
          />
        )}
    </div>
  );
}
