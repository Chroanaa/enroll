"use client";
import React, { useState, useEffect } from "react";
import { Calculator, User, GraduationCap, FileText, DollarSign, CreditCard, Calendar, Receipt, BookOpen, CheckCircle2, ListChecks, Plus, X, Search, Save } from "lucide-react";
import { colors } from "../colors";
import { defaultFormStyles } from "../utils/formStyles";
import { useAcademicTerm } from "../hooks/useAcademicTerm";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";

interface Fee {
  id: number;
  code: string;
  name: string;
  amount: number;
  category: string;
  status?: string;
}

interface PaymentDetail {
  paymentDate: string;
  orNumber: string;
  amountPaid: number;
  balance: number;
}

interface EnrolledSubject {
  id: number;
  curriculum_id: number;
  subject_id?: number;
  course_code: string;
  descriptive_title: string;
  units_lec?: number;
  units_lab?: number;
  units_total: number;
  lecture_hour?: number;
  lab_hour?: number;
  prerequisite?: string;
  year_level: number;
  semester: number;
  subject?: {
    id: number;
    code: string;
    name: string;
  };
}

const AssessmentManagement: React.FC = () => {
  const { currentTerm, loading: termLoading } = useAcademicTerm();
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);

  // Form data
  const [studentName, setStudentName] = useState("");
  const [program, setProgram] = useState("");
  const [programId, setProgramId] = useState<number | null>(null);
  const [studentNumber, setStudentNumber] = useState("");
  const [tuitionPerUnit, setTuitionPerUnit] = useState("570");
  const [totalUnits, setTotalUnits] = useState(0);
  const [isFetchingStudent, setIsFetchingStudent] = useState(false);
  const [studentFetchError, setStudentFetchError] = useState("");

  // Enrolled Subjects
  const [enrolledSubjects, setEnrolledSubjects] = useState<EnrolledSubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");

  // Student Type Detection
  const [isResidentReturnee, setIsResidentReturnee] = useState(false);
  const [isEditingSubjects, setIsEditingSubjects] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<EnrolledSubject[]>([]);
  const [showSubjectSelector, setShowSubjectSelector] = useState(false);
  const [subjectSearchTerm, setSubjectSearchTerm] = useState("");

  // Tab Management
  const [activeTab, setActiveTab] = useState<"subjects" | "payment" | "schedule" | "details">("subjects");

  // Cash Basis
  const [tuition, setTuition] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [netTuition, setNetTuition] = useState(0);
  const [dynamicFees, setDynamicFees] = useState<{ [key: number]: number }>({});
  const [totalFees, setTotalFees] = useState(0);

  // Installment Basis
  const [downPayment, setDownPayment] = useState(0);
  const [net, setNet] = useState(0);
  const [insuranceCharge, setInsuranceCharge] = useState(0);
  const [totalInstallment, setTotalInstallment] = useState(0);

  // Payment Details
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([]);

  // Mode of Payment
  const [prelimDate, setPrelimDate] = useState("");
  const [prelimAmount, setPrelimAmount] = useState(0);
  const [midtermDate, setMidtermDate] = useState("");
  const [midtermAmount, setMidtermAmount] = useState(0);
  const [finalsDate, setFinalsDate] = useState("");
  const [finalsAmount, setFinalsAmount] = useState(0);

  // Modal states
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: "",
  });

  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    details?: string;
  }>({
    isOpen: false,
    message: "",
    details: "",
  });

  useEffect(() => {
    fetchFees();
  }, []);

  // Initialize dynamic fees from database when fees are loaded
  useEffect(() => {
    if (fees.length > 0) {
      const initialFees: { [key: number]: number } = {};
      fees
        .filter((fee) => fee.status === "active" && fee.category.toLowerCase() !== "tuition")
        .forEach((fee) => {
          initialFees[fee.id] = Number(fee.amount);
        });
      setDynamicFees(initialFees);
    }
  }, [fees]);

  // Function to fetch student information by student number
  const fetchStudentByNumber = async (studentNum: string) => {
    if (!studentNum.trim()) {
      setStudentFetchError("");
      return;
    }

    setIsFetchingStudent(true);
    setStudentFetchError("");

    try {
      const response = await fetch(`/api/students/${studentNum.trim()}`);
      if (response.ok) {
        const data = await response.json();
        
        // Construct student name from available fields
        let fullName = "";
        if (data.first_name || data.last_name) {
          const parts = [
            data.first_name || "",
            data.middle_name || "",
            data.last_name || "",
            data.suffix || ""
          ].filter(Boolean);
          fullName = parts.join(" ");
        }
        
        // Set student name if available
        if (fullName) {
          setStudentName(fullName);
        }
        
        // Set program from joined program table data - display only the code
        if (data.program && data.program.code) {
          // Use the program code from the joined program table
          setProgram(data.program.code);
          setProgramId(data.program.id);
        } else {
          // If no program data, clear program fields
          setProgram("");
          setProgramId(null);
        }

        // Check if student is resident/returnee using comprehensive check
        try {
          const statusResponse = await fetch(`/api/auth/students/check-status?studentNumber=${studentNum.trim()}`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.success && statusData.data) {
              // Set resident/returnee status based on comprehensive check
              setIsResidentReturnee(statusData.data.isResidentReturnee);
              console.log("Student Status Check:", {
                isResidentReturnee: statusData.data.isResidentReturnee,
                admissionStatus: statusData.data.admissionStatus,
                hasEnrolledSubjects: statusData.data.hasEnrolledSubjects,
              });
            }
          }
        } catch (err) {
          console.error("Error checking student status:", err);
          // If check fails, assume new student
          setIsResidentReturnee(false);
        }
      } else {
        const errorData = await response.json();
        setStudentFetchError(errorData.error || "Student not found");
        // Clear fields if student not found
        setStudentName("");
        setProgram("");
        setProgramId(null);
        setEnrolledSubjects([]);
        setTotalUnits(0);
        setIsResidentReturnee(false);
      }
    } catch (error) {
      console.error("Error fetching student:", error);
      setStudentFetchError("Failed to fetch student information");
      setStudentName("");
      setProgram("");
      setProgramId(null);
      setEnrolledSubjects([]);
      setTotalUnits(0);
      setIsResidentReturnee(false);
    } finally {
      setIsFetchingStudent(false);
    }
  };

  // Fetch enrolled subjects based on program and current semester
  const fetchEnrolledSubjects = async (programIdValue: number, semesterNum: number) => {
    if (!programIdValue || !semesterNum) {
      return;
    }

    setIsLoadingSubjects(true);
    setSubjectsError("");

    try {
      // For resident/returnee, first check enrolled_subjects table
      // If empty, populate with curriculum subjects
      if (isResidentReturnee && studentNumber && currentTerm) {
        // First, check if student has existing enrolled subjects
        const enrolledResponse = await fetch(
          `/api/auth/enrolled-subjects?studentNumber=${studentNumber}&academicYear=${currentTerm.academicYear}&semester=${semesterNum}`
        );

        if (enrolledResponse.ok) {
          const enrolledData = await enrolledResponse.json();
          if (enrolledData.success && enrolledData.data && enrolledData.data.length > 0) {
            // Student has existing enrolled subjects, use them
            setEnrolledSubjects(enrolledData.data);
            const total = enrolledData.data.reduce(
              (sum: number, course: EnrolledSubject) => sum + (course.units_total || 0),
              0
            );
            setTotalUnits(total);
          } else {
            // No enrolled subjects found, fetch from curriculum and populate
            const curriculumResponse = await fetch(
              `/api/auth/curriculum/subjects?programId=${programIdValue}&semester=${semesterNum}`
            );

            if (curriculumResponse.ok) {
              const curriculumData = await curriculumResponse.json();
              if (curriculumData.success && curriculumData.data.courses) {
                // Populate with curriculum subjects as starting point
                setEnrolledSubjects(curriculumData.data.courses);
                const total = curriculumData.data.courses.reduce(
                  (sum: number, course: EnrolledSubject) => sum + (course.units_total || 0),
                  0
                );
                setTotalUnits(total);
                
                // Optionally auto-save to enrolled_subjects table
                // (Admin can modify later)
                try {
                  await fetch("/api/auth/enrolled-subjects", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      studentNumber,
                      programId: programIdValue,
                      academicYear: currentTerm.academicYear,
                      semester: semesterNum,
                      subjects: curriculumData.data.courses,
                    }),
                  });
                } catch (saveError) {
                  console.error("Error auto-saving curriculum subjects:", saveError);
                  // Don't show error to user, they can save manually later
                }
              } else {
                setSubjectsError("No subjects found in curriculum for this program and semester");
                setEnrolledSubjects([]);
                setTotalUnits(0);
              }
            } else {
              const errorData = await curriculumResponse.json();
              setSubjectsError(errorData.error || "Failed to fetch curriculum subjects");
              setEnrolledSubjects([]);
              setTotalUnits(0);
            }
          }
        } else {
          // If enrolled subjects fetch fails, fallback to curriculum
          const curriculumResponse = await fetch(
            `/api/auth/curriculum/subjects?programId=${programIdValue}&semester=${semesterNum}`
          );

          if (curriculumResponse.ok) {
            const curriculumData = await curriculumResponse.json();
            if (curriculumData.success && curriculumData.data.courses) {
              setEnrolledSubjects(curriculumData.data.courses);
              const total = curriculumData.data.courses.reduce(
                (sum: number, course: EnrolledSubject) => sum + (course.units_total || 0),
                0
              );
              setTotalUnits(total);
            }
          }
        }
      } else {
        // New student - fetch from curriculum
        const response = await fetch(
          `/api/auth/curriculum/subjects?programId=${programIdValue}&semester=${semesterNum}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.courses) {
            setEnrolledSubjects(data.data.courses);
            // Calculate total units
            const total = data.data.courses.reduce(
              (sum: number, course: EnrolledSubject) => sum + (course.units_total || 0),
              0
            );
            setTotalUnits(total);
          } else {
            setSubjectsError("No subjects found for this program and semester");
            setEnrolledSubjects([]);
            setTotalUnits(0);
          }
        } else {
          const errorData = await response.json();
          setSubjectsError(errorData.error || "Failed to fetch subjects");
          setEnrolledSubjects([]);
          setTotalUnits(0);
        }
      }
    } catch (error) {
      console.error("Error fetching enrolled subjects:", error);
      setSubjectsError("Failed to fetch enrolled subjects");
      setEnrolledSubjects([]);
      setTotalUnits(0);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  // Fetch available subjects from curriculum for adding
  const fetchAvailableSubjects = async (programIdValue: number, semesterNum: number) => {
    if (!programIdValue || !semesterNum) return;

    try {
      const response = await fetch(
        `/api/auth/curriculum/subjects?programId=${programIdValue}&semester=${semesterNum}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.courses) {
          // Filter out subjects that are already enrolled
          const enrolledIds = enrolledSubjects.map(s => s.id);
          const available = data.data.courses.filter(
            (course: EnrolledSubject) => !enrolledIds.includes(course.id)
          );
          setAvailableSubjects(available);
        }
      }
    } catch (error) {
      console.error("Error fetching available subjects:", error);
    }
  };

  // Save enrolled subjects for resident/returnee
  const saveEnrolledSubjects = async () => {
    if (!studentNumber || !programId || !currentTerm) {
      setErrorModal({
        isOpen: true,
        message: "Please enter student information first",
      });
      return;
    }

    try {
      const semesterNum = currentTerm.semester === "First" ? 1 : 2;
      const response = await fetch("/api/auth/enrolled-subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentNumber,
          programId,
          academicYear: currentTerm.academicYear,
          semester: semesterNum,
          subjects: enrolledSubjects,
        }),
      });

      if (response.ok) {
        setSuccessModal({
          isOpen: true,
          message: "Enrolled subjects saved successfully!",
        });
        setIsEditingSubjects(false);
      } else {
        const errorData = await response.json();
        setErrorModal({
          isOpen: true,
          message: errorData.error || "Failed to save enrolled subjects",
        });
      }
    } catch (error) {
      console.error("Error saving enrolled subjects:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to save enrolled subjects",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  // Add subject to enrolled list
  const addSubject = (subject: EnrolledSubject) => {
    setEnrolledSubjects([...enrolledSubjects, subject]);
    setShowSubjectSelector(false);
    setSubjectSearchTerm("");
    // Recalculate total units
    const total = [...enrolledSubjects, subject].reduce(
      (sum: number, course: EnrolledSubject) => sum + (course.units_total || 0),
      0
    );
    setTotalUnits(total);
  };

  // Remove subject from enrolled list
  const removeSubject = (subjectId: number) => {
    const updated = enrolledSubjects.filter(s => s.id !== subjectId);
    setEnrolledSubjects(updated);
    // Recalculate total units
    const total = updated.reduce(
      (sum: number, course: EnrolledSubject) => sum + (course.units_total || 0),
      0
    );
    setTotalUnits(total);
  };

  // Fetch subjects when program ID and current term are available
  useEffect(() => {
    if (programId && currentTerm) {
      // Map semester: "First" -> 1, "Second" -> 2
      const semesterNum = currentTerm.semester === "First" ? 1 : 2;
      fetchEnrolledSubjects(programId, semesterNum);
    } else {
      setEnrolledSubjects([]);
      setTotalUnits(0);
    }
  }, [programId, currentTerm, isResidentReturnee, studentNumber]);

  // Fetch available subjects when editing mode is enabled
  useEffect(() => {
    if (isEditingSubjects && programId && currentTerm) {
      const semesterNum = currentTerm.semester === "First" ? 1 : 2;
      fetchAvailableSubjects(programId, semesterNum);
    }
  }, [isEditingSubjects, programId, currentTerm]);

  // Handle student number change with debounce
  useEffect(() => {
    if (studentNumber.trim()) {
      const timeoutId = setTimeout(() => {
        fetchStudentByNumber(studentNumber);
      }, 500); // Wait 500ms after user stops typing

      return () => clearTimeout(timeoutId);
    } else {
      // Clear fields if student number is empty
      setStudentName("");
      setProgram("");
      setStudentFetchError("");
    }
  }, [studentNumber]);

  // Calculate tuition based on total units when totalUnits changes
  useEffect(() => {
    if (totalUnits > 0 && tuitionPerUnit) {
      const tuitionAmount = totalUnits * parseFloat(tuitionPerUnit);
      setTuition(tuitionAmount);
    } else if (totalUnits === 0) {
      setTuition(0);
    }
  }, [totalUnits, tuitionPerUnit]);

  useEffect(() => {
    // Calculate net tuition
    const net = tuition - discount;
    setNetTuition(net);

    // Calculate total of dynamic fees
    const dynamicFeesTotal = Object.values(dynamicFees).reduce((sum, amount) => sum + amount, 0);

    // Calculate total fees (cash basis)
    const total = net + dynamicFeesTotal;
    setTotalFees(total);

    // Calculate installment basis
    const installmentNet = total - downPayment;
    setNet(installmentNet);
    const insurance = installmentNet * 0.05;
    setInsuranceCharge(insurance);
    setTotalInstallment(installmentNet + insurance);
  }, [tuition, discount, dynamicFees, downPayment]);

  const fetchFees = async () => {
    try {
      const response = await fetch("/api/auth/fees");
      const data = await response.json();
      setFees(data || []);
    } catch (error) {
      console.error("Error fetching fees:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 min-h-screen" style={{ background: colors.paper }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    );
  }

  const inputClasses = "w-full px-4 py-3 rounded-xl border bg-white/50 transition-all duration-300 focus:ring-2 focus:ring-offset-0 outline-none";

  return (
    <div className="p-4 sm:p-6 min-h-screen" style={{ background: colors.paper }}>
      <style>{defaultFormStyles}</style>
      <div className="max-w-7xl mx-auto w-full">
        <div className="mb-10 animate-in fade-in slide-in-from-top-8 duration-700">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="p-3 rounded-2xl shadow-sm transform transition-transform hover:scale-105 duration-300"
              style={{
                backgroundColor: "white",
                border: `1px solid ${colors.accent}20`
              }}
            >
              <Calculator
                className="w-6 h-6"
                style={{ color: colors.secondary }}
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2 tracking-tight" style={{ color: colors.primary }}>
                Assessment Management
              </h1>
              <p className="text-base font-medium max-w-2xl leading-relaxed" style={{ color: colors.tertiary }}>
                Record and handle student tuition details based on enrolled courses, unit costs, and applicable miscellaneous fees
              </p>
            </div>
          </div>
        </div>

        {/* Student Information Card - Always Visible */}
        <div
          className="rounded-2xl shadow-lg p-6 mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-100"
          style={{
            backgroundColor: "white",
            border: `1px solid ${colors.accent}30`,
          }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div
              className="p-2 rounded-xl shadow-sm"
              style={{
                backgroundColor: `${colors.secondary}15`,
              }}
            >
              <User
                className="w-5 h-5"
                style={{ color: colors.secondary }}
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold tracking-tight" style={{ color: colors.primary }}>
                Student Information
              </h2>
              <p className="text-xs mt-0.5 font-medium" style={{ color: colors.tertiary }}>
                Enter student details for assessment
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1" style={{ color: colors.primary }}>
                <FileText className="w-4 h-4" style={{ color: colors.secondary }} />
                Student Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  className={inputClasses}
                  style={{
                    borderColor: studentFetchError ? "#ef4444" : colors.tertiary + "30",
                    color: colors.primary
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = studentFetchError ? "#ef4444" : colors.tertiary + "30";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  placeholder="Enter student number"
                />
                {isFetchingStudent && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                  </div>
                )}
              </div>
              {studentFetchError && (
                <p className="text-xs text-red-500 mt-1 ml-1">{studentFetchError}</p>
              )}
            </div>
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1" style={{ color: colors.primary }}>
                <User className="w-4 h-4" style={{ color: colors.secondary }} />
                Student Name
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className={inputClasses}
                style={{
                  borderColor: colors.tertiary + "30",
                  color: colors.primary
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.secondary;
                  e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.tertiary + "30";
                  e.currentTarget.style.boxShadow = "none";
                }}
                placeholder="Enter student name"
              />
            </div>
            <div className="group">
              <label className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1" style={{ color: colors.primary }}>
                <GraduationCap className="w-4 h-4" style={{ color: colors.secondary }} />
                Program
              </label>
              <input
                type="text"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className={inputClasses}
                style={{
                  borderColor: colors.tertiary + "30",
                  color: colors.primary
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.secondary;
                  e.currentTarget.style.boxShadow = `0 0 0 4px ${colors.secondary}10`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.tertiary + "30";
                  e.currentTarget.style.boxShadow = "none";
                }}
                placeholder="Enter program"
              />
            </div>
          </div>
        </div>

        {/* Tabbed Content Section */}
        {programId && currentTerm && (
          <div
            className="rounded-2xl shadow-lg animate-in slide-in-from-bottom-4 duration-500 delay-200"
            style={{
              backgroundColor: "white",
              border: `1px solid ${colors.accent}30`,
            }}
          >
            {/* Tab Navigation */}
            <div className="border-b" style={{ borderColor: colors.accent + "10" }}>
              <div className="flex gap-1 px-4 pt-4">
                {[
                  { id: "subjects", label: "Enrolled Subjects", icon: BookOpen },
                  { id: "payment", label: "Payment Calculation", icon: DollarSign },
                  { id: "schedule", label: "Payment Schedule", icon: Calendar },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-semibold text-sm transition-all duration-200 relative ${
                        isActive ? "shadow-sm" : "hover:bg-gray-50"
                      }`}
                      style={{
                        backgroundColor: isActive ? "white" : "transparent",
                        color: isActive ? colors.secondary : colors.tertiary,
                        borderBottom: isActive ? `2px solid ${colors.secondary}` : "2px solid transparent",
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      {isActive && (
                        <div
                          className="absolute bottom-0 left-0 right-0 h-0.5"
                          style={{ backgroundColor: colors.secondary }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Enrolled Subjects Tab */}
              {activeTab === "subjects" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.primary }}>
                          Enrolled Subjects
                        </h3>
                        {isResidentReturnee && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-md" style={{
                            backgroundColor: colors.accent + "15",
                            color: colors.secondary
                          }}>
                            Resident/Returnee
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1 font-medium" style={{ color: colors.tertiary }}>
                        {currentTerm.semester} Semester, {currentTerm.academicYear} - {program}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {totalUnits > 0 && (
                        <div className="px-4 py-2 rounded-xl border" style={{
                          backgroundColor: colors.accent + "05",
                          borderColor: colors.accent + "10"
                        }}>
                          <span className="text-sm font-semibold" style={{ color: colors.primary }}>
                            Total Units: <strong style={{ color: colors.secondary }}>{totalUnits}</strong>
                          </span>
                        </div>
                      )}
                      {isResidentReturnee && (
                        <>
                          {!isEditingSubjects ? (
                            <button
                              onClick={() => setIsEditingSubjects(true)}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                              style={{
                                backgroundColor: colors.secondary,
                                color: "white"
                              }}
                            >
                              <Plus className="w-4 h-4" />
                              Edit Subjects
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setIsEditingSubjects(false);
                                  // Reload subjects to discard changes
                                  if (programId && currentTerm) {
                                    const semesterNum = currentTerm.semester === "First" ? 1 : 2;
                                    fetchEnrolledSubjects(programId, semesterNum);
                                  }
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border"
                                style={{
                                  borderColor: colors.tertiary + "30",
                                  color: colors.tertiary,
                                  backgroundColor: "white"
                                }}
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                              <button
                                onClick={saveEnrolledSubjects}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                                style={{
                                  backgroundColor: colors.secondary,
                                  color: "white"
                                }}
                              >
                                <Save className="w-4 h-4" />
                                Save
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {isLoadingSubjects ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Loading subjects...</p>
                    </div>
                  ) : subjectsError ? (
                    <div className="text-center py-12">
                      <p className="text-sm text-red-500">{subjectsError}</p>
                    </div>
                  ) : enrolledSubjects.length === 0 && !isEditingSubjects ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                      <BookOpen className="w-12 h-12 mx-auto mb-3" style={{ color: colors.tertiary }} />
                      <p className="text-sm text-gray-500 font-medium">
                        {isResidentReturnee 
                          ? "No enrolled subjects. Click 'Edit Subjects' to add subjects."
                          : "No subjects found for this program and semester"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {isResidentReturnee 
                          ? "Select subjects from the curriculum to enroll"
                          : "Please check the curriculum configuration"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Add Subject Button for Resident/Returnee in Edit Mode */}
                      {isResidentReturnee && isEditingSubjects && (
                        <div className="flex items-center justify-between p-4 rounded-lg border" style={{
                          backgroundColor: colors.accent + "05",
                          borderColor: colors.accent + "20"
                        }}>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: colors.primary }}>
                              Add Subject from Curriculum
                            </p>
                            <p className="text-xs mt-1" style={{ color: colors.tertiary }}>
                              Search and select subjects to add to enrollment
                            </p>
                          </div>
                          <button
                            onClick={() => setShowSubjectSelector(!showSubjectSelector)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                            style={{
                              backgroundColor: showSubjectSelector ? colors.tertiary + "20" : colors.secondary,
                              color: showSubjectSelector ? colors.tertiary : "white"
                            }}
                          >
                            <Plus className="w-4 h-4" />
                            {showSubjectSelector ? "Close" : "Add Subject"}
                          </button>
                        </div>
                      )}

                      {/* Subject Selector Modal */}
                      {isResidentReturnee && isEditingSubjects && showSubjectSelector && (
                        <div className="p-4 rounded-lg border shadow-lg" style={{
                          backgroundColor: "white",
                          borderColor: colors.accent + "30",
                          maxHeight: "400px",
                          overflowY: "auto"
                        }}>
                          <div className="mb-4">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: colors.tertiary }} />
                              <input
                                type="text"
                                value={subjectSearchTerm}
                                onChange={(e) => setSubjectSearchTerm(e.target.value)}
                                placeholder="Search subjects by code or title..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
                                style={{
                                  borderColor: colors.tertiary + "30",
                                  color: colors.primary
                                }}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            {availableSubjects
                              .filter(subject => {
                                const search = subjectSearchTerm.toLowerCase();
                                return !search || 
                                  subject.course_code.toLowerCase().includes(search) ||
                                  subject.descriptive_title.toLowerCase().includes(search);
                              })
                              .map((subject) => (
                                <div
                                  key={subject.id}
                                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                                  style={{ borderColor: colors.accent + "20" }}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold" style={{ color: colors.primary }}>
                                        {subject.course_code}
                                      </span>
                                      <span className="text-xs px-2 py-0.5 rounded" style={{
                                        backgroundColor: colors.accent + "10",
                                        color: colors.tertiary
                                      }}>
                                        {subject.units_total} units
                                      </span>
                                    </div>
                                    <p className="text-xs mt-1" style={{ color: colors.tertiary }}>
                                      {subject.descriptive_title}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => addSubject(subject)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                    style={{
                                      backgroundColor: colors.secondary,
                                      color: "white"
                                    }}
                                  >
                                    Add
                                  </button>
                                </div>
                              ))}
                            {availableSubjects.filter(subject => {
                              const search = subjectSearchTerm.toLowerCase();
                              return !search || 
                                subject.course_code.toLowerCase().includes(search) ||
                                subject.descriptive_title.toLowerCase().includes(search);
                            }).length === 0 && (
                              <p className="text-sm text-center py-4" style={{ color: colors.tertiary }}>
                                No available subjects found
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Enrolled Subjects Table */}
                      {enrolledSubjects.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: colors.accent + "20" }}>
                          <table className="w-full border-collapse">
                            <thead>
                              <tr style={{ backgroundColor: colors.accent + "05" }}>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                                  Code
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                                  Course Title
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                                  Year
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                                  Lec Units
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                                  Lab Units
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                                  Total Units
                                </th>
                                {isResidentReturnee && isEditingSubjects && (
                                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: colors.primary }}>
                                    Action
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {enrolledSubjects.map((subject, index) => (
                                <tr
                                  key={subject.id}
                                  className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                                  style={{
                                    backgroundColor: index % 2 === 0 ? "transparent" : colors.paper + "30"
                                  }}
                                >
                                  <td className="px-4 py-3 text-sm font-medium" style={{ color: colors.primary }}>
                                    {subject.course_code}
                                  </td>
                                  <td className="px-4 py-3 text-sm" style={{ color: colors.tertiary }}>
                                    {subject.descriptive_title}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm" style={{ color: colors.tertiary }}>
                                    {subject.year_level}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm" style={{ color: colors.tertiary }}>
                                    {subject.units_lec || 0}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm" style={{ color: colors.tertiary }}>
                                    {subject.units_lab || 0}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm font-semibold" style={{ color: colors.primary }}>
                                    {subject.units_total}
                                  </td>
                                  {isResidentReturnee && isEditingSubjects && (
                                    <td className="px-4 py-3 text-center">
                                      <button
                                        onClick={() => removeSubject(subject.id)}
                                        className="p-1.5 rounded-lg transition-all hover:bg-red-50"
                                        style={{ color: "#ef4444" }}
                                        title="Remove subject"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ backgroundColor: colors.accent + "05" }}>
                                <td colSpan={isResidentReturnee && isEditingSubjects ? 6 : 5} className="px-4 py-3 text-right text-sm font-bold" style={{ color: colors.primary }}>
                                  Total Units:
                                </td>
                                <td className="px-4 py-3 text-center text-sm font-bold" style={{ color: colors.secondary }}>
                                  {totalUnits}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payment Calculation Tab */}
              {activeTab === "payment" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight" style={{ color: colors.primary }}>
                        Payment Calculation
                      </h3>
                      <p className="text-sm mt-1 font-medium" style={{ color: colors.tertiary }}>
                        Calculate and manage student fees
                      </p>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl border" style={{
                      backgroundColor: colors.accent + "05",
                      borderColor: colors.accent + "10"
                    }}>
                      <span className="text-sm font-semibold" style={{ color: colors.primary }}>
                        Tuition Fee Per Unit:
                      </span>
                      <input
                        type="text"
                        value={tuitionPerUnit}
                        onChange={(e) => setTuitionPerUnit(e.target.value)}
                        className="px-3 py-1 rounded-lg border text-center w-24 bg-white"
                        style={{
                          borderColor: colors.tertiary + "30",
                          color: colors.primary
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = colors.secondary;
                          e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = colors.tertiary + "30";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                    </div>
                  </div>

                  {/* Payment Breakdown - Two Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Cash Basis */}
                    <div
                      className="p-5 rounded-xl border shadow-sm"
                      style={{
                        borderColor: colors.accent + "20",
                        backgroundColor: "white"
                      }}
                    >
                      <div className="flex items-center gap-3 mb-5 pb-3 border-b" style={{ borderColor: colors.accent + "10" }}>
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: colors.accent + "15" }}
                        >
                          <DollarSign className="w-4 h-4" style={{ color: colors.secondary }} />
                        </div>
                        <h3 className="text-lg font-bold tracking-tight" style={{ color: colors.primary }}>
                          Cash Basis
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {/* Tuition, Discount, Net Tuition */}
                        {[
                          { label: "Tuition", value: tuition, setValue: setTuition, key: "tuition" },
                          { label: "Discount", value: discount, setValue: setDiscount, key: "discount" },
                          { label: "Net Tuition", value: netTuition, setValue: () => { }, key: "netTuition", readonly: true },
                        ].map((item) => (
                          <div key={item.key} className="flex justify-between items-center py-2 px-3 rounded-lg border" style={{ 
                            borderColor: colors.accent + "10",
                            backgroundColor: "transparent"
                          }}>
                            <span className="text-sm font-medium" style={{ color: colors.primary }}>
                              {item.label}
                            </span>
                            <input
                              type="number"
                              value={item.value || ""}
                              onChange={(e) => !item.readonly && item.setValue(parseFloat(e.target.value) || 0)}
                              readOnly={item.readonly}
                              className="w-32 px-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                              style={{
                                borderColor: colors.tertiary + "30",
                                color: colors.primary
                              }}
                              onFocus={(e) => {
                                if (!item.readonly) {
                                  e.currentTarget.style.borderColor = colors.secondary;
                                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                                }
                              }}
                              onBlur={(e) => {
                                if (!item.readonly) {
                                  e.currentTarget.style.borderColor = colors.tertiary + "30";
                                  e.currentTarget.style.boxShadow = "none";
                                }
                              }}
                              placeholder="0.00"
                            />
                          </div>
                        ))}

                        {/* Dynamic Fees from Database */}
                        {fees
                          .filter((fee) => fee.status === "active" && fee.category.toLowerCase() !== "tuition")
                          .map((fee) => (
                            <div key={fee.id} className="flex justify-between items-center py-2 px-3 rounded-lg border" style={{ 
                              borderColor: colors.accent + "10",
                              backgroundColor: "transparent"
                            }}>
                              <span className="text-sm font-medium" style={{ color: colors.primary }}>
                                {fee.name}
                              </span>
                              <input
                                type="number"
                                value={dynamicFees[fee.id] || ""}
                                onChange={(e) => {
                                  setDynamicFees((prev) => ({
                                    ...prev,
                                    [fee.id]: parseFloat(e.target.value) || 0
                                  }));
                                }}
                                className="w-32 px-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                                style={{
                                  borderColor: colors.tertiary + "30",
                                  color: colors.primary
                                }}
                                onFocus={(e) => {
                                  e.currentTarget.style.borderColor = colors.secondary;
                                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                                }}
                                onBlur={(e) => {
                                  e.currentTarget.style.borderColor = colors.tertiary + "30";
                                  e.currentTarget.style.boxShadow = "none";
                                }}
                                placeholder="0.00"
                              />
                            </div>
                          ))}

                        {/* Total Fees */}
                        <div className="flex justify-between items-center py-2 px-3 rounded-lg border" style={{ 
                          borderColor: colors.secondary + "30",
                          backgroundColor: colors.accent + "08"
                        }}>
                          <span className="text-sm font-medium" style={{ color: colors.secondary }}>
                            Total Fees
                          </span>
                          <input
                            type="number"
                            value={totalFees || ""}
                            readOnly
                            className="w-32 px-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                            style={{
                              borderColor: colors.secondary + "30",
                              color: colors.secondary,
                              fontWeight: "bold"
                            }}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Installment Basis */}
                    <div
                      className="p-5 rounded-xl border shadow-sm"
                      style={{
                        borderColor: colors.accent + "20",
                        backgroundColor: "white"
                      }}
                    >
                      <div className="flex items-center gap-3 mb-5 pb-3 border-b" style={{ borderColor: colors.accent + "10" }}>
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: colors.accent + "15" }}
                        >
                          <CreditCard className="w-4 h-4" style={{ color: colors.secondary }} />
                        </div>
                        <h3 className="text-lg font-bold tracking-tight" style={{ color: colors.primary }}>
                          Installment Basis
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {[
                          { label: "Total Fees", value: totalFees, setValue: () => { }, key: "totalFeesInst", readonly: true },
                          { label: "D. Payment", value: downPayment, setValue: setDownPayment, key: "downPayment" },
                          { label: "Net", value: net, setValue: () => { }, key: "net", readonly: true },
                          { label: "5% Ins. C.", value: insuranceCharge, setValue: () => { }, key: "insurance", readonly: true },
                          { label: "Total Ins.", value: totalInstallment, setValue: () => { }, key: "totalInstallment", readonly: true, highlight: true },
                        ].map((item) => (
                          <div key={item.key} className="flex justify-between items-center py-2 px-3 rounded-lg border" style={{ 
                            borderColor: item.highlight ? colors.secondary + "30" : colors.accent + "10",
                            backgroundColor: item.highlight ? colors.accent + "08" : "transparent"
                          }}>
                            <span className="text-sm font-medium" style={{ color: item.highlight ? colors.secondary : colors.primary }}>
                              {item.label}
                            </span>
                            <input
                              type="number"
                              value={item.value || ""}
                              onChange={(e) => !item.readonly && item.setValue(parseFloat(e.target.value) || 0)}
                              readOnly={item.readonly}
                              className="w-32 px-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                              style={{
                                borderColor: item.highlight ? colors.secondary + "30" : colors.tertiary + "30",
                                color: item.highlight ? colors.secondary : colors.primary,
                                fontWeight: item.highlight ? "bold" : "normal"
                              }}
                              onFocus={(e) => {
                                if (!item.readonly) {
                                  e.currentTarget.style.borderColor = colors.secondary;
                                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                                }
                              }}
                              onBlur={(e) => {
                                if (!item.readonly) {
                                  e.currentTarget.style.borderColor = colors.tertiary + "30";
                                  e.currentTarget.style.boxShadow = "none";
                                }
                              }}
                              placeholder="0.00"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Schedule Tab */}
              {activeTab === "schedule" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold tracking-tight mb-1" style={{ color: colors.primary }}>
                      Payment Schedule
                    </h3>
                    <p className="text-sm font-medium" style={{ color: colors.tertiary }}>
                      Manage payment details and installment schedule
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Payment Details */}
                    <div
                      className="p-5 rounded-xl border shadow-sm"
                      style={{
                        borderColor: colors.accent + "20",
                        backgroundColor: "white"
                      }}
                    >
                      <div className="flex items-center gap-3 mb-5 pb-3 border-b" style={{ borderColor: colors.accent + "10" }}>
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: colors.accent + "15" }}
                        >
                          <Receipt className="w-4 h-4" style={{ color: colors.secondary }} />
                        </div>
                        <h3 className="text-lg font-bold tracking-tight" style={{ color: colors.primary }}>
                          Payment Details
                        </h3>
                      </div>
                      <div className="border rounded-xl overflow-hidden" style={{ borderColor: colors.accent + "20" }}>
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ backgroundColor: colors.accent + "08" }}>
                              <th className="px-4 py-3 text-left border-r font-semibold" style={{ borderColor: colors.accent + "20", color: colors.primary }}>
                                Payment Date
                              </th>
                              <th className="px-4 py-3 text-left border-r font-semibold" style={{ borderColor: colors.accent + "20", color: colors.primary }}>
                                O.R. Number
                              </th>
                              <th className="px-4 py-3 text-left border-r font-semibold" style={{ borderColor: colors.accent + "20", color: colors.primary }}>
                                Amount Paid
                              </th>
                              <th className="px-4 py-3 text-left font-semibold" style={{ color: colors.primary }}>
                                Balance
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {[1, 2, 3, 4, 5].map((row) => (
                              <tr key={row} className="border-b hover:bg-white/50 transition-colors" style={{ borderColor: colors.accent + "10" }}>
                                <td className="px-4 py-3 border-r" style={{ borderColor: colors.accent + "20" }}>
                                  <input
                                    type="date"
                                    className="w-full border-none outline-none bg-transparent text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                                    style={{ 
                                      color: colors.primary,
                                    }}
                                    onFocus={(e) => {
                                      e.currentTarget.style.backgroundColor = "white";
                                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                                    }}
                                    onBlur={(e) => {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                      e.currentTarget.style.boxShadow = "none";
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-3 border-r" style={{ borderColor: colors.accent + "20" }}>
                                  <input
                                    type="text"
                                    className="w-full border-none outline-none bg-transparent text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                                    style={{ color: colors.primary }}
                                    onFocus={(e) => {
                                      e.currentTarget.style.backgroundColor = "white";
                                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                                    }}
                                    onBlur={(e) => {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                      e.currentTarget.style.boxShadow = "none";
                                    }}
                                    placeholder="O.R. #"
                                  />
                                </td>
                                <td className="px-4 py-3 border-r" style={{ borderColor: colors.accent + "20" }}>
                                  <input
                                    type="number"
                                    className="w-full border-none outline-none bg-transparent text-right text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                                    style={{ color: colors.primary }}
                                    onFocus={(e) => {
                                      e.currentTarget.style.backgroundColor = "white";
                                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                                    }}
                                    onBlur={(e) => {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                      e.currentTarget.style.boxShadow = "none";
                                    }}
                                    placeholder="0.00"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    className="w-full border-none outline-none bg-transparent text-right text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                                    style={{ color: colors.primary }}
                                    onFocus={(e) => {
                                      e.currentTarget.style.backgroundColor = "white";
                                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                                    }}
                                    onBlur={(e) => {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                      e.currentTarget.style.boxShadow = "none";
                                    }}
                                    placeholder="0.00"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Mode of Payment */}
                    <div
                      className="p-5 rounded-xl border shadow-sm"
                      style={{
                        borderColor: colors.accent + "20",
                        backgroundColor: "white"
                      }}
                    >
                      <div className="flex items-center gap-3 mb-5 pb-3 border-b" style={{ borderColor: colors.accent + "10" }}>
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: colors.accent + "15" }}
                        >
                          <Calendar className="w-4 h-4" style={{ color: colors.secondary }} />
                        </div>
                        <h3 className="text-lg font-bold tracking-tight" style={{ color: colors.primary }}>
                          Mode of Payment
                        </h3>
                      </div>
                      <div className="border rounded-xl overflow-hidden" style={{ borderColor: colors.accent + "20" }}>
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ backgroundColor: colors.accent + "08" }}>
                              <th className="px-4 py-3 text-left border-r font-semibold" style={{ borderColor: colors.accent + "20", color: colors.primary }}>
                                Term
                              </th>
                              <th className="px-4 py-3 text-left border-r font-semibold" style={{ borderColor: colors.accent + "20", color: colors.primary }}>
                                Date
                              </th>
                              <th className="px-4 py-3 text-left font-semibold" style={{ color: colors.primary }}>
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { term: "PRELIM", date: prelimDate, setDate: setPrelimDate, amount: prelimAmount, setAmount: setPrelimAmount },
                              { term: "MIDTERM", date: midtermDate, setDate: setMidtermDate, amount: midtermAmount, setAmount: setMidtermAmount },
                              { term: "FINALS", date: finalsDate, setDate: setFinalsDate, amount: finalsAmount, setAmount: setFinalsAmount },
                            ].map((item) => (
                              <tr key={item.term} className="border-b hover:bg-white/50 transition-colors" style={{ borderColor: colors.accent + "10" }}>
                                <td className="px-4 py-3 border-r font-semibold" style={{ borderColor: colors.accent + "20", color: colors.secondary }}>
                                  {item.term}
                                </td>
                                <td className="px-4 py-3 border-r" style={{ borderColor: colors.accent + "20" }}>
                                  <input
                                    type="date"
                                    value={item.date}
                                    onChange={(e) => item.setDate(e.target.value)}
                                    className="w-full border-none outline-none bg-transparent text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                                    style={{ color: colors.primary }}
                                    onFocus={(e) => {
                                      e.currentTarget.style.backgroundColor = "white";
                                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                                    }}
                                    onBlur={(e) => {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                      e.currentTarget.style.boxShadow = "none";
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    value={item.amount || ""}
                                    onChange={(e) => item.setAmount(parseFloat(e.target.value) || 0)}
                                    className="w-full border-none outline-none bg-transparent text-right text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                                    style={{ color: colors.primary }}
                                    onFocus={(e) => {
                                      e.currentTarget.style.backgroundColor = "white";
                                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                                    }}
                                    onBlur={(e) => {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                      e.currentTarget.style.boxShadow = "none";
                                    }}
                                    placeholder="0.00"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t" style={{ borderColor: colors.accent + "10" }}>
                    <div className="group">
                      <label className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1" style={{ color: colors.primary }}>
                        <FileText className="w-4 h-4" style={{ color: colors.secondary }} />
                        Accounting Signature
                      </label>
                      <div className="h-12 border-b-2 rounded-lg px-3 flex items-end" style={{ 
                        borderColor: colors.tertiary + "30",
                        backgroundColor: colors.paper
                      }}></div>
                    </div>
                    <div className="group">
                      <label className="flex items-center gap-2 text-sm font-semibold mb-2 ml-1" style={{ color: colors.primary }}>
                        <Calendar className="w-4 h-4" style={{ color: colors.secondary }} />
                        Date
                      </label>
                      <div className="h-12 border-b-2 rounded-lg px-3 flex items-end" style={{ 
                        borderColor: colors.tertiary + "30",
                        backgroundColor: colors.paper
                      }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: "" })}
        message={successModal.message}
        autoClose={true}
        autoCloseDelay={3000}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: "", details: "" })}
        message={errorModal.message}
        details={errorModal.details}
      />
    </div>
  );
};

export default AssessmentManagement;
