/**
 * SECTION MANAGEMENT UTILITIES
 * API helpers for section operations
 */

const API_BASE = '/api';

// Type definitions
export interface CreateSectionRequest {
  programId: number;
  yearLevel: number;
  academicYear: string;
  semester: string;
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
  academicYear: string;
  semester: string;
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
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  academicYear: string;
  semester: string;
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
  academicYear: string;
  semester: string;
  status: string;
}

export interface BulkAssignStudentsRequest {
  sectionId: number;
  studentNumbers: string[];
  academicYear: string;
  semester: string;
}

export interface BulkAssignStudentsResponse {
  success: number;
  failed: number;
  errors: Array<{ studentNumber: string; error: string }>;
}

// Helper function
const normalizeSemesterToNumber = (semester: string): number => {
  const normalized = semester.trim().toLowerCase();
  if (normalized === '1' || normalized === 'first' || normalized === 'first semester') return 1;
  if (normalized === '2' || normalized === 'second' || normalized === 'second semester') return 2;
  if (normalized === '3' || normalized === 'summer') return 3;

  const parsed = parseInt(semester, 10);
  if (Number.isNaN(parsed)) {
    throw new Error('Invalid semester value');
  }
  return parsed;
};

/**
 * Create a new section
 */
export async function createSection(
  data: CreateSectionRequest
): Promise<SectionResponse> {
  const response = await fetch(`${API_BASE}/sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create section');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get all sections with optional filters
 */
export async function getSections(filters?: {
  programId?: number;
  yearLevel?: number;
  academicYear?: string;
  semester?: string;
  status?: string;
}): Promise<SectionResponse[]> {
  const params = new URLSearchParams();
  if (filters?.programId) params.append('programId', filters.programId.toString());
  if (filters?.yearLevel) params.append('yearLevel', filters.yearLevel.toString());
  if (filters?.academicYear) params.append('academicYear', filters.academicYear);
  if (filters?.semester) params.append('semester', filters.semester.toString());
  if (filters?.status) params.append('status', filters.status);

  const response = await fetch(`${API_BASE}/sections?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch sections');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get a single section by ID
 */
export async function getSectionById(id: number): Promise<SectionResponse> {
  const response = await fetch(`${API_BASE}/sections/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch section');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Activate a section
 */
export async function activateSection(
  id: number
): Promise<SectionResponse> {
  const response = await fetch(`${API_BASE}/sections/${id}/activate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to activate section');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Lock a section
 */
export async function lockSection(
  id: number
): Promise<SectionResponse> {
  const response = await fetch(`${API_BASE}/sections/${id}/lock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to lock section');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Create a class schedule
 */
export async function createClassSchedule(
  data: CreateClassScheduleRequest
): Promise<ClassScheduleResponse> {
  const response = await fetch(`${API_BASE}/class-schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create class schedule');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get class schedules with optional filters
 */
export async function getClassSchedules(filters?: {
  sectionId?: number;
  academicYear?: string;
  semester?: string;
  status?: string;
}): Promise<ClassScheduleResponse[]> {
  const params = new URLSearchParams();
  if (filters?.sectionId) params.append('sectionId', filters.sectionId.toString());
  if (filters?.academicYear) params.append('academicYear', filters.academicYear);
  if (filters?.semester) params.append('semester', filters.semester.toString());
  if (filters?.status) params.append('status', filters.status);

  const response = await fetch(`${API_BASE}/class-schedule?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch class schedules');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Bulk assign students to a section
 */
export async function bulkAssignStudents(
  data: BulkAssignStudentsRequest
): Promise<BulkAssignStudentsResponse> {
  const response = await fetch(`${API_BASE}/student-section`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok && response.status !== 207) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to assign students');
  }

  const result = await response.json();
  return result.data;
}

export async function getStudentAssignments(filters?: {
  sectionId?: number;
  academicYear?: string;
  semester?: string;
  studentNumber?: string;
}): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.sectionId) params.append('sectionId', filters.sectionId.toString());
  if (filters?.academicYear) params.append('academicYear', filters.academicYear);
  if (filters?.semester) params.append('semester', filters.semester.toString());
  if (filters?.studentNumber) params.append('studentNumber', filters.studentNumber);

  const response = await fetch(`${API_BASE}/student-section?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch student assignments');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get eligible students for section assignment
 */
export async function getEligibleStudents(
  programId: number,
  yearLevel: number,
  academicYear: string,
  semester: string
): Promise<any[]> {
  const params = new URLSearchParams({
    programId: programId.toString(),
    yearLevel: yearLevel.toString(),
    academicYear: academicYear,
    semester: semester.toString()
  });

  const response = await fetch(`${API_BASE}/eligible-students?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch eligible students');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get curriculum courses for section
 */
export async function getSectionCurriculum(
  programId: number,
  yearLevel: number,
  semester: string
): Promise<any[]> {
  const semesterNumber = normalizeSemesterToNumber(semester);
  const params = new URLSearchParams({
    programId: programId.toString(),
    yearLevel: yearLevel.toString(),
    semester: semesterNumber.toString()
  });

  const response = await fetch(`${API_BASE}/section-curriculum?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch curriculum');
  }

  const result = await response.json();
  return result.data;
}


/**
 * Get section schedules
 */
export async function getSectionSchedules(
  sectionId: number,
  academicYear: string,
  semester: string
): Promise<any[]> {
  const params = new URLSearchParams({
    sectionId: sectionId.toString(),
    academicYear: academicYear,
    semester: semester.toString()
  });

  const response = await fetch(`${API_BASE}/section-schedules?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch schedules');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete a class schedule
 */
export async function deleteClassSchedule(scheduleId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/class-schedule/${scheduleId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete schedule');
  }
}
