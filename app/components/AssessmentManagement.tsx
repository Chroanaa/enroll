"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Calculator } from "lucide-react";
import { colors } from "../colors";
import { defaultFormStyles } from "../utils/formStyles";
import { useAcademicTerm } from "../hooks/useAcademicTerm";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";
import StudentSearchModal from "./common/StudentSearchModal";
import type { Fee, PaymentDetail, EnrolledSubject } from "./assessmentManagement/types";
import { StudentInfoSection } from "./assessmentManagement/StudentInfoSection";
import { EnrolledSubjectsTab } from "./assessmentManagement/EnrolledSubjectsTab";
import { PaymentCalculationTab } from "./assessmentManagement/PaymentCalculationTab";
import { PaymentScheduleTab } from "./assessmentManagement/PaymentScheduleTab";

const AssessmentManagement: React.FC = () => {
  const searchParams = useSearchParams();
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
  const [isStudentSearchModalOpen, setIsStudentSearchModalOpen] = useState(false);
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

  // Initialize from URL parameters
  useEffect(() => {
    const urlStudentNumber = searchParams.get('studentNumber');
    const urlTab = searchParams.get('tab') as 'subjects' | 'payment' | 'schedule' | null;
    
    // Set active tab from URL parameter, default to 'subjects'
    if (urlTab && ['subjects', 'payment', 'schedule'].includes(urlTab)) {
      setActiveTab(urlTab);
    } else {
      setActiveTab('subjects');
    }
    
    // Auto-populate student number and trigger fetch if URL parameter exists
    if (urlStudentNumber && urlStudentNumber.trim()) {
      setStudentNumber(urlStudentNumber.trim());
      // The fetchStudentByNumber will be triggered by the studentNumber useEffect
    }
  }, [searchParams]);

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

  const isValidStudentNumber = (studentNum: string) => {
    const trimmed = studentNum.trim();
    // Basic validation: require a minimum length to avoid firing queries
    // on obviously incomplete input. Adjust as needed if a stricter pattern exists.
    return trimmed.length >= 5;
  };

  // Function to fetch student information by student number
  const fetchStudentByNumber = async (studentNum: string) => {
    if (!isValidStudentNumber(studentNum)) {
      setStudentFetchError("");
      return;
    }

    // Reset assessment/enrollment-related state before loading a new student
    setEnrolledSubjects([]);
    setTotalUnits(0);
    setSubjectsError("");
    setIsResidentReturnee(false);

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
      // ALWAYS check enrolled_subjects first if studentNumber exists
      // This ensures we fetch the student's actual enrolled subjects, not curriculum
      if (studentNumber && currentTerm) {
        const enrolledResponse = await fetch(
          `/api/auth/enrolled-subjects?studentNumber=${encodeURIComponent(studentNumber.trim())}&academicYear=${encodeURIComponent(currentTerm.academicYear)}&semester=${semesterNum}`
        );

        if (enrolledResponse.ok) {
          const enrolledData = await enrolledResponse.json();
          if (enrolledData.success && enrolledData.data && enrolledData.data.length > 0) {
            // Student has existing enrolled subjects for this term, use them
            setEnrolledSubjects(enrolledData.data);
            const total = enrolledData.data.reduce(
              (sum: number, course: EnrolledSubject) => sum + (course.units_total || 0),
              0
            );
            setTotalUnits(total);
            setIsLoadingSubjects(false);
            return; // Exit early - we have enrolled subjects
          }
        }
        // If enrolled subjects fetch failed or returned empty, continue to curriculum fallback
      }

      // Fallback: Fetch from curriculum if no enrolled subjects exist
      // This happens for new students or when enrolled_subjects is empty
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

          // Auto-save curriculum subjects to enrolled_subjects ONLY for resident/returnee
          // This allows them to start with curriculum and modify later
          if (isResidentReturnee && studentNumber && currentTerm) {
            try {
              await fetch("/api/auth/enrolled-subjects", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  studentNumber: studentNumber.trim(),
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
          }
        } else {
          setSubjectsError("No subjects found in curriculum for this program and semester");
          setEnrolledSubjects([]);
          setTotalUnits(0);
        }
      } else {
        const errorData = await curriculumResponse.json();
        setSubjectsError(errorData.error || "Failed to fetch subjects");
        setEnrolledSubjects([]);
        setTotalUnits(0);
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

  // Save enrolled subjects for resident/returnee
  const saveEnrolledSubjects = async (): Promise<boolean> => {
    if (!studentNumber || !programId || !currentTerm) {
      setErrorModal({
        isOpen: true,
        message: "Please enter student information first",
      });
      return false;
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
        return true;
      } else {
        const errorData = await response.json();
        setErrorModal({
          isOpen: true,
          message: errorData.error || "Failed to save enrolled subjects",
        });
        return false;
      }
    } catch (error) {
      console.error("Error saving enrolled subjects:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to save enrolled subjects",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return false;
    }
  };

  // Handle add subjects from modal
  const handleAddSubject = (subjects: any[]) => {
    if (!studentNumber || !programId || !currentTerm) {
      setErrorModal({
        isOpen: true,
        message: "Please select a student first",
      });
      return;
    }

    try {
      const semesterNum = currentTerm.semester === "First" ? 1 : 2;
      
      // Convert curriculum courses to enrolled subjects format
      const newSubjects: (EnrolledSubject & { curriculum_course_id?: number })[] = subjects.map((course) => ({
        id: Date.now() + Math.random(), // Temporary unique ID for UI
        curriculum_id: course.curriculum_id,
        curriculum_course_id: course.id, // Store the curriculum_course.id for reference
        subject_id: course.subject_id || null,
        course_code: course.course_code,
        descriptive_title: course.descriptive_title,
        units_lec: course.units_lec || 0,
        units_lab: course.units_lab || 0,
        units_total: course.units_total,
        lecture_hour: course.lecture_hour || null,
        lab_hour: course.lab_hour || null,
        prerequisite: course.prerequisite || null,
        year_level: course.year_level,
        semester: semesterNum,
      }));

      // Add new subjects to enrolled list (avoid duplicates by curriculum_course_id or course_code)
      const existingCourseIds = new Set(
        enrolledSubjects.map((s) => (s as any).curriculum_course_id || s.id)
      );
      const existingCourseCodes = new Set(enrolledSubjects.map((s) => s.course_code));
      
      const uniqueNewSubjects = newSubjects.filter((s) => {
        // Check if this curriculum course is already enrolled
        return !existingCourseIds.has(s.curriculum_course_id!) && !existingCourseCodes.has(s.course_code);
      });
      const updated = [...enrolledSubjects, ...uniqueNewSubjects];

      setEnrolledSubjects(updated);

      // Recalculate total units
      const total = updated.reduce(
        (sum: number, course: EnrolledSubject) => sum + (course.units_total || 0),
        0
      );
      setTotalUnits(total);
    } catch (error) {
      console.error("Error adding subjects:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to add subjects",
      });
    }
  };

  // Handle edit subject (for future use)
  const handleEditSubject = (subject: EnrolledSubject) => {
    // This can be implemented later if needed
    console.log("Edit subject:", subject);
  };

  // Remove subject from enrolled list
  const handleRemoveSubject = (subjectId: number) => {
    const updated = enrolledSubjects.filter(s => s.id !== subjectId);
    setEnrolledSubjects(updated);
    // Recalculate total units
    const total = updated.reduce(
      (sum: number, course: EnrolledSubject) => sum + (course.units_total || 0),
      0
    );
    setTotalUnits(total);
  };

  // Restore original subjects (used when canceling edit mode or switching tabs)
  const handleRestoreSubjects = (subjects: EnrolledSubject[]) => {
    setEnrolledSubjects(subjects);
    // Recalculate total units
    const total = subjects.reduce(
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

  // Handle student selection from modal
  const handleStudentSelect = (selectedStudentNumber: string) => {
    setStudentNumber(selectedStudentNumber);
    setIsStudentSearchModalOpen(false);
    // Show success confirmation
    setSuccessModal({
      isOpen: true,
      message: "Student selected successfully",
    });
  };

  // Handle student number change with debounce (for URL params or direct setting)
  useEffect(() => {
    if (studentNumber.trim()) {
      const timeoutId = setTimeout(() => {
        // Only query when we have a valid/complete student number
        if (isValidStudentNumber(studentNumber)) {
          fetchStudentByNumber(studentNumber);
        }
      }, 500); // Wait 500ms after user stops typing

      return () => clearTimeout(timeoutId);
    } else {
      // Clear fields if student number is empty
      setStudentName("");
      setProgram("");
      setStudentFetchError("");
      setProgramId(null);
      setEnrolledSubjects([]);
      setTotalUnits(0);
      setSubjectsError("");
      setIsResidentReturnee(false);
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

  const handleSaveSubjects = async (): Promise<boolean> => {
    return await saveEnrolledSubjects();
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
          studentName={studentName}
          program={program}
          isFetchingStudent={isFetchingStudent}
          onSelectStudent={() => setIsStudentSearchModalOpen(true)}
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
                  programId={programId}
                  studentNumber={studentNumber}
                  totalUnits={totalUnits}
                  isLoadingSubjects={isLoadingSubjects}
                  subjectsError={subjectsError}
                  enrolledSubjects={enrolledSubjects}
                  onAddSubject={handleAddSubject}
                  onEditSubject={handleEditSubject}
                  onRemoveSubject={handleRemoveSubject}
                  onSaveSubjects={handleSaveSubjects}
                  onRestoreSubjects={handleRestoreSubjects}
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

      {/* Student Search Modal */}
      <StudentSearchModal
        isOpen={isStudentSearchModalOpen}
        onClose={() => setIsStudentSearchModalOpen(false)}
        onSelect={handleStudentSelect}
      />

    </div>
  );
};

export default AssessmentManagement;
