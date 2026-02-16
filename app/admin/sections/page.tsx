'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SectionResponse } from '../../types/sectionTypes';
import { SectionList } from '../../components/sections/SectionList';
import { CreateSectionModal } from '../../components/sections/CreateSectionModal';
import { StudentAssignment } from '../../components/sections/StudentAssignment';
import { activateSection, lockSection } from '../../utils/sectionApi';
import { colors } from '../../colors';
import { Plus } from 'lucide-react';
import SearchFilters from '../../components/common/SearchFilters';

export default function SectionsPage() {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState<SectionResponse | null>(
    null
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'locked' | 'closed'>('all');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStudentAssignmentOpen, setIsStudentAssignmentOpen] = useState(false);

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  const handleEdit = (section: SectionResponse) => {
    setSelectedSection(section);
    // Implement edit functionality
  };

  const handleCreateSchedule = (section: SectionResponse) => {
    // Navigate to dedicated schedule page
    router.push(`/admin/sections/schedule/${section.id}`);
  };

  const handleAssignStudents = (section: SectionResponse) => {
    setSelectedSection(section);
    setIsStudentAssignmentOpen(true);
  };

  const handleActivate = async (section: SectionResponse) => {
    try {
      await activateSection(section.id);
      setRefreshKey((prev) => prev + 1);
      // Show success toast
    } catch (error) {
      console.error('Failed to activate section:', error);
      // Show error toast
    }
  };

  const handleLock = async (section: SectionResponse) => {
    try {
      await lockSection(section.id);
      setRefreshKey((prev) => prev + 1);
      // Show success toast
    } catch (error) {
      console.error('Failed to lock section:', error);
      // Show error toast
    }
  };

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
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-105 active:scale-95"
            style={{ backgroundColor: colors.secondary }}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add Section</span>
          </button>
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
            onEdit={handleEdit}
            onCreateSchedule={handleCreateSchedule}
            onAssignStudents={handleAssignStudents}
            onActivate={handleActivate}
            onLock={handleLock}
          />
        </div>

        {/* Modals */}
        <CreateSectionModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />

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
    </div>
  );
}
