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
  department: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrollmentDate: string;
  grade?: string;
  status: "enrolled" | "completed" | "dropped" | "pending";
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
  courseId: number;
  section_name: string;
  advisor: string;
  student_count: number;
  status: number;
  courseName?: string;
}
