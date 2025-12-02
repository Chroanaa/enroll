export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  gender: string;
  email: string;
  date_of_birth: string;
  place_of_birth: string;
  nationality: string;
  civilStatus: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  fatherName: string;
  motherName: string;
  guardianName?: string;
  guardianAddress?: string;
  guardianContact?: string;
  course_id: number;
  yearLevel: number;
  section_id: number;
  status: string;
  academic_year: string;
  dateOfBirth: string;
  enrollmentDate: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  instructor: string;
  semester: string;
  maxCapacity: number;
  currentEnrollment: number;
  department: number;
}

export interface EnrollmentTrend {
  date: string;
  totalEnrollments: number;
  newEnrollments: number;
  courseCompletions: number;
}

export interface ForecastData {
  period: string;
  predicted: number;
  confidence: number;
  trend: "increasing" | "decreasing" | "stable";
}
export interface User {
  id: Number;
  username: string;
  password: string;
  role: Number;
  status: Number;
}
export interface Section {
  id: number;
  program_id: number;
  section_name: string;
  advisor: string;
  student_count: number;
  status: string;
}

export interface Subject {
  id: number;
  code: string;
  name: string;
  description?: string;
  units: number;
  department_id: number;
  departmentName?: string;
  prerequisites?: string;
  status: "active" | "inactive";
}

// Enrollment Management Types
import { EnrollmentFormData } from "../hooks/useEnrollmentForm";

export interface Enrollment extends EnrollmentFormData {
  id: string;
  studentId: string;
  courseId: string;
  enrollmentDate: string;
  status: number;
}

export interface StatusColor {
  bg: string;
  text: string;
  border: string;
}

export interface EnrollmentStats {
  total: number;
  enrolled: number;
  completed: number;
  pending: number;
  dropped: number;
}

export interface DeleteConfirmationState {
  isOpen: boolean;
  enrollmentId: string | null;
  enrollmentName: string;
}

// File Maintenance Types
export interface Building {
  id: number;
  name: string;
  code: string;
  description?: string;
  address?: string;
  floor_count: number;
  status: "active" | "inactive";
}

export interface Room {
  id: number;
  building_id: number;
  room_number: string;
  capacity: number;
  room_type:
    | "classroom"
    | "laboratory"
    | "office"
    | "library"
    | "auditorium"
    | "other";
  floor: number;
  status: "available" | "occupied" | "maintenance";
}

export interface Department {
  id: number;
  code: string;
  name: string;
  description?: string;
  building_id?: number;
  buildingName?: string;
  head?: string;
  status: "active" | "inactive";
}

export interface Faculty {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  phone?: string;
  department_id: number;
  departmentName?: string;
  position:
    | "professor"
    | "associate professor"
    | "assistant professor"
    | "instructor"
    | "lecturer";
  specialization?: string;
  status: "active" | "inactive";
}

export interface Fee {
  id: number;
  code: string;
  name: string;
  description?: string;
  amount: number;
  category: "tuition" | "miscellaneous" | "laboratory" | "library" | "other";
  academic_year: string;
  semester?: string;
  status: "active" | "inactive";
}

export interface Program {
  id: number;
  code: string;
  name: string;
  description?: string;
  department_id?: number;
  departmentName?: string;
  duration?: number;
  total_units?: number;
  status: "active" | "inactive";
}

export interface Major {
  id: number;
  code: string;
  name: string;
  description?: string;
  program_id: number;
  programName?: string;
  status: "active" | "inactive";
}

// Curriculum Management Types
export interface CurriculumCourse {
  id: number;
  subject_id?: number;
  course_code: string;
  descriptive_title: string;
  units_lec?: number;
  units_lab?: number;
  units_total: number;
  prerequisite?: string;
  year_level: number;
  semester: 1 | 2;
}

export interface Curriculum {
  id: number;
  program_name: string;
  program_code: string;
  major?: string;
  effective_year: string;
  total_units: number;
  courses: CurriculumCourse[];
  status: "active" | "inactive";
}
export interface Building {
  id: number;
  name: string;
  code: string;
  description?: string;
  address?: string;
  floor_count: number;
  status: "active" | "inactive";
}
