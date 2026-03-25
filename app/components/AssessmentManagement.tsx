"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, GraduationCap, List, RefreshCw, UserPlus } from "lucide-react";
import { colors } from "../colors";
import { defaultFormStyles } from "../utils/formStyles";
import { useAcademicTerm } from "../hooks/useAcademicTerm";
import { useProgramsWithMajors } from "../hooks/useProgramsWithMajors";
import SuccessModal from "./common/SuccessModal";
import ErrorModal from "./common/ErrorModal";
import StudentSearchModal from "./common/StudentSearchModal";
import ConfirmationModal from "./common/ConfirmationModal";
import AssessmentSummaryModal, { AssessmentSummaryData } from "./common/AssessmentSummaryModal";
import AssessmentStudentList from "./assessmentManagement/AssessmentStudentList";
import SearchFilters from "./common/SearchFilters";
import type { Fee, PaymentDetail, EnrolledSubject, DroppedSubject } from "./assessmentManagement/types";
import { StudentInfoSection } from "./assessmentManagement/StudentInfoSection";
import { EnrolledSubjectsTab } from "./assessmentManagement/EnrolledSubjectsTab";
import { PaymentCalculationTab } from "./assessmentManagement/PaymentCalculationTab";
// PaymentScheduleTab removed - functionality moved to PaymentCalculationTab
import {
  calculateAssessment,
  calculateRegularUnits,
  calculateFixedAmountTotal,
  distributeInstallmentsEqually,
  validateInstallmentSchedule,
  formatCurrency,
} from "../utils/assessmentCalculations";

const AssessmentManagement: React.FC = () => {
  const searchParams = useSearchParams();
  const { currentTerm, loading: termLoading } = useAcademicTerm();
  const { programs: programsWithMajors, loading: loadingPrograms } = useProgramsWithMajors();
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'form' or 'list'
  const [viewMode, setViewMode] = useState<'form' | 'list'>('list');

  // Student List State
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProgram, setFilterProgram] = useState("");
  const [filterYearLevel, setFilterYearLevel] = useState("");
  const [filterAssessmentStatus, setFilterAssessmentStatus] = useState("");
  const [filterAcademicYear, setFilterAcademicYear] = useState("");
  const [filterSemester, setFilterSemester] = useState("");

  // Form data
  const [studentName, setStudentName] = useState("");
  const [program, setProgram] = useState("");
  const [programId, setProgramId] = useState<number | null>(null);
  const [majorId, setMajorId] = useState<number | null>(null);
  const [majorName, setMajorName] = useState<string | null>(null);
  const [yearLevel, setYearLevel] = useState<number | null>(null);
  const [academicStatus, setAcademicStatus] = useState<string>("");
  const [studentNumber, setStudentNumber] = useState("");
  const [tuitionPerUnit, setTuitionPerUnit] = useState("570");
  const [totalUnits, setTotalUnits] = useState(0); // Regular units only (excludes fixed amount subjects)
  const [fixedAmountTotal, setFixedAmountTotal] = useState(0); // Total of fixed amount subjects
  const [isFetchingStudent, setIsFetchingStudent] = useState(false);
  const [studentFetchError, setStudentFetchError] = useState("");

  // Enrolled Subjects
  const [enrolledSubjects, setEnrolledSubjects] = useState<EnrolledSubject[]>([]);
  const [droppedSubjects, setDroppedSubjects] = useState<DroppedSubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");

  // Student Type Detection
  const [isResidentReturnee, setIsResidentReturnee] = useState(false);

  // Tab Management
  const [activeTab, setActiveTab] = useState<"subjects" | "payment">("subjects");
  
  // Payment Schedule (loaded from existing assessment)
  const [paymentSchedules, setPaymentSchedules] = useState<Array<{
    id?: number;
    label: string;
    dueDate: string;
    amount: number;
    isPaid?: boolean;
  }>>([]);
  
  // Track if assessment has been saved to show summary
  const [showSummary, setShowSummary] = useState(false);
  
  // Assessment Summary Modal
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isSavingAssessment, setIsSavingAssessment] = useState(false);
  const [isAssessmentSaved, setIsAssessmentSaved] = useState(false);

  // Cash Basis
  const [tuition, setTuition] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [netTuition, setNetTuition] = useState(0);
  const [dynamicFees, setDynamicFees] = useState<{ [key: number]: number }>({});
  const [totalFees, setTotalFees] = useState(0);
  const [labFeeTotal, setLabFeeTotal] = useState(0);

  // Discount Management
  interface Discount {
    id: number;
    code: string;
    name: string;
    percentage: number;
    semester: string;
    status: string;
  }
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [isLoadingDiscounts, setIsLoadingDiscounts] = useState(false);
  const [persistedDiscountAmount, setPersistedDiscountAmount] = useState<number | null>(null);
  const [persistedDiscountId, setPersistedDiscountId] = useState<number | null>(null);
  const [enrollmentData, setEnrollmentData] = useState<{
    admission_status: string | null;
    remarks: string | null;
  } | null>(null);



  // Payment Mode
  const [paymentMode, setPaymentMode] = useState<'cash' | 'installment'>('cash');
  
  // Installment Basis
  const [insuranceCharge, setInsuranceCharge] = useState(0);
  const [totalInstallment, setTotalInstallment] = useState(0);
  const [netBalance, setNetBalance] = useState(0); // baseTotal - downPayment

  // Settings-driven values
  const [downPayment, setDownPayment] = useState(3000);
  const [installmentChargePercentage, setInstallmentChargePercentage] = useState(5);
  
  // Base Total (before payment mode)
  const [baseTotal, setBaseTotal] = useState(0);
  const [totalDueCash, setTotalDueCash] = useState(0);

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
  const feesAbortRef = useRef<AbortController | null>(null);
  const paymentSettingsAbortRef = useRef<AbortController | null>(null);
  const studentsAbortRef = useRef<AbortController | null>(null);
  const studentLookupAbortRef = useRef<AbortController | null>(null);
  const assessmentAbortRef = useRef<AbortController | null>(null);
  const subjectsAbortRef = useRef<AbortController | null>(null);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    isUnmountedRef.current = false;

    return () => {
      isUnmountedRef.current = true;
      feesAbortRef.current?.abort();
      paymentSettingsAbortRef.current?.abort();
      studentsAbortRef.current?.abort();
      studentLookupAbortRef.current?.abort();
      assessmentAbortRef.current?.abort();
      subjectsAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    fetchFees();
    fetchPaymentSettings();
  }, []);

  // Initialize from URL parameters
  useEffect(() => {
    const urlStudentNumber = searchParams.get('studentNumber');
    const urlTab = searchParams.get('tab') as 'subjects' | 'payment' | 'schedule' | null;
    
    // Set active tab from URL parameter, default to 'subjects'
    if (urlTab && ['subjects', 'payment'].includes(urlTab)) {
      setActiveTab(urlTab as "subjects" | "payment");
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

  // Helper function to calculate regular units and fixed amount total from subjects
  const calculateUnitsAndFixedAmounts = (subjects: EnrolledSubject[]) => {
    let regularUnits = 0;
    let fixedAmountSum = 0;

    subjects.forEach((subject) => {
      // Check if subject has fixed amount (not null, not undefined, and > 0)
      if (subject.fixedAmount !== undefined && subject.fixedAmount !== null && subject.fixedAmount > 0) {
        // Exclude from regular units, add to fixed amount total
        fixedAmountSum += subject.fixedAmount;
      } else {
        // Use lecture units only for tuition calculation (lab is billed separately)
        const lecUnits = subject.units_lec !== undefined && subject.units_lec !== null
          ? subject.units_lec
          : subject.units_total;
        regularUnits += lecUnits;
      }
    });

    return { regularUnits, fixedAmountSum };
  };

  // Function to fetch student information by student number
  const fetchStudentByNumber = async (studentNum: string) => {
    if (!isValidStudentNumber(studentNum)) {
      setStudentFetchError("");
      return;
    }

    // Reset assessment/enrollment-related state before loading a new student
    setEnrolledSubjects([]);
    setDroppedSubjects([]);
    setTotalUnits(0);
    setFixedAmountTotal(0);
    setSubjectsError("");
    setIsResidentReturnee(false);
    setSelectedDiscount(null);
    setDiscount(0);
    setPersistedDiscountAmount(null);
    setPersistedDiscountId(null);
    setEnrollmentData(null);
    setAcademicStatus("");
    // Reset assessment-saved flags so the form is unlocked for the new student
    setIsAssessmentSaved(false);
    setIsSavingAssessment(false);
    setShowSummary(false);
    setIsSummaryModalOpen(false);

    setIsFetchingStudent(true);
    setStudentFetchError("");

    try {
      studentLookupAbortRef.current?.abort();
      const abortController = new AbortController();
      studentLookupAbortRef.current = abortController;

      const response = await fetch(`/api/students/${studentNum.trim()}`, {
        signal: abortController.signal,
      });
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

        // Set major ID and name from enrollment data
        if (data.major_id) {
          setMajorId(data.major_id);
          // Get major name from the joined major data
          if (data.major && data.major.name) {
            setMajorName(data.major.name);
          } else {
            setMajorName(null);
          }
        } else {
          setMajorId(null);
          setMajorName(null);
        }

        // Set year level from enrollment data
        if (data.year_level) {
          setYearLevel(data.year_level);
        } else {
          setYearLevel(1); // Default to year 1 if not set
        }
        setAcademicStatus((data.academic_status || "").toLowerCase());

        // Store enrollment data for discount eligibility
        setEnrollmentData({
          admission_status: data.admission_status || null,
          remarks: data.remarks || null,
        });

        // Check if student is resident/returnee using comprehensive check
        try {
          const statusResponse = await fetch(`/api/auth/students/check-status?studentNumber=${studentNum.trim()}`, {
            signal: abortController.signal,
          });
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
        } catch (err: any) {
          if (err?.name === "AbortError") return;
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
        setMajorId(null);
        setMajorName(null);
        setYearLevel(null);
        setAcademicStatus("");
        setEnrolledSubjects([]);
        setDroppedSubjects([]);
        setTotalUnits(0);
        setFixedAmountTotal(0);
        setIsResidentReturnee(false);
        setShowSummary(false);
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      console.error("Error fetching student:", error);
      setStudentFetchError("Failed to fetch student information");
      setStudentName("");
      setProgram("");
      setProgramId(null);
      setMajorId(null);
      setMajorName(null);
      setYearLevel(null);
      setAcademicStatus("");
      setEnrolledSubjects([]);
      setDroppedSubjects([]);
      setTotalUnits(0);
      setFixedAmountTotal(0);
      setIsResidentReturnee(false);
      setShowSummary(false);
    } finally {
      if (!isUnmountedRef.current) {
        setIsFetchingStudent(false);
      }
    }
  };

  // Load existing assessment and populate payment schedules
  const loadExistingAssessment = async () => {
    if (!studentNumber || !currentTerm) return;

    try {
      assessmentAbortRef.current?.abort();
      const abortController = new AbortController();
      assessmentAbortRef.current = abortController;

      const response = await fetch(
        `/api/auth/assessment?studentNumber=${encodeURIComponent(studentNumber)}&academicYear=${encodeURIComponent(currentTerm.academicYear)}&semester=${currentTerm.semester}`,
        { signal: abortController.signal }
      );

      if (response.ok) {
        const assessment = await response.json();

        const savedDiscountAmount = assessment.discount_amount !== null && assessment.discount_amount !== undefined
          ? Number(assessment.discount_amount)
          : 0;
        setPersistedDiscountAmount(savedDiscountAmount);
        setDiscount(savedDiscountAmount);
        setPersistedDiscountId(
          assessment.discount_id !== null && assessment.discount_id !== undefined
            ? Number(assessment.discount_id)
            : null
        );
        if (assessment.discount) {
          setSelectedDiscount(assessment.discount);
        }
        
        // Populate payment schedules if they exist
        if (assessment.payment_schedules && assessment.payment_schedules.length > 0) {
          const schedules = assessment.payment_schedules.map((schedule: any) => ({
            id: schedule.id,
            label: schedule.label,
            dueDate: schedule.due_date ? new Date(schedule.due_date).toISOString().split('T')[0] : '',
            amount: Number(schedule.amount),
            isPaid: schedule.is_paid || false,
          }));
          setPaymentSchedules(schedules);
          
          // Also populate the individual state for editing
          const prelim = schedules.find((s: any) => s.label === 'Prelim');
          const midterm = schedules.find((s: any) => s.label === 'Midterm');
          const finals = schedules.find((s: any) => s.label === 'Finals');
          
          if (prelim) {
            setPrelimDate(prelim.dueDate);
            setPrelimAmount(prelim.amount);
          }
          if (midterm) {
            setMidtermDate(midterm.dueDate);
            setMidtermAmount(midterm.amount);
          }
          if (finals) {
            setFinalsDate(finals.dueDate);
            setFinalsAmount(finals.amount);
          }
        } else {
          setPaymentSchedules([]);
        }
      } else {
        setPersistedDiscountAmount(null);
        setPersistedDiscountId(null);
        setSelectedDiscount(null);
        setDiscount(0);
        setPaymentSchedules([]);
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      console.error("Error loading existing assessment:", error);
    }
  };

  // Fetch enrolled subjects based on program and current semester - optimized with parallel requests
  const fetchEnrolledSubjects = async (programIdValue: number, semesterNum: number) => {
    if (!programIdValue || !semesterNum) {
      return;
    }

    setIsLoadingSubjects(true);
    setSubjectsError("");

    try {
      subjectsAbortRef.current?.abort();
      const abortController = new AbortController();
      subjectsAbortRef.current = abortController;
      const signal = abortController.signal;

      const fetchDroppedSubjects = async () => {
        if (!studentNumber || !currentTerm) {
          setDroppedSubjects([]);
          return;
        }

        try {
          const response = await fetch(
            `/api/auth/subject-drop-history?studentNumber=${encodeURIComponent(studentNumber.trim())}&academicYear=${encodeURIComponent(currentTerm.academicYear)}&semester=${semesterNum}`,
            { signal }
          );

          if (signal.aborted) return;

          if (!response.ok) {
            setDroppedSubjects([]);
            return;
          }

          const droppedData = await response.json();
          setDroppedSubjects(
            droppedData.success && Array.isArray(droppedData.data)
              ? droppedData.data
              : [],
          );
        } catch (error: any) {
          if (error?.name === "AbortError") return;
          setDroppedSubjects([]);
        }
      };

      // ALWAYS check enrolled_subjects first if studentNumber exists
      // This ensures we fetch the student's actual enrolled subjects, not curriculum
      if (studentNumber && currentTerm) {
        const enrolledResponse = await fetch(
          `/api/auth/enrolled-subjects?studentNumber=${encodeURIComponent(studentNumber.trim())}&academicYear=${encodeURIComponent(currentTerm.academicYear)}&semester=${semesterNum}`,
          { signal }
        );

        if (signal.aborted) return;

        if (enrolledResponse.ok) {
          const enrolledData = await enrolledResponse.json();
          if (enrolledData.success && enrolledData.data && enrolledData.data.length > 0) {
            // Student has existing enrolled subjects for this term, use them
            setEnrolledSubjects(enrolledData.data);
            await fetchDroppedSubjects();
            const { regularUnits, fixedAmountSum } = calculateUnitsAndFixedAmounts(enrolledData.data);
            setTotalUnits(regularUnits);
            setFixedAmountTotal(fixedAmountSum);
            setIsLoadingSubjects(false);
            // Fetch curriculum tuition fee per unit for this student (non-blocking)
            (() => {
              let tuitionUrl = `/api/auth/curriculum/subjects?programId=${programIdValue}&semester=${semesterNum}`;
              if (majorId) tuitionUrl += `&majorId=${majorId}`;
              if (yearLevel) tuitionUrl += `&yearLevel=${yearLevel}`;
              fetch(tuitionUrl)
                .then(r => r.json())
                .then(cd => {
                  if (cd.success && cd.data?.curriculum?.tuition_fee_per_unit != null) {
                    setTuitionPerUnit(String(cd.data.curriculum.tuition_fee_per_unit));
                  }
                })
                .catch(() => {/* keep default */});
            })();
            // Load existing assessment after subjects are loaded (non-blocking)
            loadExistingAssessment().catch(err => console.error("Error loading assessment:", err));
            return; // Exit early - we have enrolled subjects
          }
        }
        // If enrolled subjects fetch failed or returned empty, continue to curriculum fallback
      }

      if (signal.aborted) return;

      // Fallback: Fetch from curriculum if no enrolled subjects exist
      // This happens for new students or when enrolled_subjects is empty
      console.log("Fetching curriculum subjects for programId:", programIdValue, "semester:", semesterNum, "majorId:", majorId, "yearLevel:", yearLevel);
      let curriculumUrl = `/api/auth/curriculum/subjects?programId=${programIdValue}&semester=${semesterNum}`;
      if (majorId) {
        curriculumUrl += `&majorId=${majorId}`;
      }
      if (yearLevel) {
        curriculumUrl += `&yearLevel=${yearLevel}`;
      }
      const curriculumResponse = await fetch(curriculumUrl, { signal });

      if (signal.aborted) return;

      if (curriculumResponse.ok) {
        const curriculumData = await curriculumResponse.json();
        console.log("Curriculum response:", curriculumData);
        if (curriculumData.success && curriculumData.data && curriculumData.data.courses && curriculumData.data.courses.length > 0) {
          console.log("Found", curriculumData.data.courses.length, "curriculum courses");
          setEnrolledSubjects(curriculumData.data.courses);
          await fetchDroppedSubjects();
          const { regularUnits, fixedAmountSum } = calculateUnitsAndFixedAmounts(curriculumData.data.courses);
          setTotalUnits(regularUnits);
          setFixedAmountTotal(fixedAmountSum);
          // Use curriculum's tuition fee per unit instead of hardcoded default
          if (curriculumData.data.curriculum?.tuition_fee_per_unit != null) {
            setTuitionPerUnit(String(curriculumData.data.curriculum.tuition_fee_per_unit));
          }

          // Auto-save curriculum subjects to enrolled_subjects ONLY for resident/returnee
          // This allows them to start with curriculum and modify later (non-blocking)
          if (isResidentReturnee && studentNumber && currentTerm) {
            fetch("/api/auth/enrolled-subjects", {
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
            }).catch(saveError => {
              console.error("Error auto-saving curriculum subjects:", saveError);
              // Don't show error to user, they can save manually later
            });
          }
        } else {
          const errorMsg = curriculumData.error || "No subjects found in curriculum for this program and semester";
          console.warn("Curriculum fetch returned no courses:", errorMsg);
          setSubjectsError(errorMsg);
          setEnrolledSubjects([]);
          setDroppedSubjects([]);
          setTotalUnits(0);
          setFixedAmountTotal(0);
        }
      } else {
        let errorMessage = "Failed to fetch subjects from curriculum";
        try {
          const errorData = await curriculumResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = `Failed to fetch curriculum: ${curriculumResponse.status} ${curriculumResponse.statusText}`;
        }
        console.error("Curriculum fetch failed:", errorMessage, "Status:", curriculumResponse.status);
        setSubjectsError(errorMessage);
        setEnrolledSubjects([]);
        setDroppedSubjects([]);
        setTotalUnits(0);
        setFixedAmountTotal(0);
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') return;
      
      console.error("Error fetching enrolled subjects:", error);
      setSubjectsError("Failed to fetch enrolled subjects");
      setEnrolledSubjects([]);
      setDroppedSubjects([]);
      setTotalUnits(0);
      setFixedAmountTotal(0);
    } finally {
      if (!subjectsAbortRef.current?.signal.aborted && !isUnmountedRef.current) {
        setIsLoadingSubjects(false);
      }
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
        fixedAmount: course.fixedAmount,
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

      // Recalculate regular units and fixed amount total
      const { regularUnits, fixedAmountSum } = calculateUnitsAndFixedAmounts(updated);
      setTotalUnits(regularUnits);
      setFixedAmountTotal(fixedAmountSum);
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
    // Recalculate regular units and fixed amount total
    const { regularUnits, fixedAmountSum } = calculateUnitsAndFixedAmounts(updated);
    setTotalUnits(regularUnits);
    setFixedAmountTotal(fixedAmountSum);
  };

  // Restore original subjects (used when canceling edit mode or switching tabs)
  const handleRestoreSubjects = (subjects: EnrolledSubject[]) => {
    setEnrolledSubjects(subjects);
    // Recalculate regular units and fixed amount total
    const { regularUnits, fixedAmountSum } = calculateUnitsAndFixedAmounts(subjects);
    setTotalUnits(regularUnits);
    setFixedAmountTotal(fixedAmountSum);
  };

  // Fetch subjects when program ID and current term are available
  useEffect(() => {
    if (programId && currentTerm && !termLoading) {
      // Map semester: "First" -> 1, "Second" -> 2
      const semesterNum = currentTerm.semester === "First" ? 1 : 2;
      console.log("Triggering fetchEnrolledSubjects with:", {
        programId,
        majorId,
        yearLevel,
        semesterNum,
        academicYear: currentTerm.academicYear,
        studentNumber,
        isResidentReturnee
      });
      fetchEnrolledSubjects(programId, semesterNum);
    } else {
      if (!programId) {
        console.log("Waiting for programId...");
      }
      if (!currentTerm) {
        console.log("Waiting for currentTerm...", { termLoading });
      }
      // Don't clear subjects if we're just waiting for data to load
      if (!programId || (!currentTerm && !termLoading)) {
        setEnrolledSubjects([]);
        setTotalUnits(0);
        setFixedAmountTotal(0);
      }
    }
  }, [programId, majorId, yearLevel, currentTerm, termLoading, isResidentReturnee, studentNumber]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setMajorId(null);
      setMajorName(null);
      setYearLevel(null);
      setAcademicStatus("");
      setEnrolledSubjects([]);
      setTotalUnits(0);
      setFixedAmountTotal(0);
      setSubjectsError("");
      setIsResidentReturnee(false);
    }
  }, [studentNumber]);

  // Calculate gross tuition based on total units when totalUnits changes
  useEffect(() => {
    if (totalUnits > 0 && tuitionPerUnit) {
      const tuitionAmount = totalUnits * parseFloat(tuitionPerUnit);
      setTuition(tuitionAmount);
    } else if (totalUnits === 0) {
      setTuition(0);
    }
  }, [totalUnits, tuitionPerUnit]);

  // Cache for discounts per semester
  const discountCacheRef = useRef<Map<string, { data: Discount[]; timestamp: number }>>(new Map());
  const DISCOUNT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  // Tracks the last params sent to the API to prevent duplicate fetches
  const lastFetchParamsRef = useRef<string>("");

  // Fetch discounts when modal opens with caching
  const fetchDiscounts = async (semester: string) => {
    // Check cache first
    const cached = discountCacheRef.current.get(semester);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < DISCOUNT_CACHE_DURATION) {
      setAvailableDiscounts(cached.data);
      return cached.data;
    }

    try {
      const response = await fetch(`/api/auth/discounts?semester=${semester}`, {
        cache: 'force-cache',
        next: { revalidate: 300 }, // Revalidate every 5 minutes
      });
      if (response.ok) {
        const discounts = await response.json();
        
        // Cache the results
        discountCacheRef.current.set(semester, {
          data: discounts,
          timestamp: now,
        });
        
        setAvailableDiscounts(discounts);
        return discounts;
      }
    } catch (error) {
      console.error("Error fetching discounts:", error);
    }
    return [];
  };

  // Determine eligible discounts based on enrollment data
  const determineEligibleDiscounts = (discounts: Discount[]): Discount[] => {
    if (!enrollmentData) return discounts;

    const { admission_status, remarks } = enrollmentData;
    const eligible: Discount[] = [];

    discounts.forEach((discount) => {
      // Check discount code patterns
      const code = discount.code.toUpperCase();
      
      // FT discounts (Full-Time/Dean Lister) - check admission_status
      if (code.startsWith("FT")) {
        if (admission_status && admission_status.toUpperCase().includes("FT")) {
          eligible.push(discount);
        }
      }
      
      // HH discounts (Employee) - check remarks
      if (code.startsWith("HH")) {
        if (remarks) {
          const remarksUpper = remarks.toUpperCase();
          if (remarksUpper.includes("HH1") || remarksUpper.includes("HH2")) {
            // Check if discount code matches remark
            if (code.includes("HH1") && remarksUpper.includes("HH1")) {
              eligible.push(discount);
            } else if (code.includes("HH2") && remarksUpper.includes("HH2")) {
              eligible.push(discount);
            }
          }
        }
      }
    });

    return eligible.length > 0 ? eligible : discounts; // If no specific match, show all (admin can override)
  };

  // Recommend highest percentage discount
  const getRecommendedDiscount = (discounts: Discount[]): Discount | null => {
    if (discounts.length === 0) return null;
    return discounts.reduce((highest, current) => 
      Number(current.percentage) > Number(highest.percentage) ? current : highest
    );
  };

  // Load discounts when current term changes
  useEffect(() => {
    const loadDiscounts = async () => {
      if (!currentTerm) return;
      
      setIsLoadingDiscounts(true);
      try {
        const semester = currentTerm.semester === "First" ? "First" : "Second";
        const discounts = await fetchDiscounts(semester);
        const eligible = determineEligibleDiscounts(discounts);
        setAvailableDiscounts(eligible);
      } catch (error) {
        console.error("Error loading discounts:", error);
      } finally {
        setIsLoadingDiscounts(false);
      }
    };
    
    loadDiscounts();
  }, [currentTerm, enrollmentData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle discount selection from dropdown
  const handleDiscountChange = (discount: Discount | null) => {
    setSelectedDiscount(discount);
    setPersistedDiscountAmount(null);
    setPersistedDiscountId(discount?.id ?? null);
    
    if (discount) {
      const discountPercent = Number(discount.percentage);
      const discountAmount = tuition * (discountPercent / 100);
      setDiscount(discountAmount);
    } else {
      setDiscount(0);
    }
  };

  // Recalculate discount when tuition or selected discount changes
  useEffect(() => {
    if (persistedDiscountAmount !== null) {
      setDiscount(persistedDiscountAmount);
    } else if (selectedDiscount && tuition > 0) {
      const discountPercent = Number(selectedDiscount.percentage);
      const discountAmount = tuition * (discountPercent / 100);
      setDiscount(discountAmount);
    } else if (!selectedDiscount) {
      setDiscount(0);
    }
  }, [tuition, selectedDiscount, persistedDiscountAmount]);

  // If an assessment has a saved discount_id, sync it once available discounts are loaded.
  useEffect(() => {
    if (!persistedDiscountId || availableDiscounts.length === 0 || selectedDiscount) return;
    const matchedDiscount = availableDiscounts.find((d) => d.id === persistedDiscountId);
    if (matchedDiscount) {
      setSelectedDiscount(matchedDiscount);
    }
  }, [persistedDiscountId, availableDiscounts, selectedDiscount]);

  // Main calculation effect - uses new calculation utilities
  useEffect(() => {
    const persistedDiscountPercentage =
      persistedDiscountAmount !== null && tuition > 0
        ? (persistedDiscountAmount / tuition) * 100
        : 0;

    // Use the calculation utility function
    const results = calculateAssessment({
      enrolledSubjects,
      tuitionPerUnit: parseFloat(tuitionPerUnit) || 0,
      discountPercentage:
        persistedDiscountAmount !== null
          ? persistedDiscountPercentage
          : selectedDiscount
            ? Number(selectedDiscount.percentage)
            : 0,
      dynamicFees,
      paymentMode,
      downPayment,
      installmentChargePercentage,
    });

    // Update all calculated values
    setDiscount(results.discountAmount);
    setNetTuition(results.netTuition);
    setBaseTotal(results.baseTotal);
    setTotalFees(results.dynamicFeesTotal);
    setLabFeeTotal(results.labFeeTotal);
    
    // Payment mode specific calculations
    if (paymentMode === 'cash') {
      setTotalDueCash(results.totalDueCash);
      setInsuranceCharge(0);
      setNetBalance(0);
      setTotalInstallment(0);
    } else {
      setTotalDueCash(0);
      setInsuranceCharge(results.insuranceAmount || 0);
      setNetBalance(results.netBalance || 0);
      setTotalInstallment(results.totalInstallment || 0);
      
      // Auto-distribute installments if total changes
      if (results.totalInstallment) {
        const distributed = distributeInstallmentsEqually(results.totalInstallment);
        setPrelimAmount(distributed.prelim);
        setMidtermAmount(distributed.midterm);
        setFinalsAmount(distributed.finals);
        
        // Set default dates to today if not already set
        const today = new Date().toISOString().split('T')[0];
        if (!prelimDate) {
          setPrelimDate(today);
        }
        if (!midtermDate) {
          setMidtermDate(today);
        }
        if (!finalsDate) {
          setFinalsDate(today);
        }
      }
    }
  }, [
    enrolledSubjects,
    tuitionPerUnit,
    selectedDiscount,
    dynamicFees,
    paymentMode,
    fixedAmountTotal,
    downPayment,
    installmentChargePercentage,
    persistedDiscountAmount,
  ]);

  // Optimized fee fetching with caching - using summarized fees endpoint
  const fetchFees = async () => {
    try {
      feesAbortRef.current?.abort();
      const abortController = new AbortController();
      feesAbortRef.current = abortController;

      const response = await fetch("/api/auth/fees/summarized", {
        cache: 'no-store',
        signal: abortController.signal,
      });
      if (response.ok) {
        const data = await response.json();
        setFees(data || []);
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      console.error("Error fetching fees:", error);
    } finally {
      if (!isUnmountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Fetch payment settings (min downpayment + installment charge %) from settings API
  const fetchPaymentSettings = async () => {
    try {
      paymentSettingsAbortRef.current?.abort();
      const abortController = new AbortController();
      paymentSettingsAbortRef.current = abortController;

      const [dpRes, icRes] = await Promise.all([
        fetch("/api/auth/settings?key=min_downpayment", { signal: abortController.signal }),
        fetch("/api/auth/settings?key=installment_charge_percentage", { signal: abortController.signal }),
      ]);
      if (dpRes.ok) {
        const dpData = await dpRes.json();
        if (dpData.data?.value) setDownPayment(parseFloat(dpData.data.value));
      }
      if (icRes.ok) {
        const icData = await icRes.json();
        if (icData.data?.value) setInstallmentChargePercentage(parseFloat(icData.data.value));
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      console.error("Error fetching payment settings:", error);
    }
  };

  // Fetch students with assessment status
  const fetchStudents = async () => {
    // Use filter values if set, otherwise use current term
    const academicYear = filterAcademicYear || currentTerm?.academicYear;
    const semester = filterSemester || (currentTerm?.semester === "First" ? "1" : "2");
    
    if (!academicYear || !semester) return;

    // Skip if the effective params haven't changed (prevents double-fetch on mount)
    const fetchKey = `${academicYear}|${semester}|${searchQuery}|${filterProgram}|${filterYearLevel}|${filterAssessmentStatus}`;
    if (fetchKey === lastFetchParamsRef.current) return;
    lastFetchParamsRef.current = fetchKey;
    
    studentsAbortRef.current?.abort();
    const abortController = new AbortController();
    studentsAbortRef.current = abortController;

    setLoadingStudents(true);
    try {
      const params = new URLSearchParams({
        academicYear,
        semester,
        includeNotAssessed: "true",
      });
      
      if (searchQuery) params.append("search", searchQuery);
      if (filterProgram) params.append("programId", filterProgram);
      if (filterYearLevel) params.append("yearLevel", filterYearLevel);
      if (filterAssessmentStatus) params.append("assessmentStatus", filterAssessmentStatus);
      
      const url = `/api/auth/assessment/all-summaries?${params.toString()}`;
      
      const response = await fetch(url, { signal: abortController.signal });
      if (response.ok) {
        const result = await response.json();
        // Transform API response fields to match AssessmentStudentList interface
        const rawData: any[] = result.data || [];
        const transformedStudents = rawData.map((item: any) => ({
          id: item.assessment_id ?? item.id,
          student_number: item.student_number,
          first_name: item.first_name ?? item.student_name ?? "",
          middle_name: item.middle_name,
          family_name: item.family_name ?? "",
          program_code: item.program_code ?? item.course_program ?? null,
          year_level: item.year_level ?? null,
          has_assessment: item.has_assessment !== undefined
            ? item.has_assessment
            : item.assessment_id !== undefined && item.assessment_id !== null,
          assessment_date: item.assessment_date ?? null,
          total_amount: item.total_amount ?? item.total_due ?? null,
          photo: item.photo ?? null,
        }));
        setStudents(transformedStudents);
      } else {
        const error = await response.json();
        console.error("Error response:", error);
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      console.error("Error fetching students:", error);
    } finally {
      if (!abortController.signal.aborted && !isUnmountedRef.current) {
        setLoadingStudents(false);
      }
    }
  };

  const handleRefreshStudents = async () => {
    lastFetchParamsRef.current = "";
    await fetchStudents();
  };

  // Fetch students when filters change.
  // Also sets filter defaults from currentTerm on first load.
  // Merged into one effect to avoid a double-fetch when currentTerm first arrives.
  useEffect(() => {
    if (viewMode !== 'list') return;

    // Set default academic year / semester from currentTerm if not yet chosen
    if (currentTerm) {
      if (!filterAcademicYear) setFilterAcademicYear(currentTerm.academicYear);
      if (!filterSemester) setFilterSemester(currentTerm.semester === "First" ? "1" : "2");
    }

    const canFetch = currentTerm || (filterAcademicYear && filterSemester);
    if (!canFetch) return;

    const debounceDelay = searchQuery.trim() ? 300 : 0;
    const debounceTimer = setTimeout(() => {
      fetchStudents();
    }, debounceDelay);

    return () => clearTimeout(debounceTimer);
  }, [viewMode, currentTerm, searchQuery, filterProgram, filterYearLevel, filterAssessmentStatus, filterAcademicYear, filterSemester]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle student selection from list
  const handleSelectStudentFromList = (studentNum: string) => {
    // Reset saved/locked state so the form is fresh for each student
    setIsAssessmentSaved(false);
    setIsSavingAssessment(false);
    setShowSummary(false);
    setIsSummaryModalOpen(false);
    setStudentNumber(studentNum);
    setViewMode('form');
  };

  // Handle view assessment (read-only mode)
  const handleViewAssessment = (studentNum: string) => {
    // Reset saved/locked state so the form is fresh for each student
    setIsAssessmentSaved(false);
    setIsSavingAssessment(false);
    setShowSummary(false);
    setIsSummaryModalOpen(false);
    setStudentNumber(studentNum);
    setViewMode('form');
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

  // Prepare assessment summary data - Memoized for performance
  const prepareSummaryData = useMemo((): AssessmentSummaryData | null => {
    if (!studentNumber || !studentName || !currentTerm) {
      return null;
    }

    // Prepare fees array from dynamicFees - optimized
    const feesArray = fees
      .filter(fee => fee.status?.toLowerCase() === "active")
      .map(fee => ({
        id: fee.id,
        name: fee.name,
        category: fee.category || "",
        amount: dynamicFees[fee.id] || 0,
      }))
      .filter(fee => fee.amount > 0);

    return {
      studentName,
      studentNumber,
      academicYear: currentTerm.academicYear,
      semester: currentTerm.semester,
      totalUnits,
      tuitionPerUnit: parseFloat(tuitionPerUnit) || 0,
      grossTuition: tuition,
      discount: selectedDiscount ? {
        id: selectedDiscount.id,
        code: selectedDiscount.code,
        name: selectedDiscount.name,
        percentage: selectedDiscount.percentage,
      } : null,
      discountAmount: discount,
      netTuition,
      fees: feesArray,
      totalFees,
      fixedAmountTotal,
      paymentMode,
      totalDueCash,
      insuranceAmount: insuranceCharge,
      totalInstallment,
      baseTotal,
    };
  }, [
    studentNumber,
    studentName,
    currentTerm,
    totalUnits,
    tuitionPerUnit,
    tuition,
    selectedDiscount,
    discount,
    netTuition,
    fees,
    dynamicFees,
    totalFees,
    fixedAmountTotal,
    paymentMode,
    totalDueCash,
    insuranceCharge,
    totalInstallment,
    baseTotal,
  ]);

  // Check if assessment can be saved - Memoized for performance
  const canSaveAssessment = useMemo((): boolean => {
    if (!studentNumber || !programId || !currentTerm) {
      return false;
    }
    if (enrolledSubjects.length === 0) {
      return false;
    }
    if (paymentMode === 'installment') {
      // Validate installment schedule sums to totalInstallment (netBalance + insurance charge)
      // Down payment is collected separately and is not part of the schedule
      const validation = validateInstallmentSchedule(
        prelimAmount,
        midtermAmount,
        finalsAmount,
        totalInstallment
      );
      if (!validation.valid) {
        return false;
      }
    }
    return true;
  }, [studentNumber, programId, currentTerm, enrolledSubjects.length, paymentMode, prelimAmount, midtermAmount, finalsAmount, totalInstallment]);

  // Save assessment with all financial data - Always finalizes
  const handleSaveAssessment = async (): Promise<boolean> => {
    if (!studentNumber || !programId || !currentTerm) {
      setErrorModal({
        isOpen: true,
        message: "Please enter student information first",
      });
      return false;
    }

    // Validate installment schedule if in installment mode
    if (paymentMode === 'installment') {
      const validation = validateInstallmentSchedule(
        prelimAmount,
        midtermAmount,
        finalsAmount,
        totalInstallment
      );
      if (!validation.valid) {
        setErrorModal({
          isOpen: true,
          message: validation.error || "Invalid installment schedule",
        });
        return false;
      }
      // Down payment is separate — not validated against the schedule
    }

    try {
      const semesterNum = currentTerm.semester === "First" ? 1 : 2;

      // Always persist enrolled subjects to enrolled_subjects table before saving assessment
      if (enrolledSubjects.length > 0) {
        try {
          const enrolledSubjectsResponse = await fetch("/api/auth/enrolled-subjects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentNumber: studentNumber.trim(),
              programId,
              academicYear: currentTerm.academicYear,
              semester: semesterNum,
              subjects: enrolledSubjects.map((s) => ({
                id: s.id,
                curriculum_course_id: (s as any).curriculum_course_id || s.id,
                subject_id: s.subject_id || null,
                year_level: s.year_level,
                units_total: s.units_total,
              })),
            }),
          });

          const enrolledSubjectsResult = await enrolledSubjectsResponse.json();

          if (!enrolledSubjectsResponse.ok) {
            setErrorModal({
              isOpen: true,
              message:
                enrolledSubjectsResult.error ||
                "Failed to validate enrolled subjects before finalizing assessment",
            });
            return false;
          }

          if (enrolledSubjectsResult.status === "pending_approval") {
            setErrorModal({
              isOpen: true,
              message:
                enrolledSubjectsResult.message ||
                "This assessment cannot be finalized yet because the student load exceeds 27 units and is still pending approval.",
            });
            return false;
          }
        } catch (enrollErr) {
          console.error("Error saving enrolled subjects during assessment save:", enrollErr);
          setErrorModal({
            isOpen: true,
            message: "Failed to validate enrolled subjects before finalizing assessment",
            details:
              enrollErr instanceof Error ? enrollErr.message : "Unknown error occurred",
          });
          return false;
        }
      }

      // Prepare fee snapshots
      const feeSnapshots = fees
        .filter(fee => fee.status?.toLowerCase() === "active" && fee.category?.toLowerCase() !== "tuition")
        .map(fee => ({
          feeId: fee.id,
          feeName: fee.name,
          feeCategory: fee.category || "miscellaneous",
          amount: dynamicFees[fee.id] || Number(fee.amount),
        }));

      // Prepare payment schedule (only for installment mode)
      const paymentSchedule = paymentMode === 'installment' ? [
        { label: "Prelim", dueDate: prelimDate, amount: prelimAmount },
        { label: "Midterm", dueDate: midtermDate, amount: midtermAmount },
        { label: "Finals", dueDate: finalsDate, amount: finalsAmount },
      ] : [];

      const response = await fetch("/api/auth/assessment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentNumber: studentNumber.trim(),
          academicYear: currentTerm.academicYear,
          semester: semesterNum,
          academicStatus: academicStatus || null,
          grossTuition: tuition,
          discountId: selectedDiscount?.id || null,
          discountPercent: selectedDiscount ? Number(selectedDiscount.percentage) : null,
          discountAmount: discount,
          netTuition: netTuition,
          totalFees: totalFees,
          fixedAmountTotal: fixedAmountTotal,
          baseTotal: baseTotal,
          paymentMode: paymentMode,
          downPayment: paymentMode === 'installment' ? downPayment : null,
          insuranceAmount: paymentMode === 'installment' ? insuranceCharge : null,
          totalDueCash: paymentMode === 'cash' ? totalDueCash : null,
          totalDueInstallment: paymentMode === 'installment' ? (downPayment + totalInstallment) : null,
          totalDue: paymentMode === 'cash' ? totalDueCash : (downPayment + totalInstallment),
          fees: feeSnapshots,
          paymentSchedule: paymentSchedule,
          mode: 'finalize', // Always finalize when saving from modal
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccessModal({
          isOpen: true,
          message: result.message || "Assessment finalized successfully!",
        });
        // Show summary after successful save
        setShowSummary(true);
        // Mark assessment as saved to disable editing
        setIsAssessmentSaved(true);
        // Force the student list to re-fetch next time it's shown
        lastFetchParamsRef.current = "";
        // Reload payment schedules after saving
        if (paymentMode === 'installment') {
          await loadExistingAssessment();
        }
        return true;
      } else {
        const errorData = await response.json();
        setErrorModal({
          isOpen: true,
          message: errorData.error || "Failed to save assessment",
        });
        return false;
      }
    } catch (error) {
      console.error("Error saving assessment:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to save assessment",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return false;
    }
  };

  // Handle payment mode change
  const handlePaymentModeChange = (newMode: 'cash' | 'installment') => {
    if (newMode === 'installment' && paymentMode === 'cash') {
      // Initialize installment schedule with default values
      if (totalInstallment > 0) {
        const distributed = distributeInstallmentsEqually(totalInstallment);
        setPrelimAmount(distributed.prelim);
        setMidtermAmount(distributed.midterm);
        setFinalsAmount(distributed.finals);
        
        // Set default dates to today if not already set
        const today = new Date().toISOString().split('T')[0];
        if (!prelimDate) {
          setPrelimDate(today);
        }
        if (!midtermDate) {
          setMidtermDate(today);
        }
        if (!finalsDate) {
          setFinalsDate(today);
        }
      }
    } else if (newMode === 'cash' && paymentMode === 'installment') {
      // Clear installment schedule
      setPrelimAmount(0);
      setMidtermAmount(0);
      setFinalsAmount(0);
      setPrelimDate("");
      setMidtermDate("");
      setFinalsDate("");
    }
    setPaymentMode(newMode);
  };

  if (loading) {
    return (
      <div
        className='flex items-center justify-center min-h-screen'
        style={{ background: colors.paper }}
      >
        <div className='flex flex-col items-center gap-4'>
          <div className='relative'>
            <div
              className='w-16 h-16 border-4 rounded-full animate-spin'
              style={{
                borderColor: colors.neutralBorder,
                borderTopColor: colors.primary,
              }}
            ></div>
            <GraduationCap
              className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6'
              style={{ color: colors.primary }}
            />
          </div>
          <p className='font-medium' style={{ color: colors.neutral }}>
            Loading Assessment...
          </p>
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
          <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 tracking-tight" style={{ color: colors.primary }}>
                Assessment Management
              </h1>
              <p className="text-base font-medium max-w-2xl leading-relaxed" style={{ color: colors.tertiary }}>
                Record and handle student tuition details based on enrolled courses, unit costs, and applicable miscellaneous fees
              </p>
            </div>

            {currentTerm && (
              <div
                className="w-full lg:w-auto rounded-2xl border shadow-sm px-4 py-3 min-w-[240px]"
                style={{
                  backgroundColor: "white",
                  borderColor: `${colors.primary}15`,
                }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.tertiary }}>
                  Current Academic Period
                </div>
                <div className="mt-1 text-lg font-bold leading-tight" style={{ color: colors.primary }}>
                  {currentTerm.semester === "First" ? "1st Semester" : "2nd Semester"}
                </div>
                <div className="text-sm font-semibold" style={{ color: colors.secondary }}>
                  A.Y. {currentTerm.academicYear}
                </div>
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                viewMode === 'list'
                  ? 'text-white shadow-md'
                  : 'text-gray-600 bg-white border border-gray-200 hover:border-gray-300'
              }`}
              style={{
                backgroundColor: viewMode === 'list' ? colors.secondary : undefined,
              }}
            >
              <List className="w-4 h-4" />
              Student List
            </button>
            <button
              onClick={() => setViewMode('form')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                viewMode === 'form'
                  ? 'text-white shadow-md'
                  : 'text-gray-600 bg-white border border-gray-200 hover:border-gray-300'
              }`}
              style={{
                backgroundColor: viewMode === 'form' ? colors.secondary : undefined,
              }}
            >
              <UserPlus className="w-4 h-4" />
              Assessment Form
            </button>
          </div>
        </div>

        {/* Student List View */}
        {viewMode === 'list' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800">Filter Students</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefreshStudents}
                    disabled={loadingStudents}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 transition-all hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ color: colors.primary }}
                    title="Refresh student list"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingStudents ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterProgram("");
                      setFilterYearLevel("");
                      setFilterAssessmentStatus("");
                      if (currentTerm) {
                        setFilterAcademicYear(currentTerm.academicYear);
                        setFilterSemester(currentTerm.semester === "First" ? "1" : "2");
                      }
                    }}
                    className="px-3 py-1 text-xs font-medium rounded-lg transition-all hover:bg-gray-100"
                    style={{ color: colors.secondary }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
              
              {/* Compact Single Row Layout */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                {/* Search - First Item */}
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border bg-white transition-all focus:outline-none focus:ring-1 focus:ring-offset-0"
                  style={{ borderColor: colors.tertiary + "30" }}
                />

                {/* Academic Year */}
                <div className="relative">
                  <select
                    value={filterAcademicYear}
                    onChange={(e) => setFilterAcademicYear(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border bg-white appearance-none cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-offset-0"
                    style={{ borderColor: colors.tertiary + "30" }}
                  >
                    <option value="">Academic Year</option>
                    {Array.from({ length: 8 }, (_, i) => {
                      const startYear = new Date().getFullYear() - 3 + i;
                      const endYear = startYear + 1;
                      const yearStr = `${startYear}-${endYear}`;
                      return (
                        <option key={yearStr} value={yearStr}>
                          {yearStr}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {/* Semester */}
                <div className="relative">
                  <select
                    value={filterSemester}
                    onChange={(e) => setFilterSemester(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border bg-white appearance-none cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-offset-0"
                    style={{ borderColor: colors.tertiary + "30" }}
                  >
                    <option value="">Semester</option>
                    <option value="1">First Sem</option>
                    <option value="2">Second Sem</option>
                    <option value="3">Summer</option>
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {/* Assessment Status */}
                <div className="relative">
                  <select
                    value={filterAssessmentStatus}
                    onChange={(e) => setFilterAssessmentStatus(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border bg-white appearance-none cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-offset-0"
                    style={{ borderColor: colors.tertiary + "30" }}
                  >
                    <option value="">All Status</option>
                    <option value="assessed">Assessed</option>
                    <option value="not_assessed">Not Assessed</option>
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {/* Program */}
                <div className="relative">
                  <select
                    value={filterProgram}
                    onChange={(e) => setFilterProgram(e.target.value)}
                    disabled={loadingPrograms}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border bg-white appearance-none cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-offset-0 disabled:opacity-50"
                    style={{ borderColor: colors.tertiary + "30" }}
                  >
                    <option value="">{loadingPrograms ? "Loading..." : "All Programs"}</option>
                    {programsWithMajors.map((program) => (
                      <option key={program.value} value={program.value}>
                        {program.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {/* Year Level */}
                <div className="relative">
                  <select
                    value={filterYearLevel}
                    onChange={(e) => setFilterYearLevel(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border bg-white appearance-none cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-offset-0"
                    style={{ borderColor: colors.tertiary + "30" }}
                  >
                    <option value="">All Years</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Table */}
            <AssessmentStudentList
              students={students}
              onSelectStudent={handleSelectStudentFromList}
              onViewAssessment={handleViewAssessment}
              loading={loadingStudents}
            />
          </div>
        )}

        {/* Assessment Form View */}
        {viewMode === 'form' && (
          <>
        {/* Student Information Card - Always Visible */}
        <StudentInfoSection
          studentNumber={studentNumber}
          studentName={studentName}
          program={program}
          majorName={majorName}
          yearLevel={yearLevel}
          academicStatus={academicStatus}
          isFetchingStudent={isFetchingStudent}
          onSelectStudent={() => setIsStudentSearchModalOpen(true)}
          onAcademicStatusChange={setAcademicStatus}
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
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as "subjects" | "payment")}
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
                  majorId={majorId}
                  studentNumber={studentNumber}
                  totalUnits={totalUnits}
                  isLoadingSubjects={isLoadingSubjects}
                  subjectsError={subjectsError}
                  enrolledSubjects={enrolledSubjects}
                  droppedSubjects={droppedSubjects}
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
                  fixedAmountTotal={fixedAmountTotal}
                  labFeeTotal={labFeeTotal}
                  enrolledSubjects={enrolledSubjects}
                  fees={fees}
                  dynamicFees={dynamicFees}
                  setDynamicFees={setDynamicFees}
                  totalFees={totalFees}
                  baseTotal={baseTotal}
                  paymentMode={paymentMode}
                  onPaymentModeChange={handlePaymentModeChange}
                  downPayment={downPayment}
                  setDownPayment={setDownPayment}
                  netBalance={netBalance}
                  installmentChargePercentage={installmentChargePercentage}
                  insuranceCharge={insuranceCharge}
                  totalInstallment={totalInstallment}
                  totalDueCash={totalDueCash}
                  selectedDiscount={selectedDiscount}
                  availableDiscounts={availableDiscounts}
                  onDiscountChange={handleDiscountChange}
                  isLoadingDiscounts={isLoadingDiscounts}
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
                  paymentSchedules={paymentSchedules}
                  showSummary={showSummary}
                />
              )}
            </div>

            {/* Action Buttons */}
            {programId && currentTerm && (
              <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: colors.accent + "10" }}>
                {isAssessmentSaved && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#D1FAE5" }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: "#059669" }} />
                    <span className="text-sm font-semibold" style={{ color: "#047857" }}>
                      Assessment Saved
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setIsSummaryModalOpen(true)}
                  disabled={!canSaveAssessment || isAssessmentSaved}
                  className="px-6 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: colors.secondary,
                  }}
                >
                  {isAssessmentSaved ? "View Summary" : "Review Assessment"}
                </button>
              </div>
            )}
          </div>
        )}
        </>
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

      {/* Assessment Summary Modal */}
      <AssessmentSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => {
          setIsSummaryModalOpen(false);
          // Reset saved state when closing (unless assessment was actually saved)
          if (!isAssessmentSaved) {
            setIsSavingAssessment(false);
          }
        }}
        data={prepareSummaryData}
        isLoading={isSavingAssessment}
        canSave={canSaveAssessment && !isAssessmentSaved}
        isSaved={isAssessmentSaved}
        onConfirm={async () => {
          if (isSavingAssessment || isAssessmentSaved) return;
          
          setIsSavingAssessment(true);
          try {
            const success = await handleSaveAssessment();
            if (success) {
              setIsAssessmentSaved(true);
              // Keep modal open to show success state
              // Auto-close after 2.5 seconds, but keep assessment locked
              setTimeout(() => {
                setIsSummaryModalOpen(false);
                setIsSavingAssessment(false);
                // Keep isAssessmentSaved = true to lock fields
                // Assessment remains locked until user selects a new student
              }, 2500);
            } else {
              setIsSavingAssessment(false);
            }
          } catch (error) {
            console.error("Error saving assessment:", error);
            setIsSavingAssessment(false);
          }
        }}
      />

    </div>
  );
};

export default AssessmentManagement;
