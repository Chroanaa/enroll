import { EnrollmentFormData } from "../../hooks/useEnrollmentForm";

export interface EnrollmentPageProps {
  formData: EnrollmentFormData;
  handleInputChange: (field: keyof EnrollmentFormData, value: string) => void;
  handleDepartmentChange?: (departmentId: number) => void;
  handleCheckboxChange?: (value: string) => void;
  filteredCoursePrograms?: Array<{
    id: string;
    name: string;
    departmentId: number;
  }>;
  photoPreview?: string | null;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  handlePhotoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePhoto?: () => void;
  handlePhotoError?: () => void;
  getTodayDate?: () => string;
}
