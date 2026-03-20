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
  Download,
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

interface FacultyMember {
  id: number;
  employeeId: string;
  fullName: string;
  department: string;
  position: string;
  email: string;
  sections: FacultySection[];
  summary: {
    totalSections: number;
    totalStudents: number;
  };
}

interface ViewerProfile {
  id: number;
  employeeId: string;
  fullName: string;
  department: string;
  roleLabel: string;
}

interface StudentsViewResponse {
  success: boolean;
  data: {
    roleView: "faculty" | "dean";
    viewer: ViewerProfile;
    department: {
      id: number;
      name: string;
    };
    facultyMembers: FacultyMember[];
    summary: {
      totalFaculty: number;
      totalSections: number;
      totalStudents: number;
    };
  };
  error?: string;
}

const ROLES = {
  FACULTY: 3,
  DEAN: 5,
} as const;

const sanitizeFileName = (value: string) => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "student-list";
};

const buildExportFileName = (facultyName: string, sectionName: string) => {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate(),
  )}_${pad(now.getHours())}${pad(now.getMinutes())}`;

  return `${sanitizeFileName(facultyName)}_${sanitizeFileName(
    sectionName,
  )}_student-list_${timestamp}.xlsx`;
};

const buildSheetName = (sectionName: string) => {
  const sanitized = sectionName.replace(/[\\/*?:[\]]/g, " ").trim();
  return (sanitized || "Students").slice(0, 31);
};

const getAssignmentBadgeStyle = (assignmentType: string) => {
  const normalized = assignmentType.toLowerCase();

  if (normalized === "regular") {
    return {
      backgroundColor: colors.success + "18",
      color: colors.success,
    };
  }

  if (normalized === "irregular") {
    return {
      backgroundColor: colors.warning + "18",
      color: "#B45309",
    };
  }

  return {
    backgroundColor: colors.secondary + "14",
    color: colors.primary,
  };
};

const getDropStatusBadgeStyle = (dropStatus?: SectionStudent["dropStatus"]) => {
  if (dropStatus === "pending_drop") {
    return {
      backgroundColor: colors.warning + "18",
      color: "#B45309",
    };
  }

  if (dropStatus === "dropped") {
    return {
      backgroundColor: colors.danger + "14",
      color: colors.danger,
    };
  }

  return {
    backgroundColor: colors.success + "18",
    color: colors.success,
  };
};

const formatAssignmentType = (assignmentType: string) =>
  assignmentType
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const formatDropStatus = (student: SectionStudent) => {
  if (student.dropStatus === "pending_drop") {
    return student.pendingDropCount
      ? `Pending Drop (${student.pendingDropCount})`
      : "Pending Drop";
  }

  if (student.dropStatus === "dropped") {
    return student.droppedCount
      ? `Dropped (${student.droppedCount})`
      : "Dropped";
  }

  return "Active";
};

const SummaryCard: React.FC<{
  label: string;
  value: number;
  helper: string;
}> = ({ label, value, helper }) => (
  <div
    className='rounded-2xl border px-4 py-4 shadow-sm'
    style={{
      backgroundColor: "#FFFFFFD9",
      borderColor: colors.neutralBorder,
    }}
  >
    <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'>
      {label}
    </p>
    <p className='mt-2 text-2xl font-bold' style={{ color: colors.primary }}>
      {value}
    </p>
    <p className='mt-1 text-xs text-gray-500'>{helper}</p>
  </div>
);

const InfoPill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    className='inline-flex rounded-full px-3 py-1 text-xs font-medium'
    style={{
      backgroundColor: colors.neutralLight,
      color: colors.neutralDark,
    }}
  >
    {children}
  </span>
);

const SelectionPanel: React.FC<{
  stepLabel: string;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ stepLabel, title, description, children }) => (
  <section className='rounded-[26px] border border-gray-200 bg-white shadow-sm overflow-hidden'>
    <div className='px-5 py-4 border-b border-gray-100'>
      <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'>
        {stepLabel}
      </p>
      <h2 className='mt-1 text-lg font-bold' style={{ color: colors.primary }}>
        {title}
      </h2>
      <p className='mt-1 text-sm text-gray-500'>{description}</p>
    </div>
    {children}
  </section>
);

const StudentManagement: React.FC<StudentManagementProps> = () => {
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleView, setRoleView] = useState<"faculty" | "dean" | null>(null);
  const [viewerProfile, setViewerProfile] = useState<ViewerProfile | null>(
    null,
  );
  const [facultyMembers, setFacultyMembers] = useState<FacultyMember[]>([]);
  const [summary, setSummary] = useState({
    totalFaculty: 0,
    totalSections: 0,
    totalStudents: 0,
  });
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(
    null,
  );
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    null,
  );

  const userRole = (session?.user as any)?.role || 0;
  const canAccessStudents = [ROLES.FACULTY, ROLES.DEAN].includes(userRole);

  useEffect(() => {
    const fetchStudentsView = async () => {
      if (!canAccessStudents) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/auth/students/faculty-sections", {
          cache: "no-store",
        });
        const payload: StudentsViewResponse = await response.json();

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.error || "Failed to load students view.");
        }

        const nextFacultyMembers = payload.data.facultyMembers || [];

        setRoleView(payload.data.roleView);
        setViewerProfile(payload.data.viewer || null);
        setSummary(payload.data.summary);
        setFacultyMembers(nextFacultyMembers);
        setSelectedFacultyId(nextFacultyMembers[0]?.id ?? null);
        setSelectedSectionId(nextFacultyMembers[0]?.sections[0]?.id ?? null);
      } catch (fetchError) {
        console.error(fetchError);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load students data.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsView();
  }, [canAccessStudents]);

  const selectedFaculty = useMemo(
    () =>
      facultyMembers.find((faculty) => faculty.id === selectedFacultyId) ||
      null,
    [facultyMembers, selectedFacultyId],
  );

  useEffect(() => {
    if (!selectedFaculty) {
      setSelectedSectionId(null);
      return;
    }

    const hasSelectedSection = selectedFaculty.sections.some(
      (section) => section.id === selectedSectionId,
    );

    if (!hasSelectedSection) {
      setSelectedSectionId(selectedFaculty.sections[0]?.id ?? null);
    }
  }, [selectedFaculty, selectedSectionId]);

  const selectedSection = useMemo(
    () =>
      selectedFaculty?.sections.find(
        (section) => section.id === selectedSectionId,
      ) || null,
    [selectedFaculty, selectedSectionId],
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

  const handleFacultySelect = (facultyId: number) => {
    const faculty =
      facultyMembers.find((item) => item.id === facultyId) || null;
    setSelectedFacultyId(facultyId);
    setSelectedSectionId(faculty?.sections[0]?.id ?? null);
    setSearchTerm("");
    setExportError(null);
  };

  const handleSectionSelect = (sectionId: number) => {
    setSelectedSectionId(sectionId);
    setSearchTerm("");
    setExportError(null);
  };

  const handleExportStudents = async () => {
    if (!selectedFaculty || !selectedSection || filteredStudents.length === 0) {
      return;
    }

    try {
      setIsExporting(true);
      setExportError(null);

      const XLSX = await import("xlsx");
      const rows = filteredStudents.map((student, index) => ({
        "No.": index + 1,
        Professor: selectedFaculty.fullName,
        Department: selectedFaculty.department,
        Section: selectedSection.sectionName,
        "Student Number": student.studentNumber || "N/A",
        "Student Name": student.fullName || "N/A",
        Email: student.email || "N/A",
        "Assignment Type": student.assignmentType || "N/A",
        "Academic Year":
          student.academicYear || selectedSection.academicYear || "N/A",
        Semester: student.semester || selectedSection.semester || "N/A",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 8 },
        { wch: 28 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 },
        { wch: 32 },
        { wch: 30 },
        { wch: 18 },
        { wch: 16 },
        { wch: 14 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        buildSheetName(selectedSection.sectionName),
      );
      XLSX.writeFile(
        workbook,
        buildExportFileName(
          selectedFaculty.fullName,
          selectedSection.sectionName,
        ),
      );
    } catch (exportIssue) {
      console.error("Failed to export student list:", exportIssue);
      setExportError("Failed to export the student list. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!canAccessStudents) {
    return (
      <div className='p-6'>
        <div
          className='rounded-2xl border p-5 flex items-start gap-3'
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
              Faculty and Dean View Only
            </h2>
            <p className='text-sm mt-1' style={{ color: colors.neutralDark }}>
              Only faculty and dean accounts can access the Students tab.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className='min-h-screen p-4 sm:p-6'
      style={{ backgroundColor: colors.paper }}
    >
      <div className='max-w-7xl mx-auto w-full space-y-6'>
        <section
          className='rounded-[28px] border overflow-hidden shadow-sm'
          style={{
            borderColor: colors.neutralBorder,
            background:
              "linear-gradient(135deg, #FDFBF8 0%, #FFF6EE 52%, #F6EBDD 100%)",
          }}
        >
          <div className='p-6 sm:p-8'>
            <div className='flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6'>
              <div className='max-w-2xl'>
                <div
                  className='inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]'
                  style={{
                    backgroundColor: colors.primary + "12",
                    color: colors.primary,
                  }}
                >
                  {roleView === "dean" ? "Dean Workspace" : "Faculty Workspace"}
                </div>
                <h1
                  className='mt-4 text-3xl font-bold tracking-tight'
                  style={{ color: colors.primary }}
                >
                  {roleView === "dean"
                    ? "Department Sections and Students"
                    : "My Sections and Students"}
                </h1>
                <p className='mt-3 text-sm leading-6 text-gray-600'>
                  {roleView === "dean"
                    ? "Choose a professor from your department, then pick a section to review the student roster."
                    : "Pick a section to review the student roster, search quickly, and export the current list when needed."}
                </p>
                {viewerProfile && (
                  <div className='mt-5 flex flex-wrap gap-2'>
                    <InfoPill>{viewerProfile.fullName}</InfoPill>
                    <InfoPill>{viewerProfile.employeeId}</InfoPill>
                    <InfoPill>{viewerProfile.roleLabel}</InfoPill>
                    <InfoPill>{viewerProfile.department}</InfoPill>
                  </div>
                )}
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 xl:w-[360px] w-full'>
                <SummaryCard
                  label='Faculty'
                  value={summary.totalFaculty}
                  helper='People included in this view'
                />
                <SummaryCard
                  label='Sections'
                  value={summary.totalSections}
                  helper='Available class rosters'
                />
                <SummaryCard
                  label='Students'
                  value={summary.totalStudents}
                  helper='Students across visible sections'
                />
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className='bg-white rounded-[28px] border border-gray-200 py-20 flex items-center justify-center shadow-sm'>
            <Loader2 className='w-7 h-7 animate-spin mr-3 text-gray-500' />
            <span className='text-gray-600'>Loading students view...</span>
          </div>
        ) : error ? (
          <div
            className='rounded-[28px] border p-5 flex items-start gap-3 bg-white shadow-sm'
            style={{ borderColor: colors.danger + "40" }}
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
        ) : facultyMembers.length === 0 ? (
          <div className='bg-white rounded-[28px] border border-gray-200 py-16 text-center shadow-sm'>
            <Layers3 className='w-10 h-10 mx-auto text-gray-400 mb-2' />
            <p className='font-medium text-gray-700'>
              {roleView === "dean"
                ? "No faculty found for your department."
                : "No sections assigned yet."}
            </p>
          </div>
        ) : (
          <div className='grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start'>
            <aside className='space-y-4 xl:sticky xl:top-6'>
              {roleView === "dean" && (
                <SelectionPanel
                  stepLabel='Step 1'
                  title='Choose Professor'
                  description='Pick a faculty member to load their sections.'
                >
                  <div className='p-3 max-h-[360px] overflow-y-auto space-y-2'>
                    {facultyMembers.map((faculty) => {
                      const isActive = selectedFacultyId === faculty.id;

                      return (
                        <button
                          key={faculty.id}
                          type='button'
                          onClick={() => handleFacultySelect(faculty.id)}
                          className='w-full text-left rounded-2xl border px-4 py-3 transition-all'
                          style={{
                            backgroundColor: isActive
                              ? colors.primary + "08"
                              : "white",
                            borderColor: isActive
                              ? colors.secondary
                              : colors.neutralBorder,
                            boxShadow: isActive
                              ? "0 8px 24px rgba(58, 35, 19, 0.08)"
                              : "none",
                          }}
                        >
                          <p
                            className='font-semibold text-sm'
                            style={{ color: colors.primary }}
                          >
                            {faculty.fullName}
                          </p>
                          <p className='mt-1 text-xs text-gray-500'>
                            {faculty.position} - {faculty.employeeId}
                          </p>
                          <p className='mt-1 text-xs text-gray-400 truncate'>
                            {faculty.email || "No email provided"}
                          </p>
                          <div className='flex items-center gap-3 mt-3 text-xs text-gray-600'>
                            <span className='inline-flex items-center gap-1'>
                              <BookOpen className='w-3.5 h-3.5' />
                              {faculty.summary.totalSections} sections
                            </span>
                            <span className='inline-flex items-center gap-1'>
                              <Users className='w-3.5 h-3.5' />
                              {faculty.summary.totalStudents} students
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </SelectionPanel>
              )}

              <SelectionPanel
                stepLabel={roleView === "dean" ? "Step 2" : "Sections"}
                title={roleView === "dean" ? "Choose Section" : "My Sections"}
                description={
                  selectedFaculty
                    ? `Showing ${selectedFaculty.sections.length} section${selectedFaculty.sections.length === 1 ? "" : "s"}`
                    : "Select a professor to continue."
                }
              >
                {selectedFaculty ? (
                  <div className='p-3 max-h-[420px] overflow-y-auto space-y-2'>
                    {selectedFaculty.sections.length > 0 ? (
                      selectedFaculty.sections.map((section) => {
                        const isActive = selectedSectionId === section.id;

                        return (
                          <button
                            key={section.id}
                            type='button'
                            onClick={() => handleSectionSelect(section.id)}
                            className='w-full text-left rounded-2xl border px-4 py-3 transition-all'
                            style={{
                              backgroundColor: isActive
                                ? colors.primary + "08"
                                : "white",
                              borderColor: isActive
                                ? colors.secondary
                                : colors.neutralBorder,
                              boxShadow: isActive
                                ? "0 8px 24px rgba(58, 35, 19, 0.08)"
                                : "none",
                            }}
                          >
                            <div className='flex items-start justify-between gap-3'>
                              <div>
                                <p
                                  className='font-semibold text-sm'
                                  style={{ color: colors.primary }}
                                >
                                  {section.sectionName}
                                </p>
                                <p className='mt-1 text-xs text-gray-500'>
                                  A.Y. {section.academicYear || "N/A"} -{" "}
                                  {section.semester || "N/A"}
                                </p>
                              </div>
                              <span
                                className='inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold'
                                style={{
                                  backgroundColor: colors.neutralLight,
                                  color: colors.neutralDark,
                                }}
                              >
                                {section.students.length}
                              </span>
                            </div>
                            <div className='flex items-center gap-3 mt-3 text-xs text-gray-600'>
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
                      })
                    ) : (
                      <div className='rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500'>
                        No sections assigned yet.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='p-4'>
                    <div className='rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500'>
                      Select a professor first to view section rosters.
                    </div>
                  </div>
                )}
              </SelectionPanel>
            </aside>

            <main>
              {selectedFaculty && selectedSection ? (
                <section className='rounded-[28px] border border-gray-200 bg-white shadow-sm overflow-hidden'>
                  <div className='px-5 sm:px-6 py-5 border-b border-gray-100'>
                    <div className='flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4'>
                      <div className='min-w-0'>
                        <div
                          className='inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]'
                          style={{
                            backgroundColor: colors.secondary + "14",
                            color: colors.primary,
                          }}
                        >
                          {roleView === "dean"
                            ? "Selected Professor Roster"
                            : "Selected Section Roster"}
                        </div>
                        <h2
                          className='mt-3 text-2xl font-bold'
                          style={{ color: colors.primary }}
                        >
                          {selectedSection.sectionName}
                        </h2>
                        <p className='mt-2 text-sm text-gray-600'>
                          {selectedFaculty.fullName} -{" "}
                          {selectedFaculty.position}
                        </p>
                        <div className='mt-4 flex flex-wrap gap-2'>
                          <InfoPill>
                            Department: {selectedFaculty.department}
                          </InfoPill>
                          <InfoPill>
                            A.Y. {selectedSection.academicYear || "N/A"}
                          </InfoPill>
                          <InfoPill>
                            Semester: {selectedSection.semester || "N/A"}
                          </InfoPill>
                          <InfoPill>
                            {selectedSection.classScheduleCount} class sessions
                          </InfoPill>
                        </div>
                      </div>

                      <button
                        type='button'
                        onClick={handleExportStudents}
                        disabled={filteredStudents.length === 0 || isExporting}
                        className='inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60'
                        style={{ backgroundColor: colors.primary }}
                      >
                        {isExporting ? (
                          <Loader2 className='w-4 h-4 animate-spin' />
                        ) : (
                          <Download className='w-4 h-4' />
                        )}
                        {isExporting ? "Exporting..." : "Export Student List"}
                      </button>
                    </div>

                    <div className='mt-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3'>
                      <div className='relative w-full lg:max-w-md'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                        <input
                          type='text'
                          value={searchTerm}
                          onChange={(event) => {
                            setSearchTerm(event.target.value);
                            if (exportError) {
                              setExportError(null);
                            }
                          }}
                          placeholder='Search by student name, number, or email...'
                          className='w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        />
                      </div>

                      <div className='flex flex-wrap items-center gap-3 text-sm text-gray-600'>
                        <span>
                          Showing{" "}
                          <span className='font-semibold text-gray-900'>
                            {filteredStudents.length}
                          </span>{" "}
                          of{" "}
                          <span className='font-semibold text-gray-900'>
                            {selectedSection.students.length}
                          </span>{" "}
                          students
                        </span>
                        {searchTerm && (
                          <button
                            type='button'
                            onClick={() => setSearchTerm("")}
                            className='text-sm font-medium underline underline-offset-4'
                            style={{ color: colors.secondary }}
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                    </div>

                    {exportError && (
                      <div
                        className='mt-4 rounded-2xl border px-4 py-3 text-sm'
                        style={{
                          backgroundColor: colors.danger + "08",
                          borderColor: colors.danger + "30",
                          color: colors.danger,
                        }}
                      >
                        {exportError}
                      </div>
                    )}
                  </div>

                  <div className='overflow-x-auto'>
                    <table className='w-full min-w-[720px]'>
                      <thead className='bg-gray-50'>
                        <tr>
                          <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500'>
                            Student
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
                              colSpan={4}
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
                              <td className='px-4 py-4'>
                                <div>
                                  <p className='text-sm font-semibold text-gray-900'>
                                    {student.fullName}
                                  </p>
                                  <p className='mt-1 text-xs text-gray-500 font-mono'>
                                    {student.studentNumber || "N/A"}
                                  </p>
                                </div>
                              </td>
                              <td className='px-4 py-4 text-sm text-gray-700'>
                                <span className='inline-flex items-center gap-1'>
                                  <Mail className='w-3.5 h-3.5 text-gray-400' />
                                  {student.email || "N/A"}
                                </span>
                              </td>
                              <td className='px-4 py-4 text-sm text-gray-700'>
                                <span
                                  className='inline-flex rounded-full px-2.5 py-1 text-xs font-semibold'
                                  style={getAssignmentBadgeStyle(
                                    student.assignmentType,
                                  )}
                                >
                                  {formatAssignmentType(student.assignmentType)}
                                </span>
                              </td>
                              <td className='px-4 py-4 text-sm text-gray-700'>
                                <span
                                  className='inline-flex rounded-full px-2.5 py-1 text-xs font-semibold'
                                  style={getDropStatusBadgeStyle(
                                    student.dropStatus,
                                  )}
                                >
                                  {formatDropStatus(student)}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : (
                <section className='rounded-[28px] border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm'>
                  <Layers3 className='w-10 h-10 mx-auto text-gray-400 mb-3' />
                  <h2
                    className='text-lg font-semibold'
                    style={{ color: colors.primary }}
                  >
                    Select a section to view students
                  </h2>
                  <p className='mt-2 text-sm text-gray-500'>
                    {roleView === "dean"
                      ? "Choose a professor and then a section from the left panel to load the roster."
                      : "Choose one of your sections from the left panel to load the roster."}
                  </p>
                </section>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentManagement;
