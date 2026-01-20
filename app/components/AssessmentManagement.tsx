"use client";
import React, { useState, useEffect } from "react";
import { Calculator } from "lucide-react";
import { colors } from "../colors";
import { defaultFormStyles } from "../utils/formStyles";
import { useAcademicTerm } from "../hooks/useAcademicTerm";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";
import type { Fee, PaymentDetail, EnrolledSubject } from "./assessmentManagement/types";
import { StudentInfoSection } from "./assessmentManagement/StudentInfoSection";
import { EnrolledSubjectsTab } from "./assessmentManagement/EnrolledSubjectsTab";
import { PaymentCalculationTab } from "./assessmentManagement/PaymentCalculationTab";
import { PaymentScheduleTab } from "./assessmentManagement/PaymentScheduleTab";

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
        .filter((fee) => fee.status?.toLowerCase() === "active" && fee.category?.toLowerCase() !== "tuition")
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
        const result = await response.json();
        setSuccessModal({
          isOpen: true,
          message: result.message || "Enrolled subjects saved successfully!",
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
      console.log("All fees fetched:", data);
      console.log("Active non-tuition fees:", data.filter((fee: Fee) => 
        fee.status?.toLowerCase() === "active" && 
        fee.category?.toLowerCase() !== "tuition"
      ));
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

  const handleStartEditingSubjects = () => {
    setIsEditingSubjects(true);
  };

  const handleCancelEditingSubjects = () => {
    setIsEditingSubjects(false);
    // Reload subjects to discard changes
    if (programId && currentTerm) {
      const semesterNum = currentTerm.semester === "First" ? 1 : 2;
      fetchEnrolledSubjects(programId, semesterNum);
    }
  };

  const handleSaveSubjects = () => {
    saveEnrolledSubjects();
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
        <StudentInfoSection
          studentNumber={studentNumber}
          setStudentNumber={setStudentNumber}
          studentName={studentName}
          setStudentName={setStudentName}
          program={program}
          setProgram={setProgram}
          studentFetchError={studentFetchError}
          isFetchingStudent={isFetchingStudent}
          inputClasses={inputClasses}
        />

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
                  { id: "subjects", label: "Enrolled Subjects" },
                  { id: "payment", label: "Payment Calculation" },
                  { id: "schedule", label: "Payment Schedule" },
                ].map((tab) => {
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
              {activeTab === "subjects" && (
                <EnrolledSubjectsTab
                  currentTerm={currentTerm}
                  program={program}
                  totalUnits={totalUnits}
                  isResidentReturnee={isResidentReturnee}
                  isEditingSubjects={isEditingSubjects}
                  onStartEditing={handleStartEditingSubjects}
                  onCancelEditing={handleCancelEditingSubjects}
                  onSaveSubjects={handleSaveSubjects}
                  isLoadingSubjects={isLoadingSubjects}
                  subjectsError={subjectsError}
                  enrolledSubjects={enrolledSubjects}
                  availableSubjects={availableSubjects}
                  showSubjectSelector={showSubjectSelector}
                  setShowSubjectSelector={setShowSubjectSelector}
                  subjectSearchTerm={subjectSearchTerm}
                  setSubjectSearchTerm={setSubjectSearchTerm}
                  addSubject={addSubject}
                  removeSubject={removeSubject}
                />
              )}

              {activeTab === "payment" && (
                <PaymentCalculationTab
                  tuitionPerUnit={tuitionPerUnit}
                  setTuitionPerUnit={setTuitionPerUnit}
                  tuition={tuition}
                  discount={discount}
                  setDiscount={setDiscount}
                  netTuition={netTuition}
                  fees={fees}
                  dynamicFees={dynamicFees}
                  setDynamicFees={setDynamicFees}
                  totalFees={totalFees}
                  downPayment={downPayment}
                  setDownPayment={setDownPayment}
                  net={net}
                  insuranceCharge={insuranceCharge}
                  totalInstallment={totalInstallment}
                />
              )}

              {activeTab === "schedule" && (
                <PaymentScheduleTab
                  prelimDate={prelimDate}
                  setPrelimDate={setPrelimDate}
                  prelimAmount={prelimAmount}
                  setPrelimAmount={setPrelimAmount}
                  midtermDate={midtermDate}
                  setMidtermDate={setMidtermDate}
                  midtermAmount={midtermAmount}
                  setMidtermAmount={setMidtermAmount}
                  finalsDate={finalsDate}
                  setFinalsDate={setFinalsDate}
                  finalsAmount={finalsAmount}
                  setFinalsAmount={setFinalsAmount}
                />
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
