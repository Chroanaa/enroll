'use client';

import React, { useState, useEffect } from 'react';
import { colors } from '../../colors';
import { Search, Loader2, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AllFacultyTeachingLoadPDF from './components/AllFacultyTeachingLoadPDF';

interface Faculty {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string;
  phone: string | null;
  department_id: number;
  departmentName: string;
  position: string;
  specialization: string | null;
  status: string;
  user_id?: number | null;
}

interface DepartmentOption {
  id: number;
  name: string;
}

export default function FacultySubjectManagementPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');
  const [showBulkPDF, setShowBulkPDF] = useState(false);
  const [showSinglePDF, setShowSinglePDF] = useState(false);
  const [printPopup, setPrintPopup] = useState<Window | null>(null);
  const [singlePrintFaculty, setSinglePrintFaculty] = useState<Faculty | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');
  const [tableDepartmentFilter, setTableDepartmentFilter] = useState<string>('all');
  const [deanDepartmentId, setDeanDepartmentId] = useState<number | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  const roleId = Number((session?.user as any)?.role || 0);
  const userId = Number((session?.user as any)?.id || 0);
  const isAdmin = roleId === 1;
  const isDean = roleId === 5;

  useEffect(() => {
    fetchFaculties();
    fetchAcademicTerm();
    fetchDepartments();
  }, []);

  const fetchAcademicTerm = async () => {
    try {
      const res = await fetch('/api/auth/academic-term');
      if (!res.ok) return;
      const json = await res.json();
      if (json?.data?.currentTerm) {
        setAcademicYear(json.data.currentTerm.academicYear ?? '');
        setSemester(json.data.currentTerm.semesterCode ?? '');
      }
    } catch {
      // ignore - print button will just be disabled
    }
  };

  const fetchFaculties = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/faculty');
      if (!response.ok) throw new Error('Failed to fetch faculties');
      const data = await response.json();
      setFaculties(data.filter((f: Faculty) => f.status === 'active'));
    } catch (error) {
      console.error('Error fetching faculties:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/auth/department');
      if (!response.ok) return;
      const data = await response.json();
      const list = Array.isArray(data)
        ? data
            .filter((d) => Number(d.id) > 0)
            .map((d) => ({ id: Number(d.id), name: String(d.name || `Department ${d.id}`) }))
            .sort((a, b) => a.name.localeCompare(b.name))
        : [];
      setDepartments(list);
    } catch {
      setDepartments([]);
    }
  };

  const filteredFaculties = faculties.filter((faculty) => {
    const fullName = `${faculty.first_name} ${faculty.middle_name || ''} ${faculty.last_name}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = (
      fullName.includes(search) ||
      String(faculty.employee_id || '').toLowerCase().includes(search) ||
      faculty.email.toLowerCase().includes(search) ||
      faculty.departmentName.toLowerCase().includes(search)
    );

    const matchesDepartment =
      tableDepartmentFilter === 'all' ||
      faculty.department_id === Number(tableDepartmentFilter);

    return matchesSearch && matchesDepartment;
  });

  useEffect(() => {
    if (!isDean || !userId || faculties.length === 0) {
      setDeanDepartmentId(null);
      return;
    }

    const deanFaculty = faculties.find(
      (faculty) => Number(faculty.user_id || 0) === userId,
    );
    setDeanDepartmentId(deanFaculty?.department_id || null);
  }, [isDean, userId, faculties]);

  useEffect(() => {
    if (isDean && deanDepartmentId) {
      const value = String(deanDepartmentId);
      setTableDepartmentFilter(value);
      setSelectedDepartmentId(value);
    }
  }, [isDean, deanDepartmentId]);

  const availableDepartments = departments;

  const reportFaculties = filteredFaculties.filter((faculty) => {
    if (isDean) {
      if (!deanDepartmentId) return false;
      return faculty.department_id === deanDepartmentId;
    }

    if (isAdmin) {
      if (selectedDepartmentId === 'all') return true;
      return faculty.department_id === Number(selectedDepartmentId);
    }

    return false;
  });

  const handlePrintAll = () => {
    if (reportFaculties.length === 0) {
      alert('No faculty records available for the selected department scope.');
      return;
    }

    // MUST open popup synchronously inside the click handler - browsers block window.open inside useEffect/async
    const popup = window.open('', '_blank', 'width=1100,height=820,scrollbars=yes');
    if (!popup) {
      alert('Popup was blocked. Please allow popups for this site and try again.');
      return;
    }
    setPrintPopup(popup);
    setShowBulkPDF(true);
  };

  const handleManage = (facultyId: number) => {
    router.push(`/admin/faculty-subject-management/${facultyId}`);
  };

  const handlePrintOne = (faculty: Faculty) => {
    const popup = window.open('', '_blank', 'width=1100,height=820,scrollbars=yes');
    if (!popup) {
      alert('Popup was blocked. Please allow popups for this site and try again.');
      return;
    }
    setSinglePrintFaculty(faculty);
    setPrintPopup(popup);
    setShowSinglePDF(true);
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
            Faculty Subject Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage subjects taught by faculty members
          </p>
        </div>
        {(isAdmin || isDean) && (
          <button
            onClick={handlePrintAll}
            disabled={loading || reportFaculties.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: colors.primary }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = colors.secondary; }}
            onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = colors.primary; }}
          >
            <Printer className="w-4 h-4" />
            {isDean ? 'Download My Department PDF' : 'Report Viewer PDF'}
          </button>
        )}
      </div>

      {(isAdmin || isDean) && (
        <div
          className="rounded-xl border p-4 flex flex-col md:flex-row md:items-center gap-3"
          style={{ borderColor: colors.neutralBorder, backgroundColor: 'white' }}
        >
          <div className="text-sm font-semibold" style={{ color: colors.primary }}>
            Report Scope
          </div>
          {isAdmin ? (
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: colors.neutralBorder }}
            >
              <option value="all">All Departments</option>
              {availableDepartments.map((dept) => (
                <option key={dept.id} value={String(dept.id)}>
                  {dept.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm" style={{ color: colors.neutralDark }}>
              {deanDepartmentId
                ? `Department: ${
                    departments.find((d) => d.id === deanDepartmentId)?.name ||
                    faculties.find((faculty) => faculty.department_id === deanDepartmentId)?.departmentName ||
                    `Department ${deanDepartmentId}`
                  }`
                : 'Department: Not linked to your account'}
            </div>
          )}
          <div className="text-xs" style={{ color: colors.neutral }}>
            Faculty included in PDF: {reportFaculties.length}
          </div>
        </div>
      )}

      {/* Bulk PDF generator - mounts, opens popup, then unmounts */}
      {showBulkPDF && printPopup && (
        <AllFacultyTeachingLoadPDF
          faculties={reportFaculties}
          academicYear={academicYear}
          semester={semester}
          popupWindow={printPopup}
          onClose={() => { setShowBulkPDF(false); setPrintPopup(null); }}
        />
      )}

      {/* Single faculty PDF generator */}
      {showSinglePDF && printPopup && singlePrintFaculty && (
        <AllFacultyTeachingLoadPDF
          faculties={[singlePrintFaculty]}
          academicYear={academicYear}
          semester={semester}
          popupWindow={printPopup}
          onClose={() => {
            setShowSinglePDF(false);
            setSinglePrintFaculty(null);
            setPrintPopup(null);
          }}
        />
      )}

      {/* Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
            style={{ color: colors.neutral }}
          />
          <input
            type="text"
            placeholder="Search by faculty ID, name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all shadow-sm"
            style={{
              backgroundColor: 'white',
              borderColor: colors.neutralBorder,
              color: colors.primary,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.secondary;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}15`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.neutralBorder;
              e.currentTarget.style.boxShadow = '';
            }}
          />
        </div>
        <div>
          <select
            value={tableDepartmentFilter}
            onChange={(e) => setTableDepartmentFilter(e.target.value)}
            disabled={isDean}
            className="w-full px-3 py-3 rounded-lg border text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ borderColor: colors.neutralBorder, backgroundColor: 'white' }}
          >
            <option value="all">All Departments</option>
            {availableDepartments.map((dept) => (
              <option key={dept.id} value={String(dept.id)}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Faculty List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden shadow-sm"
          style={{
            backgroundColor: 'white',
            border: `1px solid ${colors.neutralBorder}`,
          }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: colors.secondary }}>
                <th
                  className="px-6 py-4 text-left text-sm font-semibold text-white"
                >
                  Faculty
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-semibold text-white"
                >
                  Department
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-semibold text-white"
                >
                  Email
                </th>
                <th
                  className="px-6 py-4 text-center text-sm font-semibold text-white"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFaculties.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm" style={{ color: colors.neutral }}>
                    No faculty members found
                  </td>
                </tr>
              ) : (
                filteredFaculties.map((faculty) => (
                  <tr
                    key={faculty.id}
                    className="border-t transition-colors hover:bg-gray-50"
                    style={{ borderColor: colors.neutralBorder }}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-sm" style={{ color: colors.primary }}>
                          {faculty.first_name} {faculty.middle_name ? `${faculty.middle_name} ` : ''}{faculty.last_name}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: colors.neutral }}>
                          {faculty.employee_id}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: colors.neutralDark }}>
                      {faculty.departmentName}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: colors.neutral }}>
                      {faculty.email}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handlePrintOne(faculty)}
                          disabled={!academicYear || !semester}
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: colors.secondary }}
                          onMouseEnter={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.backgroundColor = colors.primary;
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.backgroundColor = colors.secondary;
                              e.currentTarget.style.transform = 'translateY(0)';
                            }
                          }}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print
                        </button>
                        <button
                          onClick={() => handleManage(faculty.id)}
                          className="px-6 py-2 rounded-lg text-sm font-medium text-white transition-all hover:shadow-md"
                          style={{ backgroundColor: colors.secondary }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.primary;
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = colors.secondary;
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
