'use client';

import React, { useState, useEffect } from 'react';
import { colors } from '../../colors';
import { Users2, Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
}

export default function FacultySubjectManagementPage() {
  const router = useRouter();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFaculties();
  }, []);

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

  const filteredFaculties = faculties.filter((faculty) => {
    const fullName = `${faculty.first_name} ${faculty.middle_name || ''} ${faculty.last_name}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return (
      fullName.includes(search) ||
      faculty.email.toLowerCase().includes(search) ||
      faculty.departmentName.toLowerCase().includes(search)
    );
  });

  const handleManage = (facultyId: number) => {
    router.push(`/admin/faculty-subject-management/${facultyId}`);
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
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
          style={{ color: colors.neutral }}
        />
        <input
          type="text"
          placeholder="Search by name, email, or department..."
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
