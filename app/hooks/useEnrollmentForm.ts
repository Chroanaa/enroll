import { useState, useMemo, useRef, useEffect } from "react";
import Axios from "axios";
import { Department, Program, Major } from "../types";
import { getDepartments } from "../utils/departmentUtils";
import { getPrograms } from "../utils/programUtils";
export interface EnrollmentFormData {
  // Page 1: Admission Information
  admission_date: string;
  admission_status: string;
  term: string;
  department: number;
  course_program: string;
  major_id: number;
  year_level: number;
  photo: File | null;

  // Page 2: Admission Requirements
  requirements: string[];

  // Page 3: Student Information
  student_number: string;
  family_name: string;
  first_name: string;
  middle_name: string;
  sex: string;
  civil_status: string;
  birthdate: string;
  birthplace: string[]; // Array format: [province, city]
  complete_address: string;
  address_province: string;
  address_city: string;
  address_detail: string;
  contact_number: string;
  email_address: string;

  // Page 4: Emergency Information
  emergency_contact_name: string;
  emergency_relationship: string;
  emergency_contact_number: string;

  // Page 5: Educational Background
  last_school_attended: string;
  previous_school_year: string;
  program_shs: string;
  remarks: string;
  status?: number;

  // Academic Year (for all enrollments)
  academic_year: string;
}

const TOTAL_PAGES = 5;

// Get current academic year (current year to next year)
const getCurrentAcademicYear = (): string => {
  const currentYear = new Date().getFullYear();
  return `${currentYear}-${currentYear + 1}`;
};

const initialFormData: EnrollmentFormData = {
  // Page 1: Admission Information
  admission_date: "",
  admission_status: "",
  term: "",
  department: 0,
  course_program: "",
  major_id: 0,
  year_level: 1,
  photo: null,
  academic_year: "", // Will be populated from academic term settings

  // Page 2: Admission Requirements
  requirements: [],

  // Page 3: Student Information
  student_number: "",
  family_name: "",
  first_name: "",
  middle_name: "",
  sex: "",
  civil_status: "",
    birthdate: "",
    birthplace: [], // Array format: [province, city]
    complete_address: "",
    address_province: "",
    address_city: "",
    address_detail: "",
    contact_number: "",
  email_address: "",

  // Page 4: Emergency Information
  emergency_contact_name: "",
  emergency_relationship: "",
  emergency_contact_number: "",

  // Page 5: Educational Background
  last_school_attended: "",
  previous_school_year: "",
  program_shs: "",
  remarks: "",
  status: 0,
};

export const useEnrollmentForm = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<{
    message: string;
    details?: string;
  } | null>(null);
  const [lastSubmittedData, setLastSubmittedData] =
    useState<EnrollmentFormData | null>(null);
  const [lastSubmittedPhotoPreview, setLastSubmittedPhotoPreview] = useState<
    string | null
  >(null);
  const [formData, setFormData] = useState<EnrollmentFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: "",
  });
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const duplicateCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoPreviewRef = useRef<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [selectedProgramHasMajors, setSelectedProgramHasMajors] = useState(false);

  // Get today's date
  const getTodayDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return today.toLocaleDateString("en-US", options);
  };

  // Cleanup photo
  useEffect(() => {
    if (!formData.photo && photoPreviewRef.current) {
      if (photoPreviewRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreviewRef.current);
      }
      photoPreviewRef.current = null;
      setPhotoPreview(null);
    }
  }, [formData.photo]);

  useEffect(() => {
    return () => {
      if (
        photoPreviewRef.current &&
        photoPreviewRef.current.startsWith("blob:")
      ) {
        URL.revokeObjectURL(photoPreviewRef.current);
        photoPreviewRef.current = null;
      }
    };
  }, []);

  // Function to generate student ID
  const generateStudentId = async () => {
    try {
      const response = await Axios.get("/api/auth/student/generate-id");
      if (response.data?.student_number) {
        setFormData((prev) => ({
          ...prev,
          student_number: response.data.student_number,
        }));
      }
    } catch (error) {
      console.error("Error generating student ID:", error);
    }
  };

  // Fetch departments and programs on mount
  // Generate student ID on mount
  useEffect(() => {
    generateStudentId();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [departmentsData, programsData] = await Promise.all([
          getDepartments(),
          getPrograms(),
        ]);
        const departmentsArray: Department[] = Array.isArray(departmentsData)
          ? departmentsData
          : Object.values(departmentsData);
        const programsArray: Program[] = Array.isArray(programsData)
          ? programsData
          : Object.values(programsData);
        setDepartments(departmentsArray);
        setPrograms(programsArray);
      } catch (error) {
        console.error("Error fetching departments and programs:", error);
      }
    };
    fetchData();
  }, []);

  // Fetch majors when program is selected
  const fetchMajorsByProgram = async (programId: number) => {
    try {
      const response = await Axios.get(`/api/auth/major/by-program/${programId}`);
      const majorsData = response.data || [];
      setMajors(majorsData);
      setSelectedProgramHasMajors(majorsData.length > 0);
      
      // If program has no majors, get the department from the program
      if (majorsData.length === 0) {
        const selectedProgram = programs.find(p => p.id === programId);
        if (selectedProgram && selectedProgram.department_id) {
          setFormData((prev) => ({
            ...prev,
            department: selectedProgram.department_id || 0,
          }));
        }
      } else {
        // Clear department if majors exist (will be set from major selection)
        setFormData((prev) => ({
          ...prev,
          department: 0,
        }));
      }
    } catch (error) {
      console.error("Error fetching majors:", error);
      setMajors([]);
      setSelectedProgramHasMajors(false);
    }
  };

  // Handle program selection
  const handleProgramChange = (programId: number) => {
    setFormData((prev) => ({
      ...prev,
      course_program: String(programId),
      major_id: 0, // Reset major when program changes
    }));
    
    // Fetch majors for this program
    fetchMajorsByProgram(programId);
    
    // Clear errors
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.course_program;
      delete newErrors.major_id;
      return newErrors;
    });
  };

  // Handle major selection
  const handleMajorChange = (majorId: number) => {
    const selectedMajor = majors.find(m => m.id === majorId);
    if (selectedMajor) {
      // Get program and department from the major
      const selectedProgram = programs.find(p => p.id === selectedMajor.program_id);
      setFormData((prev) => ({
        ...prev,
        major_id: majorId,
        course_program: String(selectedMajor.program_id),
        department: selectedProgram?.department_id || 0,
      }));
    }
    
    // Clear errors
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.major_id;
      return newErrors;
    });
  };

  // Keep handleDepartmentChange for backward compatibility but it's no longer used in the form
  const handleDepartmentChange = (departmentId: number) => {
    setFormData((prev) => ({
      ...prev,
      department: departmentId,
      course_program: "",
      major_id: 0,
    }));
    setMajors([]);
    setSelectedProgramHasMajors(false);
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.department;
      delete newErrors.course_program;
      return newErrors;
    });
  };

  // Check for duplicate student
  const checkDuplicate = async (data: {
    first_name: string;
    family_name: string;
    middle_name: string;
    birthdate: string;
  }) => {
    // Only check if all required fields are filled: first_name, family_name, and birthdate
    // middle_name is optional, so it can be empty
    if (!data.first_name || !data.family_name || !data.birthdate) {
      setDuplicateError(null);
      return;
    }

    setIsCheckingDuplicate(true);
    try {
      const response = await Axios.post(
        "/api/auth/enroll/check-duplicate",
        data,
      );
      if (response.data.isDuplicate) {
        setDuplicateError(response.data.message);
      } else {
        setDuplicateError(null);
      }
    } catch (error) {
      console.error("Error checking for duplicate:", error);
      setDuplicateError(null);
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  // Debounced duplicate check
  const debouncedDuplicateCheck = (data: {
    first_name: string;
    family_name: string;
    middle_name: string;
    birthdate: string;
  }) => {
    // Clear any existing timeout
    if (duplicateCheckTimeoutRef.current) {
      clearTimeout(duplicateCheckTimeoutRef.current);
    }
    // Set a new timeout to check after 500ms of no typing
    duplicateCheckTimeoutRef.current = setTimeout(() => {
      checkDuplicate(data);
    }, 500);
  };

  const handleInputChange = (
    field: keyof EnrollmentFormData,
    value: string | string[],
  ) => {
    // Handle birthplace array - parse JSON string if needed
    let processedValue: any = value;
    if (field === "birthplace" && typeof value === "string") {
      try {
        processedValue = JSON.parse(value);
      } catch {
        // If not valid JSON, treat as empty array
        processedValue = [];
      }
    }
    
    // Auto-set year_level to 1 when admission_status is "new"
    // Use functional setFormData so back-to-back calls don't overwrite each other
    setFormData((prev) => {
      const updatedFormData = { ...prev, [field]: processedValue };
      if (field === "admission_status" && value === "new") {
        updatedFormData.year_level = 1;
      }
      return updatedFormData;
    });

    // Clear error for this field when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Trigger duplicate check when name or birthdate fields change
    const nameFields: (keyof EnrollmentFormData)[] = [
      "first_name",
      "family_name",
      "middle_name",
      "birthdate",
    ];
    if (nameFields.includes(field)) {
      debouncedDuplicateCheck({
        first_name: field === "first_name" ? (processedValue as string) : formData.first_name,
        family_name: field === "family_name" ? (processedValue as string) : formData.family_name,
        middle_name: field === "middle_name" ? (processedValue as string) : formData.middle_name,
        birthdate: field === "birthdate" ? (processedValue as string) : formData.birthdate,
      });
    }
    
    // Clear year_level error when admission_status changes
    if (field === "admission_status" && fieldErrors.year_level) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.year_level;
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (value: string) => {
    setFormData((prev) => {
      const currentArray = prev.requirements;
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item) => item !== value)
        : [...currentArray, value];
      return { ...prev, requirements: newArray };
    });
    // Clear error for requirements when user selects/deselects
    if (fieldErrors.requirements) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.requirements;
        return newErrors;
      });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    // Clear photo error when user uploads a new photo
    if (fieldErrors.photo) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.photo;
        return newErrors;
      });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPG, PNG, GIF, etc.)");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      alert(
        "Image file size must be less than 5MB. Please choose a smaller image.",
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Cleanup previous preview URL if it's a blob URL
    if (
      photoPreviewRef.current &&
      photoPreviewRef.current.startsWith("blob:")
    ) {
      URL.revokeObjectURL(photoPreviewRef.current);
      photoPreviewRef.current = null;
    }

    // Use FileReader to create a data URL (more stable than blob URL)
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result && result.length > 0 && result.startsWith("data:image/")) {
        console.log(
          "Image loaded successfully, data URL length:",
          result.length,
        );
        photoPreviewRef.current = result;
        setPhotoPreview(result);
        // Update form data
        setFormData((prev) => ({ ...prev, photo: file }));
      } else {
        console.error(
          "FileReader returned invalid result:",
          result ? "empty or invalid format" : "null",
        );
        // Fallback to blob URL
        try {
          const objectUrl = URL.createObjectURL(file);
          console.log("Using blob URL fallback");
          photoPreviewRef.current = objectUrl;
          setPhotoPreview(objectUrl);
          setFormData((prev) => ({ ...prev, photo: file }));
        } catch (error) {
          console.error("Error creating object URL:", error);
          alert("Failed to read image file. Please try again.");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      }
    };
    reader.onerror = () => {
      console.error("Error reading file");
      // Fallback to blob URL if FileReader fails
      try {
        const objectUrl = URL.createObjectURL(file);
        console.log("Using blob URL due to FileReader error");
        photoPreviewRef.current = objectUrl;
        setPhotoPreview(objectUrl);
        // Update form data
        setFormData((prev) => ({ ...prev, photo: file }));
      } catch (error) {
        console.error("Error creating object URL:", error);
        alert("Failed to process image file. Please try again.");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    // Block submission if duplicate is detected
    if (duplicateError) {
      setSubmitError({
        message: "Duplicate Enrollment Detected",
        details:
          "A student with this name already exists in the system. Please verify the student information or contact the registrar.",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    // Auto-set year_level to 1 for new students
    const finalFormData = { ...formData };
    if (finalFormData.admission_status === "new") {
      finalFormData.year_level = 1;
    }

    // Create FormData to handle file upload
    const submitData = new FormData();

    // Append all form fields
    Object.entries(finalFormData).forEach(([key, value]) => {
      if (key === "photo") {
        // Handle photo file separately
        if (value instanceof File) {
          submitData.append("photo", value);
        }
      } else if (key === "requirements" && Array.isArray(value)) {
        // Handle array fields
        submitData.append(key, JSON.stringify(value));
      } else if (key === "birthplace" && Array.isArray(value)) {
        // Handle birthplace array: [province, city]
        submitData.append(key, JSON.stringify(value));
      } else if (key === "major_id") {
        // Handle major_id as number
        if (value !== null && value !== undefined && value !== 0) {
          submitData.append(key, String(value));
        }
      } else if (key === "year_level") {
        // Handle year_level as number
        if (value !== null && value !== undefined && value !== 0) {
          submitData.append(key, String(value));
        }
      } else if (value !== null && value !== undefined) {
        submitData.append(key, String(value));
      }
    });

    Axios.post("/api/auth/enroll", submitData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
      .then((response) => {
        console.log("Enrollment submitted successfully:", response.data);
        setLastSubmittedData(finalFormData);
        setLastSubmittedPhotoPreview(photoPreviewRef.current || photoPreview);
        setIsSubmitting(false);
        setSubmitSuccess(true);
        // Reset form after successful submission
        setTimeout(async () => {
          setFormData(initialFormData);
          setPhotoPreview(null);
          setCurrentPage(1); // Reset to first page
          setFieldErrors({}); // Clear any field errors
          setDuplicateError(null); // Clear duplicate error
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          // Regenerate student number for new enrollment
          await generateStudentId();
        }, 2000);
      })
      .catch((error) => {
        console.error("Error submitting enrollment:", error);
        setIsSubmitting(false);
        setSubmitError({
          message:
            error.response?.data?.error || "Failed to submit enrollment form.",
          details:
            error.response?.data?.message ||
            "Please check your information and try again.",
        });
      });
  };

  // Validation functions for each page
  // Page 1: Student Information
  const validatePage1 = (): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const errors: Record<string, string> = {};

    // Student number is auto-generated, no validation needed

    if (!formData.family_name?.trim()) {
      errors.family_name = "Family name is required";
    }
    if (!formData.first_name?.trim()) {
      errors.first_name = "First name is required";
    }

    // Block if duplicate check is still in progress
    if (isCheckingDuplicate) {
      errors.duplicate = "Please wait while we check for existing enrollments.";
    }

    // Block if duplicate is detected
    if (duplicateError) {
      errors.duplicate =
        "A student with this name already exists. Cannot proceed with enrollment.";
    }

    if (!formData.sex) {
      errors.sex = "Please select a sex";
    }
    if (!formData.civil_status) {
      errors.civil_status = "Please select a civil status";
    }
    if (!formData.birthdate) {
      errors.birthdate = "Birthdate is required";
    } else {
      const birthDate = new Date(formData.birthdate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
      
      if (actualAge < 15) {
        errors.birthdate = "Student must be at least 15 years old";
      }
      if (birthDate > today) {
        errors.birthdate = "Birthdate cannot be in the future";
      }
      if (actualAge > 100) {
        errors.birthdate = "Please enter a valid birthdate";
      }
    }
    // Validate birthplace array: must have both province and city
    if (!Array.isArray(formData.birthplace) || formData.birthplace.length < 2 || !formData.birthplace[0] || !formData.birthplace[1]) {
      errors.birthplace = "Birthplace province and city are required";
    }
    if (!formData.complete_address?.trim()) {
      errors.complete_address = "Complete address is required";
    }
    
    if (!formData.contact_number?.trim()) {
      errors.contact_number = "Contact number is required";
    } else if (
      !/^[0-9]{10,11}$/.test(formData.contact_number.replace(/\D/g, ""))
    ) {
      errors.contact_number =
        "Please enter a valid contact number (10-11 digits)";
    }
    if (!formData.email_address?.trim()) {
      errors.email_address = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_address)) {
      errors.email_address = "Please enter a valid email address";
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Page 2: Emergency Information
  const validatePage2 = (): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const errors: Record<string, string> = {};

    if (!formData.emergency_contact_name?.trim()) {
      errors.emergency_contact_name = "Emergency contact name is required";
    }
    if (!formData.emergency_relationship) {
      errors.emergency_relationship = "Please select a relationship";
    }
    if (!formData.emergency_contact_number?.trim()) {
      errors.emergency_contact_number = "Emergency contact number is required";
    } else if (
      !/^[0-9]{10,11}$/.test(
        formData.emergency_contact_number.replace(/\D/g, ""),
      )
    ) {
      errors.emergency_contact_number =
        "Please enter a valid contact number (10-11 digits)";
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Page 3: Educational Background
  const validatePage3 = (): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const errors: Record<string, string> = {};

    if (!formData.last_school_attended?.trim()) {
      errors.last_school_attended = "Last school attended is required";
    }
    if (!formData.previous_school_year?.trim()) {
      errors.previous_school_year = "Previous school year is required";
    }
    if (!formData.program_shs?.trim()) {
      errors.program_shs = "Program (SHS) is required";
    }
    if (!formData.remarks?.trim()) {
      errors.remarks = "Remarks is required";
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Page 4: Admission Information
  const validatePage4 = (): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const errors: Record<string, string> = {};

    if (!formData.admission_status) {
      errors.admission_status = "Please select an admission status";
    }
    if (!formData.course_program || formData.course_program === "0" || formData.course_program === "") {
      errors.course_program = "Please select a program";
    }
    // If program has majors, major must be selected
    if (selectedProgramHasMajors && (!formData.major_id || formData.major_id === 0)) {
      errors.major_id = "Please select a major";
    }
    // If program has no majors, department should be set (automatically from program)
    if (!selectedProgramHasMajors && (!formData.department || formData.department === 0)) {
      errors.department = "Department is required";
    }
    if (!formData.term) {
      errors.term = "Please select a term";
    }
    // Year level is required for transferees
    if (formData.admission_status === "transferee" && (!formData.year_level || formData.year_level === 0)) {
      errors.year_level = "Please select a year level";
    }
    if (!formData.academic_year?.trim()) {
      errors.academic_year = "Academic year is required";
    }
    if (!formData.photo) {
      errors.photo = "Please upload a student photo";
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Page 5: Admission Requirements
  const validatePage5 = (): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const errors: Record<string, string> = {};

    if (!formData.requirements || formData.requirements.length === 0) {
      errors.requirements = "Please select at least one requirement";
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const validateCurrentPage = (): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    switch (currentPage) {
      case 1:
        return validatePage1();
      case 2:
        return validatePage2();
      case 3:
        return validatePage3();
      case 4:
        return validatePage4();
      case 5:
        return validatePage5();
      default:
        return { isValid: true, errors: {} };
    }
  };

  const nextPage = async () => {
    if (currentPage < TOTAL_PAGES) {
      // For page 1 (Student Information), force a synchronous duplicate check before proceeding
      // Only check if all required fields are filled: first_name, family_name, and birthdate
      // middle_name is optional, so it can be empty
      if (currentPage === 1 && formData.first_name && formData.family_name && formData.birthdate) {
        // Cancel any pending debounced check
        if (duplicateCheckTimeoutRef.current) {
          clearTimeout(duplicateCheckTimeoutRef.current);
        }

        // Force an immediate duplicate check and wait for it
        setIsCheckingDuplicate(true);
        try {
          const response = await Axios.post(
            "/api/auth/enroll/check-duplicate",
            {
              first_name: formData.first_name,
              family_name: formData.family_name,
              middle_name: formData.middle_name,
              birthdate: formData.birthdate,
            },
          );

          if (response.data.isDuplicate) {
            setDuplicateError(response.data.message);
            setIsCheckingDuplicate(false);
            setValidationError({
              isOpen: true,
              message:
                "A student with this name already exists. Cannot proceed with enrollment.",
            });
            return;
          } else {
            setDuplicateError(null);
          }
        } catch (error) {
          console.error("Error checking for duplicate:", error);
        } finally {
          setIsCheckingDuplicate(false);
        }
      }

      const validation = validateCurrentPage();

      if (!validation.isValid) {
        setFieldErrors(validation.errors);

        // Show specific message for duplicate error
        const errorMessage = validation.errors.duplicate
          ? validation.errors.duplicate
          : "Please complete all required fields before proceeding to the next step.";

        setValidationError({
          isOpen: true,
          message: errorMessage,
        });
        // Scroll to first error
        setTimeout(() => {
          const firstErrorField = Object.keys(validation.errors)[0];
          const element =
            document.querySelector(`[name="${firstErrorField}"]`) ||
            document.querySelector(`[data-field="${firstErrorField}"]`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            (element as HTMLElement).focus();
          }
        }, 100);
        return;
      }

      // Clear errors if validation passes
      setFieldErrors({});
      setValidationError({ isOpen: false, message: "" });
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= TOTAL_PAGES) {
      setCurrentPage(page);
    }
  };

  const removePhoto = () => {
    // Cleanup blob URL if it exists
    if (
      photoPreviewRef.current &&
      photoPreviewRef.current.startsWith("blob:")
    ) {
      URL.revokeObjectURL(photoPreviewRef.current);
    }
    photoPreviewRef.current = null;
    setPhotoPreview(null);
    setFormData((prev) => ({ ...prev, photo: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePhotoError = () => {
    removePhoto();
    alert("Failed to load image. Please try uploading again.");
  };

  // Progress calculation
  const progress = (currentPage / TOTAL_PAGES) * 100;
  // Show all active programs (no longer filtered by department)
  const filteredCoursePrograms = useMemo(() => {
    return programs
      .filter((program) => program.status === "active")
      .map((program) => ({
        id: program.id,
        name: program.name,
        department_id: program.department_id,
      }));
  }, [programs]);
  return {
    // State
    currentPage,
    formData,
    photoPreview,
    fileInputRef,
    progress,
    TOTAL_PAGES,
    filteredCoursePrograms,
    departments,
    isSubmitting,
    submitSuccess,
    submitError,
    lastSubmittedData,
    lastSubmittedPhotoPreview,
    fieldErrors,
    validationError,
    setValidationError,

    // Functions
    getTodayDate,
    handleDepartmentChange,
    handleProgramChange,
    handleMajorChange,
    handleInputChange,
    handleCheckboxChange,
    handlePhotoUpload,
    handleSubmit,
    nextPage,
    prevPage,
    goToPage,
    removePhoto,
    handlePhotoError,
    setSubmitSuccess,
    setSubmitError,
    validateCurrentPage,

    // Duplicate checking
    duplicateError,
    isCheckingDuplicate,

    // Program/Major state
    majors,
    selectedProgramHasMajors,
  };
};
