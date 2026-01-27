import { EnrollmentFormData } from "../../hooks/useEnrollmentForm";

export interface EnrollmentPageProps {
  formData: EnrollmentFormData;
  handleInputChange: (field: keyof EnrollmentFormData, value: string | string[]) => void;
  handleDepartmentChange?: (departmentId: number) => void;
  handleProgramChange?: (programId: number) => void;
  handleMajorChange?: (majorId: number) => void;
  handleCheckboxChange?: (value: string) => void;
  filteredCoursePrograms?: Array<{ id: number; name: string; department_id?: number }>;
  departments?: Array<{ id: number; name: string; code: string }>;
  majors?: Array<{ id: number; name: string; code: string; program_id: number }>;
  selectedProgramHasMajors?: boolean;
  photoPreview?: string | null;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  handlePhotoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePhoto?: () => void;
  handlePhotoError?: () => void;
  getTodayDate?: () => string;
  fieldErrors?: Record<string, string>;
  duplicateError?: string | null;
  isCheckingDuplicate?: boolean;
}
