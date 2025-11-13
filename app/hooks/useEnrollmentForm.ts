import { useState, useMemo, useRef, useEffect } from "react";
import { mockCoursePrograms } from "../data/mockData";

export interface EnrollmentFormData {
  // Page 1: Admission Information
  admissionDate: string;
  admissionStatus: string;
  term: string;
  department: string;
  courseProgram: string;
  photo: File | null;

  // Page 2: Admission Requirements
  requirements: string[];

  // Page 3: Student Information
  familyName: string;
  firstName: string;
  middleName: string;
  sex: string;
  civilStatus: string;
  birthdate: string;
  birthplace: string;
  completeAddress: string;
  contactNumber: string;
  emailAddress: string;

  // Page 4: Emergency Information
  emergencyContactName: string;
  emergencyRelationship: string;
  emergencyContactNumber: string;

  // Page 5: Educational Background
  lastSchoolAttended: string;
  schoolYear: string;
  programSHS: string;
  remarks: string;
}

const TOTAL_PAGES = 5;

const initialFormData: EnrollmentFormData = {
  // Page 1: Admission Information
  admissionDate: "",
  admissionStatus: "",
  term: "",
  department: "",
  courseProgram: "",
  photo: null,

  // Page 2: Admission Requirements
  requirements: [],

  // Page 3: Student Information
  familyName: "",
  firstName: "",
  middleName: "",
  sex: "",
  civilStatus: "",
  birthdate: "",
  birthplace: "",
  completeAddress: "",
  contactNumber: "",
  emailAddress: "",

  // Page 4: Emergency Information
  emergencyContactName: "",
  emergencyRelationship: "",
  emergencyContactNumber: "",

  // Page 5: Educational Background
  lastSchoolAttended: "",
  schoolYear: "",
  programSHS: "",
  remarks: "",
};

export const useEnrollmentForm = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<EnrollmentFormData>(initialFormData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoPreviewRef = useRef<string | null>(null);

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

  const filteredCoursePrograms = useMemo(() => {
    if (!formData.department) {
      return [];
    }
    return mockCoursePrograms.filter(
      (program) => program.departmentId === formData.department
    );
  }, [formData.department]);

  // Reset course program when department changes
  const handleDepartmentChange = (departmentId: string) => {
    setFormData((prev) => ({
      ...prev,
      department: departmentId,
      courseProgram: "",
    }));
  };

  const handleInputChange = (
    field: keyof EnrollmentFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (value: string) => {
    setFormData((prev) => {
      const currentArray = prev.requirements;
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item) => item !== value)
        : [...currentArray, value];
      return { ...prev, requirements: newArray };
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
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
    console.log("Form submitted:", formData);
    // Handle form submission here
  };

  const nextPage = () => {
    if (currentPage < TOTAL_PAGES) {
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

  return {
    // State
    currentPage,
    formData,
    photoPreview,
    fileInputRef,
    filteredCoursePrograms,
    progress,
    TOTAL_PAGES,

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
  };
};
