/**
 * SECTION MANAGEMENT API TYPES
 */

export interface CreateSectionRequest {
  programId: number;
  yearLevel: number;
  academicYear: string; // e.g., "2025-2026"
  semester: string; // 'First Semester', 'Second Semester', 'Summer'
  sectionName: string;
  advisor: string;
  maxCapacity: number;
}

export interface SectionResponse {
  id: number;
  programId: number;
  programCode?: string;
  programName?: string;
  yearLevel: number;
  academicYear: string; // e.g., "2025-2026"
  semester: string; // 'First Semester', 'Second Semester', 'Summer'
  sectionName: string;
  advisor: string;
  maxCapacity: number;
  studentCount: number;
  status: 'draft' | 'active' | 'locked' | 'closed';
  createdAt: string;
}

export interface CreateClassScheduleRequest {
  sectionId: number;
  curriculumCourseId: number;
  facultyId: number;
  roomId: number;
  dayOfWeek: string; // 'Monday', 'Tuesday', etc.
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  academicYear: string; // e.g., "2025-2026"
  semester: string; // 'First Semester', 'Second Semester', 'Summer'
}

export interface ClassScheduleResponse {
  id: number;
  sectionId: number;
  curriculumCourseId: number;
  facultyId: number;
  roomId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  academicYear: string; // e.g., "2025-2026"
  semester: string; // 'First Semester', 'Second Semester', 'Summer'
  status: 'active' | 'cancelled';
}

export interface ActivateSectionRequest {
  sectionId: number;
}

export interface BulkAssignStudentsRequest {
  sectionId: number;
  studentNumbers: string[];
  academicYear: string; // e.g., "2025-2026"
  semester: string; // 'First Semester', 'Second Semester', 'Summer'
  overrideCapacity?: boolean;
}

export interface BulkAssignStudentsResponse {
  sectionId: number;
  assigned: number;
  failed: Array<{
    studentNumber: string;
    reason: string;
  }>;
}

export interface SectionWithDetails extends SectionResponse {
  program?: {
    id: number;
    name: string;
    code: string;
  };
  scheduleCount?: number;
  availableSeats?: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}
