import { EnrollmentFormData } from "../../hooks/useEnrollmentForm";

export interface EnrollmentPageProps {
  formData: EnrollmentFormData;
  handleInputChange: (field: keyof EnrollmentFormData, value: string) => void;
  handleDepartmentChange?: (departmentId: number) => void;
  handleCheckboxChange?: (value: string) => void;
  filteredCoursePrograms?: Array<{ id: number; name: string }>;
  departments?: Array<{ id: number; name: string; code: string }>;
  photoPreview?: string | null;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  handlePhotoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePhoto?: () => void;
  handlePhotoError?: () => void;
  getTodayDate?: () => string;
  fieldErrors?: Record<string, string>;
}
