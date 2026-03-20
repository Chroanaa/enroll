"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  Users,
  Layers3,
  Loader2,
  AlertCircle,
  BookOpen,
  Mail,
} from "lucide-react";
import { colors } from "../colors";

interface StudentManagementProps {
  onViewChange?: (view: string) => void;
}

interface SectionStudent {
  assignmentId: number;
  studentNumber: string;
  fullName: string;
  email: string;
  academicYear: string;
  semester: string | null;
  assignmentType: string;
  dropStatus?: "active" | "pending_drop" | "dropped";
  pendingDropCount?: number;
  droppedCount?: number;
}

interface FacultySection {
  id: number;
  sectionName: string;
  yearLevel: number | null;
  academicYear: string | null;
  semester: string | null;
  status: string | null;
  studentCount: number;
  maxCapacity: number;
  classScheduleCount: number;
  students: SectionStudent[];
}

interface FacultyDataResponse {
  success: boolean;
  data: {
    faculty: {
      id: number;
      employeeId: string;
      fullName: string;
      department: string;
    };
    sections: FacultySection[];
    summary: {
      totalSections: number;
      totalStudents: number;
    };
  };
  error?: string;
}

const ROLES = {
  FACULTY: 3,
} as const;

const StudentManagement: React.FC<StudentManagementProps> = () => {
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sections, setSections] = useState<FacultySection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    null,
  );
  const [facultyProfile, setFacultyProfile] = useState<{
    fullName: string;
    employeeId: string;
    department: string;
  } | null>(null);

  const userRole = Number((session?.user as any)?.role) || 0;
  const isFaculty = userRole === ROLES.FACULTY;

  useEffect(() => {
    const fetchFacultySections = async () => {
      if (!isFaculty) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/auth/students/faculty-sections", {
          cache: "no-store",
        });
        const payload: FacultyDataResponse = await response.json();

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.error || "Failed to load faculty sections.");
        }

        setSections(payload.data.sections || []);
        setFacultyProfile(payload.data.faculty || null);

        if ((payload.data.sections || []).length > 0) {
          setSelectedSectionId(payload.data.sections[0].id);
        }
      } catch (fetchError) {
        console.error(fetchError);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load faculty sections and students.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFacultySections();
  }, [isFaculty]);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) || null,
    [sections, selectedSectionId],
  );

  const filteredStudents = useMemo(() => {
    if (!selectedSection) return [];
    const query = searchTerm.trim().toLowerCase();
    if (!query) return selectedSection.students;

    return selectedSection.students.filter((student) => {
      return (
        student.fullName.toLowerCase().includes(query) ||
        student.studentNumber.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query)
      );
    });
  }, [searchTerm, selectedSection]);

  if (!isFaculty) {
    return (
      <div className='p-6'>
        <div
          className='rounded-xl border p-5 flex items-start gap-3'
          style={{
            backgroundColor: colors.warning + "10",
            borderColor: colors.warning + "40",
          }}
        >
          <AlertCircle
            className='w-5 h-5 mt-0.5'
            style={{ color: colors.warning }}
          />
          <div>
            <h2 className='font-semibold' style={{ color: colors.primary }}>
              Faculty View Only
            </h2>
            <p className='text-sm mt-1' style={{ color: colors.neutralDark }}>
              This tab now shows faculty sections and enrolled students for the
              logged-in faculty account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-7xl mx-auto w-full space-y-6'>
        <div>
          <h1 className='text-2xl font-bold' style={{ color: colors.primary }}>
            My Sections and Students
          </h1>
          <p className='text-sm mt-1' style={{ color: colors.neutral }}>
            View all sections assigned to you and the students under each
            section.
          </p>
          {facultyProfile && (
            <p className='text-xs mt-2' style={{ color: colors.neutralDark }}>
              {facultyProfile.fullName} • {facultyProfile.employeeId} •{" "}
              {facultyProfile.department}
            </p>
          )}
        </div>

        {loading ? (
          <div className='bg-white rounded-xl border border-gray-200 py-16 flex items-center justify-center'>
            <Loader2 className='w-7 h-7 animate-spin mr-2 text-gray-500' />
            <span className='text-gray-600'>Loading your sections...</span>
          </div>
        ) : error ? (
          <div
            className='rounded-xl border p-5 flex items-start gap-3'
            style={{
              backgroundColor: colors.danger + "10",
              borderColor: colors.danger + "40",
            }}
          >
            <AlertCircle
              className='w-5 h-5 mt-0.5'
              style={{ color: colors.danger }}
            />
            <div>
              <h2 className='font-semibold' style={{ color: colors.primary }}>
                Unable to load data
              </h2>
              <p className='text-sm mt-1' style={{ color: colors.neutralDark }}>
                {error}
              </p>
            </div>
          </div>
        ) : sections.length === 0 ? (
          <div className='bg-white rounded-xl border border-gray-200 py-14 text-center'>
            <Layers3 className='w-10 h-10 mx-auto text-gray-400 mb-2' />
            <p className='font-medium text-gray-700'>
              No sections assigned yet.
            </p>
          </div>
        ) : (
          <>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              {sections.map((section) => {
                const isActive = selectedSectionId === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSectionId(section.id)}
                    className='text-left rounded-xl border p-4 transition-all'
                    style={{
                      backgroundColor: isActive
                        ? colors.primary + "08"
                        : "white",
                      borderColor: isActive
                        ? colors.primary
                        : colors.neutralBorder,
                    }}
                  >
                    <p
                      className='font-semibold text-sm'
                      style={{ color: colors.primary }}
                    >
                      {section.sectionName}
                    </p>
                    <p
                      className='text-xs mt-1'
                      style={{ color: colors.neutral }}
                    >
                      A.Y. {section.academicYear || "N/A"} •{" "}
                      {section.semester || "N/A"}
                    </p>
                    <div
                      className='flex items-center gap-3 mt-3 text-xs'
                      style={{ color: colors.neutralDark }}
                    >
                      <span className='inline-flex items-center gap-1'>
                        <Users className='w-3.5 h-3.5' />
                        {section.students.length} students
                      </span>
                      <span className='inline-flex items-center gap-1'>
                        <BookOpen className='w-3.5 h-3.5' />
                        {section.classScheduleCount} classes
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedSection && (
              <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
                <div className='p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between'>
                  <div>
                    <h2 className='font-bold' style={{ color: colors.primary }}>
                      {selectedSection.sectionName}
                    </h2>
                    <p
                      className='text-xs mt-1'
                      style={{ color: colors.neutral }}
                    >
                      {selectedSection.students.length} students in this section
                    </p>
                  </div>

                  <div className='relative w-full sm:w-80'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                    <input
                      type='text'
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder='Search by name, student number, email...'
                      className='w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    />
                  </div>
                </div>

                <div className='overflow-x-auto'>
                  <table className='w-full min-w-[680px]'>
                    <thead className='bg-gray-50'>
                      <tr>
                        <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'>
                          Student Number
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'>
                          Student Name
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'>
                          Email
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'>
                          Assignment Type
                        </th>
                        <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'>
                          Drop Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-100'>
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className='px-4 py-10 text-center text-sm text-gray-500'
                          >
                            No students found for your search.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student) => (
                          <tr
                            key={student.assignmentId}
                            className='hover:bg-gray-50'
                          >
                            <td className='px-4 py-3 text-sm text-gray-700 font-mono'>
                              {student.studentNumber}
                            </td>
                            <td className='px-4 py-3 text-sm font-medium text-gray-900'>
                              {student.fullName}
                            </td>
                            <td className='px-4 py-3 text-sm text-gray-700'>
                              <span className='inline-flex items-center gap-1'>
                                <Mail className='w-3.5 h-3.5 text-gray-400' />
                                {student.email || "N/A"}
                              </span>
                            </td>
                            <td className='px-4 py-3 text-sm text-gray-700 capitalize'>
                              {student.assignmentType}
                            </td>
                            <td className='px-4 py-3 text-sm'>
                              {student.dropStatus === "pending_drop" ? (
                                <span className='inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700'>
                                  Pending Drop
                                  {student.pendingDropCount
                                    ? ` (${student.pendingDropCount})`
                                    : ""}
                                </span>
                              ) : student.dropStatus === "dropped" ? (
                                <span className='inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700'>
                                  Dropped
                                  {student.droppedCount
                                    ? ` (${student.droppedCount})`
                                    : ""}
                                </span>
                              ) : (
                                <span className='inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700'>
                                  Active
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentManagement;
