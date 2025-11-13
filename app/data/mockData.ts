import {
  Student,
  Course,
  Enrollment,
  EnrollmentTrend,
  ForecastData,
  Section,
} from "../types";

export const mockStudents: Student[] = [
  {
    id: 1,
    firstName: "John",
    lastName: "Doe",
    middleName: "Alexander",
    suffix: "Jr.",
    gender: "Male",
    email: "john.doe@example.com",
    date_of_birth: "2000-01-15",
    dateOfBirth: "2000-01-15",
    place_of_birth: "Manila, Philippines",
    nationality: "Filipino",
    civilStatus: "Single",
    street: "123 Main Street",
    barangay: "Barangay 1",
    city: "Manila",
    province: "Metro Manila",
    postalCode: "1000",
    fatherName: "Robert Doe",
    motherName: "Maria Doe",
    guardianName: "Robert Doe",
    guardianAddress: "123 Main Street, Barangay 1, Manila",
    guardianContact: "09171234567",
    course_id: 1,
    yearLevel: 1,
    section_id: 1,
    status: "enrolled",
    academic_year: "2024-2025",
    enrollmentDate: "2024-08-15",
  },
  {
    id: 2,
    firstName: "Maria",
    lastName: "Santos",
    middleName: "Cruz",
    gender: "Female",
    email: "maria.santos@example.com",
    date_of_birth: "2001-03-22",
    dateOfBirth: "2001-03-22",
    place_of_birth: "Quezon City, Philippines",
    nationality: "Filipino",
    civilStatus: "Single",
    street: "456 Oak Avenue",
    barangay: "Barangay 2",
    city: "Quezon City",
    province: "Metro Manila",
    postalCode: "1100",
    fatherName: "Jose Santos",
    motherName: "Ana Santos",
    guardianName: "Ana Santos",
    guardianAddress: "456 Oak Avenue, Barangay 2, Quezon City",
    guardianContact: "09181234567",
    course_id: 2,
    yearLevel: 2,
    section_id: 2,
    status: "enrolled",
    academic_year: "2024-2025",
    enrollmentDate: "2024-08-16",
  },
  {
    id: 3,
    firstName: "Carlos",
    lastName: "Reyes",
    middleName: "Miguel",
    gender: "Male",
    email: "carlos.reyes@example.com",
    date_of_birth: "1999-07-10",
    dateOfBirth: "1999-07-10",
    place_of_birth: "Makati, Philippines",
    nationality: "Filipino",
    civilStatus: "Single",
    street: "789 Pine Road",
    barangay: "Poblacion",
    city: "Makati",
    province: "Metro Manila",
    postalCode: "1200",
    fatherName: "Eduardo Reyes",
    motherName: "Carmen Reyes",
    guardianName: "Eduardo Reyes",
    guardianAddress: "789 Pine Road, Poblacion, Makati",
    guardianContact: "09191234567",
    course_id: 1,
    yearLevel: 3,
    section_id: 1,
    status: "enrolled",
    academic_year: "2024-2025",
    enrollmentDate: "2024-08-17",
  },
  {
    id: 4,
    firstName: "Anna",
    lastName: "Garcia",
    middleName: "Lopez",
    gender: "Female",
    email: "anna.garcia@example.com",
    date_of_birth: "2000-11-05",
    dateOfBirth: "2000-11-05",
    place_of_birth: "Pasig, Philippines",
    nationality: "Filipino",
    civilStatus: "Single",
    street: "321 Elm Street",
    barangay: "San Miguel",
    city: "Pasig",
    province: "Metro Manila",
    postalCode: "1600",
    fatherName: "Ricardo Garcia",
    motherName: "Elena Garcia",
    guardianName: "Elena Garcia",
    guardianAddress: "321 Elm Street, San Miguel, Pasig",
    guardianContact: "09201234567",
    course_id: 3,
    yearLevel: 1,
    section_id: 3,
    status: "enrolled",
    academic_year: "2024-2025",
    enrollmentDate: "2024-08-18",
  },
  {
    id: 5,
    firstName: "Michael",
    lastName: "Tan",
    middleName: "Benjamin",
    gender: "Male",
    email: "michael.tan@example.com",
    date_of_birth: "2001-09-12",
    dateOfBirth: "2001-09-12",
    place_of_birth: "Taguig, Philippines",
    nationality: "Filipino",
    civilStatus: "Single",
    street: "555 Maple Drive",
    barangay: "Fort Bonifacio",
    city: "Taguig",
    province: "Metro Manila",
    postalCode: "1630",
    fatherName: "William Tan",
    motherName: "Grace Tan",
    guardianName: "William Tan",
    guardianAddress: "555 Maple Drive, Fort Bonifacio, Taguig",
    guardianContact: "09211234567",
    course_id: 2,
    yearLevel: 2,
    section_id: 2,
    status: "enrolled",
    academic_year: "2024-2025",
    enrollmentDate: "2024-08-19",
  },
];

export const mockCourses: Course[] = [
  {
    id: "1",
    code: "BSCS",
    name: "Bachelor of Science in Computer Science",
    credits: 120,
    instructor: "Dr. Smith Johnson",
    semester: "1st Semester",
    maxCapacity: 40,
    currentEnrollment: 35,
    department: "College of Computer Studies",
  },
  {
    id: "2",
    code: "BSIT",
    name: "Bachelor of Science in Information Technology",
    credits: 120,
    instructor: "Prof. Jane Doe",
    semester: "1st Semester",
    maxCapacity: 45,
    currentEnrollment: 40,
    department: "College of Computer Studies",
  },
  {
    id: "3",
    code: "BSA",
    name: "Bachelor of Science in Accountancy",
    credits: 130,
    instructor: "CPA Maria Cruz",
    semester: "1st Semester",
    maxCapacity: 35,
    currentEnrollment: 30,
    department: "College of Business Administration",
  },
  {
    id: "4",
    code: "BSBA",
    name: "Bachelor of Science in Business Administration",
    credits: 120,
    instructor: "Dr. Robert Lee",
    semester: "1st Semester",
    maxCapacity: 50,
    currentEnrollment: 45,
    department: "College of Business Administration",
  },
  {
    id: "5",
    code: "BSN",
    name: "Bachelor of Science in Nursing",
    credits: 140,
    instructor: "Dr. Angela Santos",
    semester: "1st Semester",
    maxCapacity: 30,
    currentEnrollment: 28,
    department: "College of Nursing",
  },
];

export const mockSections: Section[] = [
  {
    id: 1,
    courseId: 1,
    section_name: "BSCS-1A",
    advisor: "Prof. John Smith",
    student_count: 35,
    status: 1,
  },
  {
    id: 2,
    courseId: 2,
    section_name: "BSIT-2B",
    advisor: "Prof. Jane Doe",
    student_count: 40,
    status: 1,
  },
  {
    id: 3,
    courseId: 3,
    section_name: "BSA-1C",
    advisor: "CPA Maria Cruz",
    student_count: 30,
    status: 1,
  },
  {
    id: 4,
    courseId: 4,
    section_name: "BSBA-3A",
    advisor: "Dr. Robert Lee",
    student_count: 45,
    status: 1,
  },
  {
    id: 5,
    courseId: 5,
    section_name: "BSN-1A",
    advisor: "Dr. Angela Santos",
    student_count: 28,
    status: 1,
  },
];

export const mockEnrollments: Enrollment[] = [
  {
    id: "1",
    studentId: "1",
    courseId: "1",
    enrollmentDate: "2024-08-15",
    status: "enrolled",
  },
  {
    id: "2",
    studentId: "2",
    courseId: "2",
    enrollmentDate: "2024-08-16",
    status: "enrolled",
  },
  {
    id: "3",
    studentId: "3",
    courseId: "1",
    enrollmentDate: "2024-08-17",
    status: "enrolled",
  },
  {
    id: "4",
    studentId: "4",
    courseId: "3",
    enrollmentDate: "2024-08-18",
    status: "enrolled",
  },
  {
    id: "5",
    studentId: "5",
    courseId: "2",
    enrollmentDate: "2024-08-19",
    status: "enrolled",
  },
];

export const mockEnrollmentTrends: EnrollmentTrend[] = [
  {
    date: "2024-08-01",
    totalEnrollments: 150,
    newEnrollments: 25,
    courseCompletions: 5,
  },
  {
    date: "2024-08-15",
    totalEnrollments: 175,
    newEnrollments: 30,
    courseCompletions: 5,
  },
  {
    date: "2024-09-01",
    totalEnrollments: 200,
    newEnrollments: 28,
    courseCompletions: 3,
  },
  {
    date: "2024-09-15",
    totalEnrollments: 225,
    newEnrollments: 27,
    courseCompletions: 2,
  },
  {
    date: "2024-10-01",
    totalEnrollments: 248,
    newEnrollments: 25,
    courseCompletions: 2,
  },
];

export const mockForecastData: ForecastData[] = [
  {
    period: "Nov 2024",
    predicted: 270,
    confidence: 85,
    trend: "increasing",
  },
  {
    period: "Dec 2024",
    predicted: 290,
    confidence: 82,
    trend: "increasing",
  },
  {
    period: "Jan 2025",
    predicted: 310,
    confidence: 78,
    trend: "increasing",
  },
  {
    period: "Feb 2025",
    predicted: 325,
    confidence: 75,
    trend: "stable",
  },
  {
    period: "Mar 2025",
    predicted: 340,
    confidence: 72,
    trend: "increasing",
  },
];

// Department and Course Program mock data for enrollment form
export const mockDepartments = [
  {
    id: "CCS",
    name: "College of Computer Studies",
    courses: [
      { id: "BSCS", name: "Bachelor of Science in Computer Science" },
      { id: "BSIT", name: "Bachelor of Science in Information Technology" },
      { id: "BSIS", name: "Bachelor of Science in Information Systems" },
    ],
  },
  {
    id: "CBA",
    name: "College of Business Administration",
    courses: [
      { id: "BSA", name: "Bachelor of Science in Accountancy" },
      { id: "BSBA", name: "Bachelor of Science in Business Administration" },
      {
        id: "BSAIS",
        name: "Bachelor of Science in Accounting Information System",
      },
    ],
  },
  {
    id: "CN",
    name: "College of Nursing",
    courses: [{ id: "BSN", name: "Bachelor of Science in Nursing" }],
  },
  {
    id: "COE",
    name: "College of Engineering",
    courses: [
      { id: "BSCE", name: "Bachelor of Science in Civil Engineering" },
      { id: "BSEE", name: "Bachelor of Science in Electrical Engineering" },
      { id: "BSME", name: "Bachelor of Science in Mechanical Engineering" },
    ],
  },
  {
    id: "CAS",
    name: "College of Arts and Sciences",
    courses: [
      { id: "AB-PSYCH", name: "Bachelor of Arts in Psychology" },
      { id: "AB-COMM", name: "Bachelor of Arts in Communication" },
      { id: "BS-PSYCH", name: "Bachelor of Science in Psychology" },
    ],
  },
];

// Year levels for enrollment
export const mockYearLevels = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
];

// Semester options
export const mockSemesters = [
  { value: "1st", label: "1st Semester" },
  { value: "2nd", label: "2nd Semester" },
  { value: "Summer", label: "Summer" },
];

// Academic years
export const mockAcademicYears = [
  { value: "2024-2025", label: "2024-2025" },
  { value: "2025-2026", label: "2025-2026" },
  { value: "2026-2027", label: "2026-2027" },
];

// Course Programs for enrollment form (flat list for filtering by department)
export const mockCoursePrograms = [
  // College of Computer Studies
  {
    id: "BSCS",
    name: "Bachelor of Science in Computer Science",
    departmentId: "CCS",
  },
  {
    id: "BSIT",
    name: "Bachelor of Science in Information Technology",
    departmentId: "CCS",
  },
  {
    id: "BSIS",
    name: "Bachelor of Science in Information Systems",
    departmentId: "CCS",
  },

  // College of Business Administration
  {
    id: "BSA",
    name: "Bachelor of Science in Accountancy",
    departmentId: "CBA",
  },
  {
    id: "BSBA",
    name: "Bachelor of Science in Business Administration",
    departmentId: "CBA",
  },
  {
    id: "BSAIS",
    name: "Bachelor of Science in Accounting Information System",
    departmentId: "CBA",
  },

  // College of Nursing
  { id: "BSN", name: "Bachelor of Science in Nursing", departmentId: "CN" },

  // College of Engineering
  {
    id: "BSCE",
    name: "Bachelor of Science in Civil Engineering",
    departmentId: "COE",
  },
  {
    id: "BSEE",
    name: "Bachelor of Science in Electrical Engineering",
    departmentId: "COE",
  },
  {
    id: "BSME",
    name: "Bachelor of Science in Mechanical Engineering",
    departmentId: "COE",
  },

  // College of Arts and Sciences
  {
    id: "AB-PSYCH",
    name: "Bachelor of Arts in Psychology",
    departmentId: "CAS",
  },
  {
    id: "AB-COMM",
    name: "Bachelor of Arts in Communication",
    departmentId: "CAS",
  },
  {
    id: "BS-PSYCH",
    name: "Bachelor of Science in Psychology",
    departmentId: "CAS",
  },
];
