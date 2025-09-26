export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  enrollmentDate: string;
  status: "active" | "inactive" | "graduated";
  gpa: number;
  major: string;
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
  id: string;
  username: string;
  email: string;
  role: "admin" | "instructor" | "student";
  passwordHash: string;
  createdAt: string;
}
