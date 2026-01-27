"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  User,
  Mail,
  Phone,
  Search,
  CheckCircle,
  Loader2,
  ChevronRight,
  History,
  School,
  LayoutDashboard,
} from "lucide-react";
import { colors } from "../colors";
import SuccessModal from "../components/common/SuccessModal";
import ErrorModal from "../components/common/ErrorModal";
import StudentSearchModal from "../components/common/StudentSearchModal";
import ProtectedRoute from "../components/ProtectedRoute";
import { formatTerm } from "../utils/termUtils";
import { useAcademicTerm } from "../hooks/useAcademicTerm";

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
  term?: string;
  academic_year?: string;
  admission_date?: string;
  admission_status?: string;
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
  admission_status: string;
  admission_date: string | null;
  department?: number;
  course_program?: string;
}

function ResidentPortalContent() {
  const router = useRouter();
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
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Academic Term hook
  const { currentTerm, loading: termLoading } = useAcademicTerm({ autoSync: true });

  // Form data
  const [enrollmentId, setEnrollmentId] = useState<number | null>(null);
  const [term, setTerm] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [admissionStatus, setAdmissionStatus] = useState("");

  const handleSearchStudent = async (studentNum?: string) => {
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
      const response = await fetch(
        `/api/students/${studentNumberToSearch}`,
      );
      if (response.ok) {
        const data = await response.json();
        setStudentData(data);
        setStudentNumber(studentNumberToSearch);
        setInputStudentNumber(studentNumberToSearch);
        setEnrollmentId(data.enrollment_id || null);
        // Pre-fill form with existing data
        // Set term and academic year from current term if not in data
        if (currentTerm && !data.term) {
          setTerm(currentTerm.semesterCode);
          setAcademicYear(currentTerm.academicYear);
        } else {
          setTerm(data.term || "");
          setAcademicYear(data.academic_year || "");
        }
        setAdmissionStatus(data.admission_status || "");
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

    // Term is optional for updates - only required for new enrollments
    // But we'll keep it as optional since we're updating existing records

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
          admission_status: admissionStatus || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowSuccess(true);
        // Refresh enrollment history and reload student data
        fetchEnrollmentHistory(studentNumber);
        handleSearchStudent(studentNumber);
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
    setAdmissionStatus("");
    setErrorMessage("");
    setShowError(false);
  };

  // Update term and academic year when currentTerm changes
  useEffect(() => {
    if (currentTerm && !studentData) {
      setTerm(currentTerm.semesterCode);
      setAcademicYear(currentTerm.academicYear);
    }
  }, [currentTerm, studentData]);

  // Get Program/Major display text
  const getProgramMajorDisplay = () => {
    if (!studentData) return "N/A";

    const programName = studentData.program?.name || studentData.program?.code || "";
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
          </div>
        </div>

        {/* Search Section */}
        <div
          className={`bg-white rounded-2xl transition-all duration-300 ${studentData ? "p-4" : "p-8 sm:p-12"
            }`}
          style={{
            border: `1px solid ${colors.tertiary}20`,
            boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
          }}
        >
          {!studentData && (
            <div className='text-center mb-8'>
              <div
                className='w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4'
                style={{ backgroundColor: colors.primary + "10" }}
              >
                <Search size={32} style={{ color: colors.primary }} />
              </div>
              <h2
                className='text-xl font-semibold mb-2'
                style={{ color: colors.primary }}
              >
                Find Student
              </h2>
              <p className='text-gray-500 max-w-md mx-auto'>
                Enter a student number to view their profile and process
                re-enrollment.
              </p>
            </div>
          )}

          <div className={`max-w-2xl mx-auto ${studentData ? "" : "mb-4"}`}>
            <div className='flex gap-3'>
              <div className='flex-1 relative group'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <Search
                    className='h-5 w-5 transition-colors'
                    style={{ color: colors.tertiary }}
                  />
                </div>
                <input
                  type='text'
                  value={inputStudentNumber}
                  onChange={(e) => setInputStudentNumber(e.target.value)}
                  onClick={() => setShowSearchModal(true)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleSearchStudent();
                    }
                  }}
                  placeholder='Enter Student Number (e.g. 26-00001)'
                  className='w-full pl-12 pr-4 py-3.5 rounded-xl border transition-all focus:outline-none focus:ring-4 text-lg'
                  style={{
                    borderColor: colors.tertiary + "30",
                    color: colors.primary,
                    backgroundColor: colors.paper,
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
              <button
                onClick={() => handleSearchStudent()}
                disabled={isLoading || !inputStudentNumber.trim()}
                className='px-8 py-3.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl active:scale-95'
                style={{ backgroundColor: colors.primary }}
              >
                {isLoading ? (
                  <Loader2 className='w-5 h-5 animate-spin' />
                ) : (
                  <Search size={20} />
                )}
                <span className='hidden sm:inline'>Search</span>
              </button>
            </div>
          </div>

          {studentData && (
            <div className="flex justify-center mt-4 pt-4 border-t border-dashed" style={{ borderColor: colors.tertiary + '30' }}>
              <button
                onClick={handleClear}
                className='text-sm font-medium hover:underline flex items-center gap-1'
                style={{ color: colors.secondary }}
              >
                <Search size={14} />
                Search for another student
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && !studentData && (
          <div className='flex flex-col items-center justify-center py-12 animate-in fade-in'>
            <Loader2
              className='w-12 h-12 animate-spin mb-4'
              style={{ color: colors.secondary }}
            />
            <p className='text-gray-500 font-medium'>Loading student data...</p>
          </div>
        )}

        {/* Main Content Grid */}
        {studentData && (
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
                  <p className='text-sm font-medium text-gray-500 mb-6 flex items-center gap-2'>
                    <span
                      className='px-2 py-0.5 rounded text-xs font-semibold'
                      style={{
                        backgroundColor: colors.primary + "10",
                        color: colors.primary,
                      }}
                    >
                      {studentData.student_number}
                    </span>
                    {studentData.status === 1 ? (
                      <span className='text-green-600 text-xs flex items-center gap-1'>
                        <CheckCircle size={12} /> Active
                      </span>
                    ) : (
                      <span className='text-gray-500 text-xs'>Inactive</span>
                    )}
                  </p>

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

                    <div className='grid grid-cols-1 gap-3'>
                      {studentData.email_address && (
                        <div className='flex items-center gap-3'>
                          <div
                            className='w-8 h-8 rounded-lg flex items-center justify-center'
                            style={{ backgroundColor: colors.paper }}
                          >
                            <Mail size={16} style={{ color: colors.tertiary }} />
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
                            <Phone size={16} style={{ color: colors.tertiary }} />
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
                </div>

                <form onSubmit={handleSubmit} className='space-y-8'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {/* Term Selection */}
                    <div className='space-y-2'>
                      <label
                        className='text-sm font-semibold flex items-center gap-2'
                        style={{ color: colors.primary }}
                      >
                        <Calendar size={16} style={{ color: colors.secondary }} />
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
                            e.currentTarget.style.borderColor = colors.secondary;
                            e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor =
                              colors.tertiary + "30";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <option value=''>Select Term</option>
                          {currentTerm && (
                            <option value={currentTerm.semesterCode}>
                              {currentTerm.semester} Semester (Current)
                            </option>
                          )}
                          <option value='first'>First Semester</option>
                          <option value='second'>Second Semester</option>
                          <option value='summer'>Summer</option>
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
                        <Calendar size={16} style={{ color: colors.secondary }} />
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
                            e.currentTarget.style.borderColor = colors.secondary;
                            e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor =
                              colors.tertiary + "30";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <option value=''>Select Academic Year</option>
                          {currentTerm && (
                            <option value={currentTerm.academicYear}>
                              {currentTerm.academicYear} (Current)
                            </option>
                          )}
                          {Array.from({ length: 5 }, (_, i) => {
                            const startYear = new Date().getFullYear() - 1 + i;
                            const endYear = startYear + 1;
                            const academicYearValue = `${startYear}-${endYear}`;
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

                    {/* Admission Status */}
                    <div className='space-y-2 md:col-span-2'>
                      <label
                        className='text-sm font-semibold flex items-center gap-2'
                        style={{ color: colors.primary }}
                      >
                        <User size={16} style={{ color: colors.secondary }} />
                        Admission Status
                      </label>
                      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                        {["new", "transferee", "returning"].map((status) => (
                          <label
                            key={status}
                            className={`relative flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${admissionStatus === status
                              ? "bg-orange-50"
                              : "bg-white hover:bg-gray-50"
                              }`}
                            style={{
                              borderColor:
                                admissionStatus === status
                                  ? colors.secondary
                                  : colors.tertiary + "30",
                            }}
                          >
                            <input
                              type='radio'
                              name='admissionStatus'
                              value={status}
                              checked={admissionStatus === status}
                              onChange={(e) => setAdmissionStatus(e.target.value)}
                              className='sr-only'
                            />
                            <span
                              className='font-medium capitalize'
                              style={{
                                color:
                                  admissionStatus === status
                                    ? colors.secondary
                                    : colors.primary,
                              }}
                            >
                              {status}
                            </span>
                            {admissionStatus === status && (
                              <div className='absolute top-2 right-2'>
                                <CheckCircle
                                  size={16}
                                  style={{ color: colors.secondary }}
                                />
                              </div>
                            )}
                          </label>
                        ))}
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

      {/* Student Search Modal */}
      <StudentSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelect={handleStudentSelect}
      />
    </div>
  );
}

export default function ResidentPortal() {
  return (
    <ProtectedRoute>
      <ResidentPortalContent />
    </ProtectedRoute>
  );
}

// Export content component for use in dashboard
export { ResidentPortalContent };
