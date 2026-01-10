import { useState, useMemo, useRef, useEffect } from "react";
import Axios from "axios";
import { Department, Program } from "../types";
import { getDepartments } from "../utils/departmentUtils";
import { getPrograms } from "../utils/programUtils";
export interface EnrollmentFormData {
  // Page 1: Admission Information
  admission_date: string;
  admission_status: string;
  term: string;
  department: number;
  course_program: string;
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
  birthplace: string;
  complete_address: string;
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
  photo: null,
  academic_year: getCurrentAcademicYear(), // Set to current academic year by default

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
  birthplace: "",
  complete_address: "",
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
  const [formData, setFormData] = useState<EnrollmentFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoPreviewRef = useRef<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

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

  // Fetch departments and programs on mount
  // Generate student ID on mount
  useEffect(() => {
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

  // Reset course program when department changes
  const handleDepartmentChange = (departmentId: number) => {
    setFormData((prev) => ({
      ...prev,
      department: departmentId,
      course_program: "",
    }));
    // Clear errors for department and course_program when department changes
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.department;
      delete newErrors.course_program;
      return newErrors;
    });
  };

  const handleInputChange = (
    field: keyof EnrollmentFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
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
        "Image file size must be less than 5MB. Please choose a smaller image."
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
          result.length
        );
        photoPreviewRef.current = result;
        setPhotoPreview(result);
        // Update form data
        setFormData((prev) => ({ ...prev, photo: file }));
      } else {
        console.error(
          "FileReader returned invalid result:",
          result ? "empty or invalid format" : "null"
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

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    Axios.post("/api/auth/enroll", { formData })
      .then((response) => {
        console.log("Enrollment submitted successfully:", response.data);
        setIsSubmitting(false);
        setSubmitSuccess(true);
        // Reset form after successful submission
        setTimeout(() => {
          setFormData(initialFormData);
          setPhotoPreview(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
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
  const validatePage1 = (): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const errors: Record<string, string> = {};

    if (!formData.admission_status) {
      errors.admission_status = "Please select an admission status";
    }
    if (!formData.department || formData.department === 0) {
      errors.department = "Please select a department";
    }
    if (!formData.course_program) {
      errors.course_program = "Please select a course/program";
    }
    if (!formData.term) {
      errors.term = "Please select a term";
    }
    if (!formData.academic_year?.trim()) {
      errors.academic_year = "Academic year is required";
    }
    if (!formData.photo) {
      errors.photo = "Please upload a student photo";
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const validatePage2 = (): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const errors: Record<string, string> = {};

    if (!formData.requirements || formData.requirements.length === 0) {
      errors.requirements = "Please select at least one requirement";
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const validatePage3 = (): {
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
    if (!formData.sex) {
      errors.sex = "Please select a sex";
    }
    if (!formData.civil_status) {
      errors.civil_status = "Please select a civil status";
    }
    if (!formData.birthdate) {
      errors.birthdate = "Birthdate is required";
    }
    if (!formData.birthplace?.trim()) {
      errors.birthplace = "Birthplace is required";
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

  const validatePage4 = (): {
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
        formData.emergency_contact_number.replace(/\D/g, "")
      )
    ) {
      errors.emergency_contact_number =
        "Please enter a valid contact number (10-11 digits)";
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const validatePage5 = (): {
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

  const nextPage = () => {
    if (currentPage < TOTAL_PAGES) {
      const validation = validateCurrentPage();

      if (!validation.isValid) {
        setFieldErrors(validation.errors);
        setValidationError({
          isOpen: true,
          message:
            "Please complete all required fields before proceeding to the next step.",
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
  const filteredCoursePrograms = useMemo(() => {
    if (!formData.department) return [];
    return programs
      .filter((program) => program.department_id === formData.department)
      .map((program) => ({
        id: program.id,
        name: program.name,
      }));
  }, [formData.department, programs]);
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
    fieldErrors,
    validationError,
    setValidationError,

    // Functions
    getTodayDate,
    handleDepartmentChange,
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
  };
};
