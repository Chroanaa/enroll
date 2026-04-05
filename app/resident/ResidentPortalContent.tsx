"use client";
import React, { useState, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  User,
  Mail,
  Phone,
  Search,
  CheckCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  History,
  School,
  LayoutDashboard,
  GraduationCap,
  Eye,
  Users,
} from "lucide-react";
import { colors } from "../colors";
import SuccessModal from "../components/common/SuccessModal";
import ErrorModal from "../components/common/ErrorModal";
import ActiveTermCard from "../components/common/ActiveTermCard";
import { formatTerm } from "../utils/termUtils";
import { useAcademicTerm } from "../hooks/useAcademicTerm";
import { useProgramsWithMajors } from "../hooks/useProgramsWithMajors";

interface ResidentStudent {
  id: number;
  student_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email_address?: string;
  contact_number?: string;
  program?: {
    id: number;
    code: string;
    name: string;
    department_name?: string;
  } | null;
  major?: {
    id: number;
    code: string;
    name: string;
  } | null;
  year_level?: number;
  term?: string;
  academic_year?: string;
  admission_date?: string;
  admission_status?: string;
  academic_status?: string;
  status?: number;
}

interface StudentData {
  enrollment_id?: number;
  student_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email_address?: string;
  contact_number?: string;
  complete_address?: string;
  emergency_contact_name?: string;
  emergency_relationship?: string;
  emergency_contact_number?: string;
  department?: number;
  course_program?: string;
  major_id?: number;
  year_level?: number;
  term?: string;
  academic_year?: string;
  admission_date?: string;
  sex?: string;
  civil_status?: string;
  birthdate?: string;
  birthplace?: string;
  last_school_attended?: string;
  previous_school_year?: string;
  program_shs?: string;
  remarks?: string;
  status?: number;
  program?: {
    id: number;
    code: string;
    name: string;
    department_id?: number;
    department_name?: string;
  } | null;
  major?: {
    id: number;
    code: string;
    name: string;
    program_id: number;
  } | null;
}

interface EnrollmentHistory {
  id: number;
  term: string;
  admission_date: string | null;
  department?: number;
  course_program?: string;
}

export default function ResidentPortalContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Table list state
  const [students, setStudents] = useState<ResidentStudent[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [admissionStatusFilter, setAdmissionStatusFilter] = useState("all");
  const [programMajorFilter, setProgramMajorFilter] = useState("");
  const [yearLevelFilter, setYearLevelFilter] = useState("");
  const limit = 10;
  
  // Selected student state
  const [inputStudentNumber, setInputStudentNumber] = useState<string>("");
  const [studentNumber, setStudentNumber] = useState<string>("");
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [enrollmentHistory, setEnrollmentHistory] = useState<
    EnrollmentHistory[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Academic Term hook
  const { currentTerm, loading: termLoading } = useAcademicTerm({
    autoSync: true,
  });
  const { programs: programsWithMajors, loading: programsLoading } =
    useProgramsWithMajors();

  const currentTermLabel = useMemo(() => {
    if (!currentTerm) return "Loading current term...";
    return `${currentTerm.semester} Semester, ${currentTerm.academicYear}`;
  }, [currentTerm]);

  const programMajorOptions = useMemo(
    () => [...programsWithMajors].sort((a, b) => a.label.localeCompare(b.label)),
    [programsWithMajors],
  );
  const selectedStudentFromUrl = searchParams.get("studentNumber")?.trim() || "";

  // Form data
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null);
  const [term, setTerm] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [yearLevel, setYearLevel] = useState<number>(1);

  // Initialize with current term when available
  useEffect(() => {
    if (currentTerm) {
      // If no student data loaded yet, initialize with current term
      if (!studentData) {
        if (!term) {
          setTerm(currentTerm.semesterCode);
        }
        if (!academicYear) {
          setAcademicYear(currentTerm.academicYear);
        }
      }
      // If student data is loaded but academic year is empty, use current term
      else if (studentData && !academicYear) {
        setAcademicYear(currentTerm.academicYear);
      }
    }
  }, [currentTerm, studentData]);

  // Fetch resident students list
  const fetchResidentStudents = async () => {
    setIsLoadingList(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
        search: searchQuery,
        admissionStatus: admissionStatusFilter,
      });

      if (programMajorFilter) {
        const [programId, majorId] = programMajorFilter.split("-");
        if (programId) params.append("programId", programId);
        if (majorId) params.append("majorId", majorId);
      }
      if (yearLevelFilter) params.append("yearLevel", yearLevelFilter);

      const response = await fetch(
        `/api/auth/resident/students?${params.toString()}`,
      );
      if (response.ok) {
        const data = await response.json();
        setStudents(data.data || []);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
      } else {
        console.error("Failed to fetch resident students");
      }
    } catch (error) {
      console.error("Error fetching resident students:", error);
    } finally {
      setIsLoadingList(false);
    }
  };

  const updateResidentUrl = (selectedStudent?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "resident-enrollment");

    if (selectedStudent) {
      params.set("studentNumber", selectedStudent);
    } else {
      params.delete("studentNumber");
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  // Fetch students on mount and when page/search/filter changes
  useEffect(() => {
    if (!studentData && !selectedStudentFromUrl) {
      fetchResidentStudents();
    }
  }, [
    currentPage,
    searchQuery,
    admissionStatusFilter,
    programMajorFilter,
    yearLevelFilter,
    studentData,
    selectedStudentFromUrl,
  ]);

  useEffect(() => {
    if (
      selectedStudentFromUrl &&
      selectedStudentFromUrl !== studentNumber &&
      !studentData
    ) {
      handleSearchStudent(selectedStudentFromUrl, false);
    }
  }, [selectedStudentFromUrl, studentNumber, studentData]);

  const handleSearchStudent = async (
    studentNum?: string,
    syncUrl: boolean = true,
  ) => {
    const studentNumberToSearch = studentNum || inputStudentNumber.trim();

    if (!studentNumberToSearch) {
      setErrorMessage("Please enter a student number");
      setShowError(true);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setShowError(false);
    setStudentData(null);
    setEnrollmentHistory([]);

    try {
      const response = await fetch(`/api/students/${studentNumberToSearch}`);
      if (response.ok) {
        const data = await response.json();
        setStudentData(data);
        setStudentNumber(studentNumberToSearch);
        setInputStudentNumber(studentNumberToSearch);
        if (syncUrl) {
          updateResidentUrl(studentNumberToSearch);
        }
        setEnrollmentId(data.enrollment_id || null);
        // Pre-fill form with existing data from backend, default to current term if not available
        setTerm(data.term || currentTerm?.semesterCode || "");
        setAcademicYear(data.academic_year || currentTerm?.academicYear || "");
        setYearLevel(data.year_level || 1);
        // Fetch enrollment history
        fetchEnrollmentHistory(studentNumberToSearch);
      } else {
        const errorData = await response.json();
        setErrorMessage(
          errorData.error ||
            "Student not found. Please check the student number.",
        );
        setShowError(true);
      }
    } catch (error) {
      setErrorMessage("An error occurred while loading student data");
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentSelect = (selectedStudentNumber: string) => {
    handleSearchStudent(selectedStudentNumber);
  };

  const handleViewStudent = (student: ResidentStudent) => {
    handleSearchStudent(student.student_number);
  };

  const fetchEnrollmentHistory = async (studentNum: string) => {
    try {
      const response = await fetch(
        `/api/auth/resident/enrollments?student_number=${studentNum}`,
      );
      if (response.ok) {
        const data = await response.json();
        setEnrollmentHistory(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch enrollment history:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setShowError(false);

    try {
      const response = await fetch("/api/auth/resident/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          student_number: studentNumber,
          term: term || undefined,
          academic_year: academicYear || undefined,
          department: studentData?.department,
          course_program: studentData?.course_program,
          major_id: studentData?.major_id,
          year_level: yearLevel || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowSuccess(true);
        // Refresh enrollment history and reload student data
        fetchEnrollmentHistory(studentNumber);
        handleSearchStudent(studentNumber);
        // Refresh the list in the background
        fetchResidentStudents();
      } else {
        setErrorMessage(data.error || "Failed to submit enrollment");
        setShowError(true);
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again.");
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setInputStudentNumber("");
    setStudentNumber("");
    setStudentData(null);
    setEnrollmentHistory([]);
    setEnrollmentId(null);
    setTerm("");
    setAcademicYear("");
    setYearLevel(1);
    setErrorMessage("");
    setShowError(false);
    updateResidentUrl();
    // Refresh the list
    fetchResidentStudents();
  };

  // Compute year level display
  const getYearLevelDisplay = (): string => {
    if (!studentData) return "N/A";

    // If year_level exists in database, use it
    if (studentData.year_level) {
      const level = studentData.year_level;
      if (level === 1) return "1st Year";
      if (level === 2) return "2nd Year";
      if (level === 3) return "3rd Year";
      if (level === 4) return "4th Year";
      if (level === 5) return "5th Year";
      return `${level}th Year`;
    }

    // Compute dynamically based on admission year and current academic year
    if (studentData.academic_year && studentData.admission_date) {
      try {
        const admissionDate = new Date(studentData.admission_date);
        const admissionYear = admissionDate.getFullYear();
        const currentYear = new Date().getFullYear();

        // Parse academic year (e.g., "2024-2025")
        const [academicStart] = studentData.academic_year
          .split("-")
          .map(Number);

        // Calculate years difference
        const yearsDiff = academicStart - admissionYear;
        const computedLevel = yearsDiff + 1;

        if (computedLevel >= 1 && computedLevel <= 5) {
          if (computedLevel === 1) return "1st Year";
          if (computedLevel === 2) return "2nd Year";
          if (computedLevel === 3) return "3rd Year";
          if (computedLevel === 4) return "4th Year";
          if (computedLevel === 5) return "5th Year";
          return `${computedLevel}th Year`;
        }
      } catch (error) {
        console.error("Error computing year level:", error);
      }
    }

    return "N/A";
  };

  // Get Program/Major display text
  const getProgramMajorDisplay = () => {
    if (!studentData) return "N/A";

    const programName =
      studentData.program?.name || studentData.program?.code || "";
    const majorName = studentData.major?.name || "";
    const departmentName = studentData.program?.department_name || "";

    if (majorName) {
      return `${programName} - ${majorName}`;
    } else if (departmentName) {
      return `${programName} - ${departmentName}`;
    } else if (programName) {
      return programName;
    }

    return "N/A";
  };

  const getEnrollmentStatusMeta = (status?: number) => {
    if (status === 1) {
      return {
        label: "Active",
        icon: CheckCircle,
        textClassName: "text-green-600",
      };
    }

    if (status === 3) {
      return {
        label: "Dropped Out",
        icon: AlertCircle,
        textClassName: "text-red-600",
      };
    }

    if (status === 4) {
      return {
        label: "Pending",
        icon: Loader2,
        textClassName: "text-amber-600",
      };
    }

    return {
      label: "Inactive",
      icon: AlertCircle,
      textClassName: "text-gray-500",
    };
  };

  return (
    <div
      className='min-h-screen p-4 sm:p-6 lg:p-8'
      style={{ background: colors.paper }}
    >
      <div className='max-w-7xl mx-auto space-y-6'>
        {/* Breadcrumbs & Header */}
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2 text-sm text-gray-500 mb-1'>
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
            <ChevronRight size={14} />
            <span style={{ color: colors.primary, fontWeight: 500 }}>
              Resident Enrollment
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <div>
              <h1
                className='text-3xl font-bold tracking-tight'
                style={{ color: colors.primary }}
              >
                Resident Student Enrollment
              </h1>
              <p className='text-gray-600 mt-1'>
                Manage re-enrollment for continuing students
              </p>
            </div>
            <ActiveTermCard value={currentTermLabel} />
          </div>
        </div>

        {!studentData ? (
          // Table List View
          <div
            className='bg-white rounded-2xl'
            style={{
              border: `1px solid ${colors.tertiary}20`,
              boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
            }}
          >
            {/* Tabs for Admission Status Filter */}
            <div className='border-b border-gray-100'>
              <div className='flex gap-1 p-2'>
                {[
                  { value: "all", label: "All Students" },
                  { value: "new", label: "New" },
                  { value: "transferee", label: "Transferee" },
                  { value: "resident", label: "Resident" },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => {
                      setAdmissionStatusFilter(tab.value);
                      setCurrentPage(1);
                    }}
                    className='px-6 py-3 rounded-lg font-medium transition-all hover:shadow-md'
                    style={
                      admissionStatusFilter === tab.value
                        ? {
                            backgroundColor: colors.primary,
                            color: "white",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                          }
                        : {
                            backgroundColor: "transparent",
                            color: colors.primary,
                          }
                    }
                    onMouseEnter={(e) => {
                      if (admissionStatusFilter !== tab.value) {
                        e.currentTarget.style.backgroundColor =
                          colors.primary + "10";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (admissionStatusFilter !== tab.value) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className='p-6 border-b border-gray-100'>
              <div className='flex gap-3 items-center mb-4'>
                <div className='flex-1 relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <Search
                      className='h-5 w-5'
                      style={{ color: colors.tertiary }}
                    />
                  </div>
                  <input
                    type='text'
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder='Search by student number or name...'
                    className='w-full pl-12 pr-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-4'
                    style={{
                      borderColor: colors.tertiary + "30",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.tertiary + "30";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>
                <div
                  className='px-4 py-3 rounded-xl font-medium'
                  style={{
                    backgroundColor: colors.primary + "10",
                    color: colors.primary,
                  }}
                >
                  Total: {totalCount} Students
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                <div className='relative'>
                  <select
                    value={programMajorFilter}
                    onChange={(e) => {
                      setProgramMajorFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    disabled={programsLoading}
                    className='w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-4 appearance-none cursor-pointer bg-white disabled:opacity-60'
                    style={{
                      borderColor: colors.tertiary + "30",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.tertiary + "30";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value=''>All Programs / Majors</option>
                    {programMajorOptions.map((programOption) => (
                      <option
                        key={programOption.value}
                        value={programOption.value}
                      >
                        {programOption.label}
                      </option>
                    ))}
                  </select>
                  <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400'>
                    <ChevronRight size={16} className='rotate-90' />
                  </div>
                </div>

                <div className='relative'>
                  <select
                    value={admissionStatusFilter}
                    onChange={(e) => {
                      setAdmissionStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className='w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-4 appearance-none cursor-pointer bg-white'
                    style={{
                      borderColor: colors.tertiary + "30",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.tertiary + "30";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value='all'>All Admission Status</option>
                    <option value='new'>New</option>
                    <option value='transferee'>Transferee</option>
                    <option value='resident'>Resident</option>
                    <option value='returnee'>Returnee</option>
                  </select>
                  <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400'>
                    <ChevronRight size={16} className='rotate-90' />
                  </div>
                </div>

                <div className='relative'>
                  <select
                    value={yearLevelFilter}
                    onChange={(e) => {
                      setYearLevelFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className='w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-4 appearance-none cursor-pointer bg-white'
                    style={{
                      borderColor: colors.tertiary + "30",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = colors.tertiary + "30";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value=''>All Year Levels</option>
                    <option value='1'>1st Year</option>
                    <option value='2'>2nd Year</option>
                    <option value='3'>3rd Year</option>
                    <option value='4'>4th Year</option>
                    <option value='5'>5th Year</option>
                  </select>
                  <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400'>
                    <ChevronRight size={16} className='rotate-90' />
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className='overflow-x-auto'>
              {isLoadingList ? (
                <div className='flex flex-col items-center justify-center py-12'>
                  <Loader2
                    className='w-12 h-12 animate-spin mb-4'
                    style={{ color: colors.secondary }}
                  />
                  <p className='text-gray-500 font-medium'>
                    Loading resident students...
                  </p>
                </div>
              ) : students.length === 0 ? (
                <div className='text-center py-12'>
                  <div
                    className='w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4'
                    style={{ backgroundColor: colors.primary + "10" }}
                  >
                    <Users size={32} style={{ color: colors.primary }} />
                  </div>
                  <p className='text-gray-500 font-medium'>
                    No resident students found
                  </p>
                </div>
              ) : (
                <table className='w-full'>
                  <thead
                    style={{
                      backgroundColor: colors.paper,
                      borderBottom: `2px solid ${colors.tertiary}20`,
                    }}
                  >
                    <tr>
                      <th
                        className='px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider'
                        style={{ color: colors.primary }}
                      >
                        Student Number
                      </th>
                      <th
                        className='px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider'
                        style={{ color: colors.primary }}
                      >
                        Name
                      </th>
                      <th
                        className='px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider'
                        style={{ color: colors.primary }}
                      >
                        Program
                      </th>
                      <th
                        className='px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider'
                        style={{ color: colors.primary }}
                      >
                        Year Level
                      </th>
                      <th
                        className='px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider'
                        style={{ color: colors.primary }}
                      >
                        Admission Status
                      </th>
                      <th
                        className='px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider'
                        style={{ color: colors.primary }}
                      >
                        Academic Status
                      </th>
                      <th
                        className='px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider'
                        style={{ color: colors.primary }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-100'>
                    {students.map((student) => (
                      <tr
                        key={student.id}
                        className='hover:bg-gray-50 transition-colors'
                      >
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <span
                            className='font-medium'
                            style={{ color: colors.primary }}
                          >
                            {student.student_number}
                          </span>
                        </td>
                        <td className='px-6 py-4'>
                          <div>
                            <p
                              className='font-medium'
                              style={{ color: colors.primary }}
                            >
                              {student.first_name} {student.middle_name}{" "}
                              {student.last_name}
                            </p>
                            {student.email_address && (
                              <p className='text-xs text-gray-500'>
                                {student.email_address}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className='px-6 py-4'>
                          <div>
                            <p
                              className='text-sm font-medium'
                              style={{ color: colors.primary }}
                            >
                              {student.program?.name || "N/A"}
                            </p>
                            {student.major && (
                              <p className='text-xs text-gray-500'>
                                {student.major.name}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          <span className='text-sm text-gray-700'>
                            {student.year_level
                              ? `${student.year_level}${
                                  student.year_level === 1
                                    ? "st"
                                    : student.year_level === 2
                                      ? "nd"
                                      : student.year_level === 3
                                        ? "rd"
                                        : "th"
                                } Year`
                              : "N/A"}
                          </span>
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          {student.admission_status ? (
                            <span
                              className='inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium'
                              style={{
                                backgroundColor: colors.tertiary + "20",
                                color: colors.tertiary,
                              }}
                            >
                              {student.admission_status.charAt(0).toUpperCase() +
                                student.admission_status.slice(1)}
                            </span>
                          ) : (
                            <span className='text-sm text-gray-500'>N/A</span>
                          )}
                        </td>
                        <td className='px-6 py-4 whitespace-nowrap'>
                          {student.academic_status ? (
                            <span
                              className='inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium'
                              style={
                                student.academic_status.toLowerCase() ===
                                "regular"
                                  ? {
                                      backgroundColor: colors.primary + "20",
                                      color: colors.primary,
                                    }
                                  : {
                                      backgroundColor: colors.secondary + "20",
                                      color: colors.secondary,
                                    }
                              }
                            >
                              {student.academic_status.charAt(0).toUpperCase() +
                                student.academic_status.slice(1)}
                            </span>
                          ) : (
                            <span className='text-sm text-gray-500'>N/A</span>
                          )}
                        </td>
                        <td className='px-6 py-4 text-center'>
                          <button
                            onClick={() => handleViewStudent(student)}
                            className='inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all hover:shadow-lg'
                            style={{ backgroundColor: colors.secondary }}
                          >
                            <Eye size={16} />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {!isLoadingList && students.length > 0 && (
              <div className='px-6 py-4 border-t border-gray-100 flex items-center justify-between'>
                <div className='text-sm text-gray-600'>
                  Showing {(currentPage - 1) * limit + 1} to{" "}
                  {Math.min(currentPage * limit, totalCount)} of {totalCount}{" "}
                  students
                </div>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className='p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                    style={{
                      borderColor: colors.tertiary + "30",
                      color: colors.primary,
                    }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className='flex items-center gap-1'>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1
                      )
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className='px-2 text-gray-400'>...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className='px-4 py-2 rounded-lg font-medium transition-all'
                            style={
                              currentPage === page
                                ? {
                                    backgroundColor: colors.primary,
                                    color: "white",
                                  }
                                : {
                                    backgroundColor: "transparent",
                                    color: colors.primary,
                                  }
                            }
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                    className='p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                    style={{
                      borderColor: colors.tertiary + "30",
                      color: colors.primary,
                    }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 duration-500'>
            {/* Left Column: Profile & History */}
            <div className='lg:col-span-4 space-y-6'>
              {/* Profile Card */}
              <div
                className='bg-white rounded-2xl shadow-sm overflow-hidden'
                style={{
                  border: `1px solid ${colors.tertiary}20`,
                  boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
                }}
              >
                <div
                  className='h-24 relative'
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                  }}
                >
                  <div className='absolute -bottom-10 left-6'>
                    <div
                      className='w-20 h-20 rounded-2xl shadow-lg flex items-center justify-center text-2xl font-bold text-white border-4 border-white'
                      style={{ backgroundColor: colors.tertiary }}
                    >
                      {studentData.first_name[0]}
                      {studentData.last_name[0]}
                    </div>
                  </div>
                </div>
                <div className='pt-12 p-6'>
                  <h2
                    className='text-xl font-bold mb-1'
                    style={{ color: colors.primary }}
                  >
                    {studentData.first_name} {studentData.middle_name}{" "}
                    {studentData.last_name}
                  </h2>
                  <p className='text-sm font-medium text-gray-500 mb-4 flex items-center gap-2'>
                    <span
                      className='px-2 py-0.5 rounded text-xs font-semibold'
                      style={{
                        backgroundColor: colors.primary + "10",
                        color: colors.primary,
                      }}
                    >
                      {studentData.student_number}
                    </span>
                    {(() => {
                      const statusMeta = getEnrollmentStatusMeta(
                        studentData.status,
                      );
                      const StatusIcon = statusMeta.icon;

                      return (
                        <span
                          className={`text-xs flex items-center gap-1 ${statusMeta.textClassName}`}
                        >
                          <StatusIcon
                            size={12}
                            className={studentData.status === 4 ? "animate-spin" : ""}
                          />
                          {statusMeta.label}
                        </span>
                      );
                    })()}
                  </p>

                  {studentData.status === 3 ? (
                    <div
                      className='mb-6 rounded-xl border px-4 py-3'
                      style={{
                        backgroundColor: "#fef2f2",
                        borderColor: "#fecaca",
                        color: "#991b1b",
                      }}
                    >
                      <p className='text-sm font-semibold'>Dropped Out Status</p>
                      <p className='mt-1 text-xs leading-5'>
                        This student was marked as dropped out in the enrollment
                        record. Re-enrolling here will return the status to
                        Pending for review.
                      </p>
                    </div>
                  ) : null}

                  <div className='space-y-4'>
                    <div className='flex items-start gap-3 p-3 rounded-xl bg-gray-50'>
                      <School
                        size={18}
                        className='mt-0.5'
                        style={{ color: colors.tertiary }}
                      />
                      <div>
                        <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                          Program
                        </p>
                        <p
                          className='text-sm font-medium leading-tight mt-0.5'
                          style={{ color: colors.primary }}
                        >
                          {getProgramMajorDisplay()}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-start gap-3 p-3 rounded-xl bg-gray-50'>
                      <GraduationCap
                        size={18}
                        className='mt-0.5'
                        style={{ color: colors.tertiary }}
                      />
                      <div>
                        <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                          Year Level
                        </p>
                        <p
                          className='text-sm font-medium leading-tight mt-0.5'
                          style={{ color: colors.primary }}
                        >
                          {getYearLevelDisplay()}
                        </p>
                      </div>
                    </div>

                    <div className='grid grid-cols-1 gap-3'>
                      {studentData.email_address && (
                        <div className='flex items-center gap-3'>
                          <div
                            className='w-8 h-8 rounded-lg flex items-center justify-center'
                            style={{ backgroundColor: colors.paper }}
                          >
                            <Mail
                              size={16}
                              style={{ color: colors.tertiary }}
                            />
                          </div>
                          <div className='overflow-hidden'>
                            <p className='text-xs text-gray-500'>Email</p>
                            <p
                              className='text-sm font-medium truncate'
                              style={{ color: colors.primary }}
                            >
                              {studentData.email_address}
                            </p>
                          </div>
                        </div>
                      )}
                      {studentData.contact_number && (
                        <div className='flex items-center gap-3'>
                          <div
                            className='w-8 h-8 rounded-lg flex items-center justify-center'
                            style={{ backgroundColor: colors.paper }}
                          >
                            <Phone
                              size={16}
                              style={{ color: colors.tertiary }}
                            />
                          </div>
                          <div>
                            <p className='text-xs text-gray-500'>Contact</p>
                            <p
                              className='text-sm font-medium'
                              style={{ color: colors.primary }}
                            >
                              {studentData.contact_number}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Enrollment History */}
              <div
                className='bg-white rounded-2xl shadow-sm overflow-hidden'
                style={{
                  border: `1px solid ${colors.tertiary}20`,
                  boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
                }}
              >
                <div className='p-4 border-b border-gray-100 flex items-center justify-between'>
                  <h3
                    className='font-semibold flex items-center gap-2'
                    style={{ color: colors.primary }}
                  >
                    <History size={18} style={{ color: colors.secondary }} />
                    History
                  </h3>
                  <span
                    className='text-xs font-medium px-2 py-1 rounded-full'
                    style={{
                      backgroundColor: colors.paper,
                      color: colors.neutral,
                    }}
                  >
                    {enrollmentHistory.length} Records
                  </span>
                </div>
                <div className='max-h-[300px] overflow-y-auto p-2'>
                  {enrollmentHistory.length > 0 ? (
                    <div className='space-y-1'>
                      {enrollmentHistory.map((enrollment) => (
                        <div
                          key={enrollment.id}
                          className='p-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-between group'
                        >
                          <div>
                            <p
                              className='font-medium text-sm'
                              style={{ color: colors.primary }}
                            >
                              {formatTerm(enrollment.term)}
                            </p>
                            <p className='text-xs text-gray-500'>
                              {enrollment.admission_date
                                ? new Date(
                                    enrollment.admission_date,
                                  ).toLocaleDateString()
                                : "No date"}
                            </p>
                          </div>
                          <div
                            className='w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'
                            style={{ backgroundColor: colors.paper }}
                          >
                            <CheckCircle
                              size={14}
                              style={{ color: colors.success }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='p-6 text-center text-gray-500 text-sm'>
                      No enrollment history found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Re-enrollment Form */}
            <div className='lg:col-span-8'>
              <div
                className='bg-white rounded-2xl shadow-sm p-6 sm:p-8'
                style={{
                  border: `1px solid ${colors.tertiary}20`,
                  boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
                }}
              >
                <div className='mb-8'>
                  <h2
                    className='text-xl font-bold mb-2'
                    style={{ color: colors.primary }}
                  >
                    Re-enrollment Details
                  </h2>
                  <p className='text-gray-500'>
                    Update the student's enrollment information for the upcoming
                    term.
                  </p>
                  {studentData.status === 3 ? (
                    <div
                      className='mt-5 rounded-2xl border px-4 py-4'
                      style={{
                        backgroundColor: "#fff7ed",
                        borderColor: "#fdba74",
                      }}
                    >
                      <div className='flex items-start gap-3'>
                        <AlertCircle
                          size={18}
                          className='mt-0.5 shrink-0'
                          style={{ color: "#c2410c" }}
                        />
                        <div>
                          <p
                            className='text-sm font-semibold'
                            style={{ color: "#9a3412" }}
                          >
                            Student is currently marked as Dropped Out
                          </p>
                          <p
                            className='mt-1 text-xs leading-5'
                            style={{ color: "#9a3412" }}
                          >
                            Submitting this re-enrollment will move the
                            enrollment status to Pending (`4`) so the student
                            can go through the normal review flow again.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <form onSubmit={handleSubmit} className='space-y-8'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {/* Term Selection */}
                    <div className='space-y-2'>
                      <label
                        className='text-sm font-semibold flex items-center gap-2'
                        style={{ color: colors.primary }}
                      >
                        <Calendar
                          size={16}
                          style={{ color: colors.secondary }}
                        />
                        Term / Semester <span className='text-red-500'>*</span>
                      </label>
                      <div className='relative'>
                        <select
                          value={term}
                          onChange={(e) => setTerm(e.target.value)}
                          required
                          disabled={termLoading}
                          className='w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-4 appearance-none cursor-pointer bg-white'
                          style={{
                            borderColor: colors.tertiary + "30",
                            color: colors.primary,
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor =
                              colors.secondary;
                            e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor =
                              colors.tertiary + "30";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          {currentTerm && (
                            <option value={currentTerm.semesterCode}>
                              {currentTerm.semester} Semester (Current)
                            </option>
                          )}
                          {(!currentTerm ||
                            currentTerm.semesterCode !== "first") && (
                            <option value='first'>First Semester</option>
                          )}
                          {(!currentTerm ||
                            currentTerm.semesterCode !== "second") && (
                            <option value='second'>Second Semester</option>
                          )}
                        </select>
                        <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400'>
                          <ChevronRight size={16} className='rotate-90' />
                        </div>
                      </div>
                    </div>

                    {/* Academic Year */}
                    <div className='space-y-2'>
                      <label
                        className='text-sm font-semibold flex items-center gap-2'
                        style={{ color: colors.primary }}
                      >
                        <Calendar
                          size={16}
                          style={{ color: colors.secondary }}
                        />
                        Academic Year
                      </label>
                      <div className='relative'>
                        <select
                          value={academicYear}
                          onChange={(e) => setAcademicYear(e.target.value)}
                          disabled={termLoading}
                          className='w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-4 appearance-none cursor-pointer bg-white'
                          style={{
                            borderColor: colors.tertiary + "30",
                            color: colors.primary,
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor =
                              colors.secondary;
                            e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor =
                              colors.tertiary + "30";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          {currentTerm && (
                            <option value={currentTerm.academicYear}>
                              {currentTerm.academicYear} (Current)
                            </option>
                          )}
                          {Array.from({ length: 5 }, (_, i) => {
                            const startYear = new Date().getFullYear() - 1 + i;
                            const endYear = startYear + 1;
                            const academicYearValue = `${startYear}-${endYear}`;
                            if (
                              currentTerm &&
                              academicYearValue === currentTerm.academicYear
                            ) {
                              return null;
                            }
                            return (
                              <option
                                key={academicYearValue}
                                value={academicYearValue}
                              >
                                {academicYearValue}
                              </option>
                            );
                          })}
                        </select>
                        <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400'>
                          <ChevronRight size={16} className='rotate-90' />
                        </div>
                      </div>
                    </div>

                    {/* Year Level */}
                    <div className='space-y-2'>
                      <label
                        className='text-sm font-semibold flex items-center gap-2'
                        style={{ color: colors.primary }}
                      >
                        <School size={16} style={{ color: colors.secondary }} />
                        Year Level
                      </label>
                      <div className='relative'>
                        <select
                          value={yearLevel}
                          onChange={(e) =>
                            setYearLevel(parseInt(e.target.value))
                          }
                          className='w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-4 appearance-none cursor-pointer bg-white'
                          style={{
                            borderColor: colors.tertiary + "30",
                            color: colors.primary,
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor =
                              colors.secondary;
                            e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor =
                              colors.tertiary + "30";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <option value='1'>1st Year</option>
                          <option value='2'>2nd Year</option>
                          <option value='3'>3rd Year</option>
                          <option value='4'>4th Year</option>
                          <option value='5'>5th Year</option>
                        </select>
                        <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400'>
                          <ChevronRight size={16} className='rotate-90' />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='pt-6 border-t border-gray-100'>
                    <button
                      type='submit'
                      disabled={isSubmitting}
                      className='w-full py-4 rounded-xl font-bold text-white text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl active:scale-[0.99]'
                      style={{
                        background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.tertiary} 100%)`,
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className='w-6 h-6 animate-spin' />
                          Processing Re-enrollment...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={20} />
                          Update Re-enrollment
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title='Re-enrollment Submitted'
        message='Re-enrollment has been submitted successfully for this student.'
        autoClose={true}
        autoCloseDelay={5000}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showError}
        onClose={() => setShowError(false)}
        title='Submission Failed'
        message={errorMessage}
      />
    </div>
  );
}
