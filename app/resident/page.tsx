"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Calendar, User, Mail, Phone, MapPin, Users, FileText, Search, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { colors } from "../colors";
import SuccessModal from "../components/common/SuccessModal";
import ErrorModal from "../components/common/ErrorModal";
import ProtectedRoute from "../components/ProtectedRoute";
import { formatTerm } from "../utils/termUtils";

interface StudentData {
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
  const [enrollmentHistory, setEnrollmentHistory] = useState<EnrollmentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form data
  const [term, setTerm] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [completeAddress, setCompleteAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [emergencyContactNumber, setEmergencyContactNumber] = useState("");
  const [remarks, setRemarks] = useState("");

  const handleSearchStudent = async () => {
    if (!inputStudentNumber.trim()) {
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
      const response = await fetch(`/api/students/${inputStudentNumber.trim()}`);
      if (response.ok) {
        const data = await response.json();
        setStudentData(data);
        setStudentNumber(inputStudentNumber.trim());
        // Pre-fill form with existing data
        setContactNumber(data.contact_number || "");
        setEmailAddress(data.email_address || "");
        setCompleteAddress(data.complete_address || "");
        setEmergencyContactName(data.emergency_contact_name || "");
        setEmergencyRelationship(data.emergency_relationship || "");
        setEmergencyContactNumber(data.emergency_contact_number || "");
        // Fetch enrollment history
        fetchEnrollmentHistory(inputStudentNumber.trim());
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.error || "Student not found. Please check the student number.");
        setShowError(true);
      }
    } catch (error) {
      setErrorMessage("An error occurred while loading student data");
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };


  const fetchEnrollmentHistory = async (studentNum: string) => {
    try {
      const response = await fetch(`/api/auth/resident/enrollments?student_number=${studentNum}`);
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

    if (!term.trim()) {
      setErrorMessage("Please select a term");
      setShowError(true);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/resident/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_number: studentNumber,
          term: term,
          academic_year: academicYear,
          contact_number: contactNumber,
          email_address: emailAddress,
          complete_address: completeAddress,
          emergency_contact_name: emergencyContactName,
          emergency_relationship: emergencyRelationship,
          emergency_contact_number: emergencyContactNumber,
          department: studentData?.department,
          course_program: studentData?.course_program,
          remarks: remarks,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowSuccess(true);
        // Refresh enrollment history
        fetchEnrollmentHistory(studentNumber);
        // Reset form
        setTerm("");
        setAcademicYear("");
        setRemarks("");
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
    setTerm("");
    setAcademicYear("");
    setContactNumber("");
    setEmailAddress("");
    setCompleteAddress("");
    setEmergencyContactName("");
    setEmergencyRelationship("");
    setEmergencyContactNumber("");
    setRemarks("");
    setErrorMessage("");
    setShowError(false);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: colors.paper }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.primary + "10" }}>
              <GraduationCap size={24} style={{ color: colors.primary }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: colors.primary }}>
                Resident Student Re-enrollment
              </h1>
              <p className="text-sm text-gray-600">Enter student number to process re-enrollment</p>
            </div>
          </div>

          {/* Student Number Search */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6" style={{ border: `1px solid ${colors.tertiary}30` }}>
            <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>
              Student Number
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5" style={{ color: colors.tertiary }} />
                </div>
                <input
                  type="text"
                  value={inputStudentNumber}
                  onChange={(e) => setInputStudentNumber(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleSearchStudent();
                    }
                  }}
                  placeholder="e.g. 26-00001"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2"
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
              <button
                onClick={handleSearchStudent}
                disabled={isLoading || !inputStudentNumber.trim()}
                className="px-6 py-3 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ backgroundColor: colors.secondary }}
                onMouseEnter={(e) => {
                  if (!isLoading && inputStudentNumber.trim()) {
                    e.currentTarget.style.backgroundColor = colors.tertiary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && inputStudentNumber.trim()) {
                    e.currentTarget.style.backgroundColor = colors.secondary;
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Search
                  </>
                )}
              </button>
              {studentData && (
                <button
                  onClick={handleClear}
                  className="px-4 py-3 rounded-lg font-medium transition-colors"
                  style={{ color: colors.primary, border: `1px solid ${colors.tertiary}30` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.tertiary + "10";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {!studentData && !isLoading && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center" style={{ border: `1px solid ${colors.tertiary}30` }}>
            <GraduationCap size={64} className="mx-auto mb-4" style={{ color: colors.tertiary, opacity: 0.5 }} />
            <p className="text-gray-600">Enter a student number above to begin re-enrollment</p>
          </div>
        )}

        {isLoading && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center" style={{ border: `1px solid ${colors.tertiary}30` }}>
            <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: colors.secondary }}></div>
            <p style={{ color: colors.primary }}>Loading student data...</p>
          </div>
        )}

        {studentData && (

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6" style={{ border: `1px solid ${colors.tertiary}30` }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
                Student Information
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User size={18} className="mt-0.5" style={{ color: colors.tertiary }} />
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium" style={{ color: colors.primary }}>
                      {studentData.first_name} {studentData.middle_name} {studentData.last_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText size={18} className="mt-0.5" style={{ color: colors.tertiary }} />
                  <div>
                    <p className="text-sm text-gray-600">Student Number</p>
                    <p className="font-medium" style={{ color: colors.primary }}>
                      {studentData.student_number}
                    </p>
                  </div>
                </div>
                {studentData.email_address && (
                  <div className="flex items-start gap-3">
                    <Mail size={18} className="mt-0.5" style={{ color: colors.tertiary }} />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-sm" style={{ color: colors.primary }}>
                        {studentData.email_address}
                      </p>
                    </div>
                  </div>
                )}
                {studentData.contact_number && (
                  <div className="flex items-start gap-3">
                    <Phone size={18} className="mt-0.5" style={{ color: colors.tertiary }} />
                    <div>
                      <p className="text-sm text-gray-600">Contact</p>
                      <p className="font-medium text-sm" style={{ color: colors.primary }}>
                        {studentData.contact_number}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enrollment History */}
            {enrollmentHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6" style={{ border: `1px solid ${colors.tertiary}30` }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>
                  Enrollment History
                </h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {enrollmentHistory.map((enrollment) => (
                    <div
                      key={enrollment.id}
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: colors.paper, border: `1px solid ${colors.tertiary}20` }}
                    >
                      <p className="font-medium text-sm" style={{ color: colors.primary }}>
                        {(() => {
                          const termFormatted = formatTerm(enrollment.term);
                          // Add "Semester" to First and Second, keep Summer as is
                          if (termFormatted === "First" || termFormatted === "Second") {
                            return `${termFormatted} Semester`;
                          }
                          return termFormatted;
                        })()}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {enrollment.admission_date 
                          ? new Date(enrollment.admission_date).toLocaleDateString()
                          : "No date available"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Re-enrollment Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6" style={{ border: `1px solid ${colors.tertiary}30` }}>
              <h2 className="text-xl font-semibold mb-6" style={{ color: colors.primary }}>
                Re-enrollment Form
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Term and Academic Year */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>
                      <Calendar size={16} className="inline mr-2" style={{ color: colors.secondary }} />
                      Term <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      required
                      className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
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
                      <option value="">Select Term</option>
                      <option value="first">First</option>
                      <option value="second">Second</option>
                      <option value="summer">Summer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>
                      Academic Year
                    </label>
                    <div className="relative">
                      <select
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2 appearance-none cursor-pointer"
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
                        <option value="">Select Academic Year</option>
                        {Array.from({ length: 10 }, (_, i) => {
                          const startYear = new Date().getFullYear() + i;
                          const endYear = startYear + 1;
                          const academicYearValue = `${startYear}-${endYear}`;
                          return (
                            <option key={academicYearValue} value={academicYearValue}>
                              {academicYearValue}
                            </option>
                          );
                        })}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-md font-semibold mb-4" style={{ color: colors.primary }}>
                    Update Contact Information (Optional)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>
                        <Phone size={16} className="inline mr-2" style={{ color: colors.secondary }} />
                        Contact Number
                      </label>
                      <input
                        type="text"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
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

                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>
                        <Mail size={16} className="inline mr-2" style={{ color: colors.secondary }} />
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
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
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>
                      <MapPin size={16} className="inline mr-2" style={{ color: colors.secondary }} />
                      Complete Address
                    </label>
                    <textarea
                      value={completeAddress}
                      onChange={(e) => setCompleteAddress(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
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
                </div>

                {/* Emergency Contact */}
                <div>
                  <h3 className="text-md font-semibold mb-4" style={{ color: colors.primary }}>
                    Emergency Contact (Optional)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>
                        <Users size={16} className="inline mr-2" style={{ color: colors.secondary }} />
                        Name
                      </label>
                      <input
                        type="text"
                        value={emergencyContactName}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
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

                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>
                        Relationship
                      </label>
                      <input
                        type="text"
                        value={emergencyRelationship}
                        onChange={(e) => setEmergencyRelationship(e.target.value)}
                        placeholder="e.g. Parent, Guardian"
                        className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
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

                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>
                        Contact Number
                      </label>
                      <input
                        type="text"
                        value={emergencyContactNumber}
                        onChange={(e) => setEmergencyContactNumber(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
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
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>
                    Remarks (Optional)
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                    placeholder="Any additional notes or information..."
                    className="w-full px-4 py-2 rounded-lg border transition-all focus:outline-none focus:ring-2"
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

                {/* Submit Button */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ backgroundColor: colors.secondary }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.backgroundColor = colors.tertiary;
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = `0 4px 12px ${colors.secondary}40`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.backgroundColor = colors.secondary;
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        Submit Re-enrollment
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
        title="Re-enrollment Submitted"
        message="Re-enrollment has been submitted successfully for this student."
        autoClose={true}
        autoCloseDelay={5000}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showError}
        onClose={() => setShowError(false)}
        title="Submission Failed"
        message={errorMessage}
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

