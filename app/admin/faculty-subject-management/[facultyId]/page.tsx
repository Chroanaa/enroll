'use client';

import React, { useState, useEffect } from 'react';
import { colors } from '@/app/colors';
import { ArrowLeft, Calendar, List, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
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
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');
  const [workload, setWorkload] = useState(0);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  // Handle navigation view changes
  const handleViewChange = (view: string) => {
    if (view === 'faculty-subject-management') {
      router.push('/dashboard?view=faculty-subject-management');
      return;
    }
    router.push(`/dashboard?view=${view}`);
  };

  useEffect(() => {
    fetchAcademicTerm();
    fetchFaculty();
  }, [facultyId]);

  useEffect(() => {
    if (faculty && academicYear && semester) {
      fetchWorkload();
    }
  }, [faculty, academicYear, semester]);

  const fetchAcademicTerm = async () => {
    try {
      const response = await fetch('/api/auth/academic-term');
      if (!response.ok) throw new Error('Failed to fetch academic term');
      const result = await response.json();
      
      if (result.success && result.data.currentTerm) {
        setAcademicYear(result.data.currentTerm.academicYear);
        setSemester(result.data.currentTerm.semesterCode);
        
        // Generate available years (current year ± 2 years)
        const currentYear = parseInt(result.data.currentTerm.academicYear.split('-')[0]);
        const years = [];
        for (let i = -2; i <= 2; i++) {
          const year = currentYear + i;
          years.push(`${year}-${year + 1}`);
        }
        setAvailableYears(years);
      }
    } catch (error) {
      console.error('Error fetching academic term:', error);
      // Fallback to default values
      const currentYear = new Date().getFullYear();
      setAcademicYear(`${currentYear}-${currentYear + 1}`);
      setSemester('first');
      const years = [];
      for (let i = -2; i <= 2; i++) {
        const year = currentYear + i;
        years.push(`${year}-${year + 1}`);
      }
      setAvailableYears(years);
    }
  };

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

  return (
    <div className="flex h-screen overflow-hidden">
      <Navigation currentView="faculty-subject-management" onViewChange={handleViewChange} />
      <div className="flex-1 flex flex-col overflow-y-auto" style={{ backgroundColor: colors.paper }}>
    <div className="w-full space-y-6 p-6 font-sans">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
        </div>
      ) : !faculty ? (
        <div className="text-center py-12">
          <p className="text-lg" style={{ color: colors.neutral }}>
            Faculty not found
          </p>
        </div>
      ) : (
        <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/dashboard?view=faculty-subject-management')}
            className="p-2 rounded-lg transition-all hover:shadow-md mt-1"
            style={{ backgroundColor: `${colors.primary}15` }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${colors.primary}25`)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = `${colors.primary}15`)}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: colors.primary }} />
          </button>
          <div>
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ color: colors.primary }}
            >
              {faculty.first_name.toUpperCase()} {faculty.middle_name ? `${faculty.middle_name.charAt(0).toUpperCase()} ` : ''}{faculty.last_name.toUpperCase()}
            </h1>
            <p className="text-gray-500 mt-1">
              {faculty.departmentName} • Current Workload: {workload} subject{workload !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="p-6 rounded-xl shadow-sm"
        style={{
          backgroundColor: 'white',
          border: `1px solid ${colors.neutralBorder}`,
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>
              Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              disabled={!academicYear || availableYears.length === 0}
              className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: 'white',
                borderColor: colors.neutralBorder,
                color: colors.primary,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = colors.secondary)}
              onBlur={(e) => (e.currentTarget.style.borderColor = colors.neutralBorder)}
            >
              {availableYears.length === 0 ? (
                <option value="">Loading...</option>
              ) : (
                availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.primary }}>
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              disabled={!semester}
              className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: 'white',
                borderColor: colors.neutralBorder,
                color: colors.primary,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = colors.secondary)}
              onBlur={(e) => (e.currentTarget.style.borderColor = colors.neutralBorder)}
            >
              <option value="first">First Semester</option>
              <option value="second">Second Semester</option>
              <option value="summer">Summer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: colors.neutralBorder }}>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'list' ? 'text-white' : ''
          }`}
          style={{
            backgroundColor: activeTab === 'list' ? colors.secondary : 'transparent',
            color: activeTab === 'list' ? 'white' : colors.neutral,
            borderRadius: activeTab === 'list' ? '8px 8px 0 0' : '0',
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'list') {
              e.currentTarget.style.backgroundColor = colors.neutralLight;
              e.currentTarget.style.color = colors.primary;
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'list') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = colors.neutral;
            }
          }}
        >
          <List className="w-4 h-4" />
          Subjects by Section
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'calendar' ? 'text-white' : ''
          }`}
          style={{
            backgroundColor: activeTab === 'calendar' ? colors.secondary : 'transparent',
            color: activeTab === 'calendar' ? 'white' : colors.neutral,
            borderRadius: activeTab === 'calendar' ? '8px 8px 0 0' : '0',
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'calendar') {
              e.currentTarget.style.backgroundColor = colors.neutralLight;
              e.currentTarget.style.color = colors.primary;
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'calendar') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = colors.neutral;
            }
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
        </>
      )}
    </div>
      </div>
    </div>
  );
}
