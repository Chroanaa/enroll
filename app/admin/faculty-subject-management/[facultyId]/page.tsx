'use client';

import React, { useState, useEffect } from 'react';
import { colors } from '@/app/colors';
import { ArrowLeft, Calendar, List, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import FacultySubjectsTable from '@/app/admin/faculty-subject-management/components/FacultySubjectsTable';
import FacultyCalendarView from '@/app/admin/faculty-subject-management/components/FacultyCalendarView';

interface Faculty {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  departmentName: string;
}

export default function FacultySubjectManagementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const facultyId = parseInt(params.facultyId as string);

  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [semester, setSemester] = useState('first');
  const [workload, setWorkload] = useState(0);

  useEffect(() => {
    fetchFaculty();
  }, [facultyId]);

  useEffect(() => {
    if (faculty) {
      fetchWorkload();
    }
  }, [faculty, academicYear, semester]);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/faculty');
      if (!response.ok) throw new Error('Failed to fetch faculty');
      const data = await response.json();
      const foundFaculty = data.find((f: any) => f.id === facultyId);
      if (foundFaculty) {
        setFaculty(foundFaculty);
      }
    } catch (error) {
      console.error('Error fetching faculty:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkload = async () => {
    try {
      const response = await fetch(
        `/api/class-schedule?facultyId=${facultyId}&academicYear=${academicYear}&semester=${semester}`
      );
      if (!response.ok) throw new Error('Failed to fetch workload');
      const result = await response.json();
      setWorkload(result.data?.length || 0);
    } catch (error) {
      console.error('Error fetching workload:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
      </div>
    );
  }

  if (!faculty) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-lg" style={{ color: colors.neutral }}>
            Faculty not found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: `${colors.primary}15` }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: colors.primary }} />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: colors.primary }}>
              {faculty.first_name} {faculty.middle_name ? `${faculty.middle_name} ` : ''}{faculty.last_name}
            </h1>
            <p className="text-sm" style={{ color: colors.neutral }}>
              {faculty.departmentName} • Current Workload: {workload} subject{workload !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="p-4 rounded-xl flex items-center gap-4"
        style={{
          backgroundColor: colors.paper,
          border: `1px solid ${colors.tertiary}20`,
        }}
      >
        <div className="flex-1">
          <label className="block text-xs font-medium mb-1" style={{ color: colors.neutral }}>
            Academic Year
          </label>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: colors.paper,
              borderColor: `${colors.tertiary}30`,
              color: colors.primary,
            }}
          >
            <option value="2024-2025">2024-2025</option>
            <option value="2025-2026">2025-2026</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium mb-1" style={{ color: colors.neutral }}>
            Semester
          </label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: colors.paper,
              borderColor: `${colors.tertiary}30`,
              color: colors.primary,
            }}
          >
            <option value="first">First Semester</option>
            <option value="second">Second Semester</option>
            <option value="summer">Summer</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'list' ? 'text-white' : ''
          }`}
          style={{
            backgroundColor: activeTab === 'list' ? colors.primary : `${colors.primary}15`,
            color: activeTab === 'list' ? 'white' : colors.primary,
          }}
        >
          <List className="w-4 h-4" />
          Subjects by Section
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'calendar' ? 'text-white' : ''
          }`}
          style={{
            backgroundColor: activeTab === 'calendar' ? colors.primary : `${colors.primary}15`,
            color: activeTab === 'calendar' ? 'white' : colors.primary,
          }}
        >
          <Calendar className="w-4 h-4" />
          Calendar View
        </button>
      </div>

      {/* Content */}
      {activeTab === 'list' ? (
        <FacultySubjectsTable
          facultyId={facultyId}
          academicYear={academicYear}
          semester={semester}
          onWorkloadChange={setWorkload}
        />
      ) : (
        <FacultyCalendarView
          facultyId={facultyId}
          academicYear={academicYear}
          semester={semester}
        />
      )}
    </div>
  );
}
