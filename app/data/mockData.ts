import {
  Student,
  Course,
  EnrollmentTrend,
  ForecastData,
  Section,
  Subject,
  Program,
  Department,
  Major,
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
    department: 1,
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
    department: 1,
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
    department: 2,
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
    department: 2,
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
    department: 3,
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

export const mockEnrollments = [
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
export const mockDepartmentsForEnrollment = [
  {
    id: 1,
    name: "College of Computer Studies",
    courses: [
      { id: "BSCS", name: "Bachelor of Science in Computer Science" },
      { id: "BSIT", name: "Bachelor of Science in Information Technology" },
      { id: "BSIS", name: "Bachelor of Science in Information Systems" },
    ],
  },
  {
    id: 2,
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
    id: 3,
    name: "College of Nursing",
    courses: [{ id: "BSN", name: "Bachelor of Science in Nursing" }],
  },
  {
    id: 4,
    name: "College of Engineering",
    courses: [
      { id: "BSCE", name: "Bachelor of Science in Civil Engineering" },
      { id: "BSEE", name: "Bachelor of Science in Electrical Engineering" },
      { id: "BSME", name: "Bachelor of Science in Mechanical Engineering" },
    ],
  },
  {
    id: 5,
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
    departmentId: 1,
  },
  {
    id: "BSIT",
    name: "Bachelor of Science in Information Technology",
    departmentId: 1,
  },
  {
    id: "BSIS",
    name: "Bachelor of Science in Information Systems",
    departmentId: 1,
  },

  // College of Business Administration
  {
    id: "BSA",
    name: "Bachelor of Science in Accountancy",
    departmentId: 2,
  },
  {
    id: "BSBA",
    name: "Bachelor of Science in Business Administration",
    departmentId: 2,
  },
  {
    id: "BSAIS",
    name: "Bachelor of Science in Accounting Information System",
    departmentId: 2,
  },

  // College of Nursing
  { id: "BSN", name: "Bachelor of Science in Nursing", departmentId: 3 },
  // College of Engineering
  {
    id: "BSCE",
    name: "Bachelor of Science in Civil Engineering",
    departmentId: 4,
  },
  {
    id: "BSEE",
    name: "Bachelor of Science in Electrical Engineering",
    departmentId: 4,
  },
  {
    id: "BSME",
    name: "Bachelor of Science in Mechanical Engineering",
    departmentId: 4,
  },

  // College of Arts and Sciences
  {
    id: "AB-PSYCH",
    name: "Bachelor of Arts in Psychology",
    departmentId: 5,
  },
  {
    id: "AB-COMM",
    name: "Bachelor of Arts in Communication",
    departmentId: 5,
  },
  {
    id: "BS-PSYCH",
    name: "Bachelor of Science in Psychology",
    departmentId: 5,
  },
];

// File Maintenance Mock Data
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

export const mockBuildings: Building[] = [
  {
    id: 1,
    name: "Main Building",
    code: "MB",
    description: "Main administrative and academic building",
    address: "123 University Avenue",
    floor_count: 5,
    status: "active",
  },
  {
    id: 2,
    name: "Science Building",
    code: "SB",
    description: "Houses science laboratories and classrooms",
    address: "124 University Avenue",
    floor_count: 4,
    status: "active",
  },
  {
    id: 3,
    name: "Engineering Building",
    code: "EB",
    description: "Engineering laboratories and classrooms",
    address: "125 University Avenue",
    floor_count: 3,
    status: "active",
  },
  {
    id: 4,
    name: "Library Building",
    code: "LB",
    description: "Main library and study areas",
    address: "126 University Avenue",
    floor_count: 3,
    status: "active",
  },
];

export const mockRooms: Room[] = [
  {
    id: 1,
    buildingId: 1,
    buildingName: "Main Building",
    roomNumber: "MB-101",
    capacity: 40,
    roomType: "classroom",
    floor: 1,
    status: "available",
  },
  {
    id: 2,
    buildingId: 1,
    buildingName: "Main Building",
    roomNumber: "MB-102",
    capacity: 35,
    roomType: "classroom",
    floor: 1,
    status: "available",
  },
  {
    id: 3,
    buildingId: 2,
    buildingName: "Science Building",
    roomNumber: "SB-201",
    capacity: 30,
    roomType: "laboratory",
    floor: 2,
    status: "occupied",
  },
  {
    id: 4,
    buildingId: 2,
    buildingName: "Science Building",
    roomNumber: "SB-202",
    capacity: 25,
    roomType: "laboratory",
    floor: 2,
    status: "available",
  },
  {
    id: 5,
    buildingId: 4,
    buildingName: "Library Building",
    roomNumber: "LB-301",
    capacity: 100,
    roomType: "library",
    floor: 3,
    status: "available",
  },
  {
    id: 6,
    buildingId: 1,
    buildingName: "Main Building",
    roomNumber: "MB-501",
    capacity: 200,
    roomType: "auditorium",
    floor: 5,
    status: "available",
  },
];

export const mockDepartments: Department[] = [
  {
    id: 1,
    code: "CCS",
    name: "College of Computer Studies",
    description: "Computer Science and Information Technology programs",
    buildingId: 2,
    buildingName: "Science Building",
    head: "Dr. John Smith",
    status: "active",
  },
  {
    id: 2,
    code: "CBA",
    name: "College of Business Administration",
    description: "Business and Accountancy programs",
    buildingId: 1,
    buildingName: "Main Building",
    head: "Dr. Maria Santos",
    status: "active",
  },
  {
    id: 3,
    code: "CN",
    name: "College of Nursing",
    description: "Nursing and Health Sciences programs",
    buildingId: 1,
    buildingName: "Main Building",
    head: "Dr. Angela Cruz",
    status: "active",
  },
  {
    id: 4,
    code: "COE",
    name: "College of Engineering",
    description: "Engineering programs",
    buildingId: 3,
    buildingName: "Engineering Building",
    head: "Dr. Robert Lee",
    status: "active",
  },
  {
    id: 5,
    code: "CAS",
    name: "College of Arts and Sciences",
    description: "Liberal Arts and Sciences programs",
    buildingId: 1,
    buildingName: "Main Building",
    head: "Dr. Patricia Garcia",
    status: "active",
  },
];

export const mockFaculty: Faculty[] = [
  {
    id: 1,
    employeeId: "EMP001",
    firstName: "John",
    lastName: "Smith",
    middleName: "Michael",
    email: "john.smith@university.edu",
    phone: "09171234567",
    departmentId: 1,
    departmentName: "College of Computer Studies",
    position: "professor",
    specialization: "Artificial Intelligence",
    status: "active",
  },
  {
    id: 2,
    employeeId: "EMP002",
    firstName: "Maria",
    lastName: "Santos",
    middleName: "Cruz",
    email: "maria.santos@university.edu",
    phone: "09181234567",
    departmentId: 2,
    departmentName: "College of Business Administration",
    position: "associate professor",
    specialization: "Business Management",
    status: "active",
  },
  {
    id: 3,
    employeeId: "EMP003",
    firstName: "Angela",
    lastName: "Cruz",
    email: "angela.cruz@university.edu",
    phone: "09191234567",
    departmentId: 3,
    departmentName: "College of Nursing",
    position: "professor",
    specialization: "Medical-Surgical Nursing",
    status: "active",
  },
  {
    id: 4,
    employeeId: "EMP004",
    firstName: "Robert",
    lastName: "Lee",
    middleName: "James",
    email: "robert.lee@university.edu",
    phone: "09201234567",
    departmentId: 4,
    departmentName: "College of Engineering",
    position: "professor",
    specialization: "Civil Engineering",
    status: "active",
  },
  {
    id: 5,
    employeeId: "EMP005",
    firstName: "Patricia",
    lastName: "Garcia",
    email: "patricia.garcia@university.edu",
    phone: "09211234567",
    departmentId: 5,
    departmentName: "College of Arts and Sciences",
    position: "associate professor",
    specialization: "Psychology",
    status: "active",
  },
];

export const mockFees: Fee[] = [
  {
    id: 1,
    code: "TUITION",
    name: "Tuition Fee",
    description: "Regular tuition fee per unit",
    amount: 1500,
    category: "tuition",
    academic_year: "2024-2025",
    semester: "1st",
    status: "active",
  },
  {
    id: 2,
    code: "MISC",
    name: "Miscellaneous Fee",
    description: "General miscellaneous fee",
    amount: 5000,
    category: "miscellaneous",
    academic_year: "2024-2025",
    semester: "1st",
    status: "active",
  },
  {
    id: 3,
    code: "LAB-FEE",
    name: "Laboratory Fee",
    description: "Laboratory fee for science courses",
    amount: 2000,
    category: "laboratory",
    academic_year: "2024-2025",
    semester: "1st",
    status: "active",
  },
  {
    id: 4,
    code: "LIB-FEE",
    name: "Library Fee",
    description: "Library access and resources fee",
    amount: 500,
    category: "library",
    academic_year: "2024-2025",
    semester: "1st",
    status: "active",
  },
  {
    id: 5,
    code: "REG-FEE",
    name: "Registration Fee",
    description: "Student registration fee",
    amount: 1000,
    category: "miscellaneous",
    academic_year: "2024-2025",
    status: "active",
  },
];

export const mockPrograms: Program[] = [
  {
    id: 1,
    code: "BSCS",
    name: "Bachelor of Science in Computer Science",
    description: "Comprehensive program covering computer science fundamentals, programming, algorithms, and software engineering",
    department_id: 1,
    duration: 4,
    total_units: 120,
    status: "active",
  },
  {
    id: 2,
    code: "BSIT",
    name: "Bachelor of Science in Information Technology",
    description: "Focus on information systems, network administration, and IT infrastructure",
    department_id: 1,
    duration: 4,
    total_units: 120,
    status: "active",
  },
  {
    id: 3,
    code: "BSA",
    name: "Bachelor of Science in Accountancy",
    description: "Professional accounting program preparing students for CPA licensure",
    department_id: 2,
    duration: 4,
    total_units: 130,
    status: "active",
  },
  {
    id: 4,
    code: "BSBA",
    name: "Bachelor of Science in Business Administration",
    description: "General business administration with focus on management and entrepreneurship",
    department_id: 2,
    duration: 4,
    total_units: 120,
    status: "active",
  },
  {
    id: 5,
    code: "BSN",
    name: "Bachelor of Science in Nursing",
    description: "Professional nursing program preparing students for nursing licensure and practice",
    department_id: 3,
    duration: 4,
    total_units: 140,
    status: "active",
  },
  {
    id: 6,
    code: "BSCE",
    name: "Bachelor of Science in Civil Engineering",
    description: "Engineering program focusing on infrastructure, construction, and structural design",
    department_id: 4,
    duration: 5,
    total_units: 150,
    status: "active",
  },
  {
    id: 7,
    code: "BSEE",
    name: "Bachelor of Science in Electrical Engineering",
    description: "Engineering program covering electrical systems, electronics, and power generation",
    department_id: 4,
    duration: 5,
    total_units: 150,
    status: "active",
  },
  {
    id: 8,
    code: "AB-PSYCH",
    name: "Bachelor of Arts in Psychology",
    description: "Liberal arts program focusing on human behavior and mental processes",
    department_id: 5,
    duration: 4,
    total_units: 120,
    status: "active",
  },
];

export const mockMajors: Major[] = [
  {
    id: 1,
    code: "CS-SE",
    name: "Software Engineering",
    description: "Specialization in software development, system design, and software project management",
    program_id: 1,
    status: "active",
  },
  {
    id: 2,
    code: "CS-DS",
    name: "Data Science",
    description: "Focus on data analysis, machine learning, and big data technologies",
    program_id: 1,
    status: "active",
  },
  {
    id: 3,
    code: "CS-CY",
    name: "Cybersecurity",
    description: "Specialization in network security, ethical hacking, and information security",
    program_id: 1,
    status: "active",
  },
  {
    id: 4,
    code: "IT-NET",
    name: "Network Administration",
    description: "Focus on network infrastructure, server management, and system administration",
    program_id: 2,
    status: "active",
  },
  {
    id: 5,
    code: "IT-WEB",
    name: "Web Development",
    description: "Specialization in web technologies, frontend and backend development",
    program_id: 2,
    status: "active",
  },
  {
    id: 6,
    code: "BA-MGT",
    name: "Management",
    description: "Business management specialization focusing on leadership and organizational management",
    program_id: 4,
    status: "active",
  },
  {
    id: 7,
    code: "BA-MKT",
    name: "Marketing",
    description: "Marketing specialization covering digital marketing, brand management, and market research",
    program_id: 4,
    status: "active",
  },
  {
    id: 8,
    code: "CE-STR",
    name: "Structural Engineering",
    description: "Specialization in building design, structural analysis, and construction management",
    program_id: 6,
    status: "active",
  },
  {
    id: 9,
    code: "CE-GEO",
    name: "Geotechnical Engineering",
    description: "Focus on soil mechanics, foundation design, and geotechnical analysis",
    program_id: 6,
    status: "active",
  },
  {
    id: 10,
    code: "EE-PWR",
    name: "Power Systems",
    description: "Specialization in electrical power generation, transmission, and distribution",
    program_id: 7,
    status: "active",
  },
  {
    id: 11,
    code: "EE-ELEC",
    name: "Electronics",
    description: "Focus on electronic circuits, embedded systems, and digital electronics",
    program_id: 7,
    status: "active",
  },
];

export const mockSubjects: Subject[] = [
  {
    id: 1,
    code: "MATH101",
    name: "Calculus I",
    description: "Introduction to differential and integral calculus",
    units: 3,
    department_id: 1,
    departmentName: "College of Computer Studies",
    prerequisites: "None",
    status: "active",
  },
  {
    id: 2,
    code: "CS101",
    name: "Introduction to Computer Science",
    description: "Fundamentals of computer science and programming",
    units: 3,
    department_id: 1,
    departmentName: "College of Computer Studies",
    prerequisites: "None",
    status: "active",
  },
  {
    id: 3,
    code: "ENG101",
    name: "English Communication",
    description: "English language and communication skills",
    units: 3,
    department_id: 5,
    departmentName: "College of Arts and Sciences",
    prerequisites: "None",
    status: "active",
  },
  {
    id: 4,
    code: "PHYS101",
    name: "Physics I",
    description: "Mechanics, waves, and thermodynamics",
    units: 4,
    department_id: 1,
    departmentName: "College of Computer Studies",
    prerequisites: "MATH101",
    status: "active",
  },
  {
    id: 5,
    code: "ACCTG101",
    name: "Fundamentals of Accounting",
    description: "Basic accounting principles and practices",
    units: 3,
    department_id: 2,
    departmentName: "College of Business Administration",
    prerequisites: "None",
    status: "active",
  },
  {
    id: 6,
    code: "BIO101",
    name: "General Biology",
    description: "Introduction to biological sciences",
    units: 3,
    department_id: 3,
    departmentName: "College of Nursing",
    prerequisites: "None",
    status: "active",
  },
  {
    id: 7,
    code: "CS201",
    name: "Data Structures and Algorithms",
    description: "Advanced programming concepts and algorithm design",
    units: 3,
    department_id: 1,
    departmentName: "College of Computer Studies",
    prerequisites: "CS101",
    status: "active",
  },
  {
    id: 8,
    code: "MATH201",
    name: "Linear Algebra",
    description: "Vector spaces, matrices, and linear transformations",
    units: 3,
    department_id: 1,
    departmentName: "College of Computer Studies",
    prerequisites: "MATH101",
    status: "active",
  },
];
