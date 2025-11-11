import { Student, Course, Enrollment, EnrollmentTrend, User } from "../types";

export const mockStudents: Student[] = [
  {
    id: "1",
    firstName: "Alice",
    lastName: "Johnson",
    email: "alice.johnson@university.edu",
    dateOfBirth: "2000-03-15",
    enrollmentDate: "2023-08-20",
    status: "active",
    gpa: 3.8,
    major: "Computer Science",
  },
  {
    id: "2",
    firstName: "Bob",
    lastName: "Smith",
    email: "bob.smith@university.edu",
    dateOfBirth: "1999-11-22",
    enrollmentDate: "2023-08-20",
    status: "active",
    gpa: 3.5,
    major: "Mathematics",
  },
  {
    id: "3",
    firstName: "Carol",
    lastName: "Williams",
    email: "carol.williams@university.edu",
    dateOfBirth: "2001-07-08",
    enrollmentDate: "2024-01-15",
    status: "active",
    gpa: 3.9,
    major: "Engineering",
  },
  {
    id: "4",
    firstName: "David",
    lastName: "Brown",
    email: "david.brown@university.edu",
    dateOfBirth: "2000-12-03",
    enrollmentDate: "2023-08-20",
    status: "graduated",
    gpa: 3.7,
    major: "Business",
  },
  {
    id: "5",
    firstName: "Emma",
    lastName: "Davis",
    email: "emma.davis@university.edu",
    dateOfBirth: "2002-01-28",
    enrollmentDate: "2024-08-25",
    status: "active",
    gpa: 3.6,
    major: "Psychology",
  },
];

export const mockCourses: Course[] = [
  {
    id: "1",
    code: "CS101",
    name: "Introduction to Computer Science",
    credits: 3,
    instructor: "Dr. Anderson",
    semester: "Fall 2024",
    maxCapacity: 120,
    currentEnrollment: 95,
    department: "Computer Science",
  },
  {
    id: "2",
    code: "MATH201",
    name: "Calculus II",
    credits: 4,
    instructor: "Prof. Martinez",
    semester: "Fall 2024",
    maxCapacity: 80,
    currentEnrollment: 72,
    department: "Mathematics",
  },
  {
    id: "3",
    code: "ENG150",
    name: "Engineering Mechanics",
    credits: 3,
    instructor: "Dr. Thompson",
    semester: "Fall 2024",
    maxCapacity: 60,
    currentEnrollment: 45,
    department: "Engineering",
  },
  {
    id: "4",
    code: "BUS300",
    name: "Strategic Management",
    credits: 3,
    instructor: "Prof. Wilson",
    semester: "Fall 2024",
    maxCapacity: 40,
    currentEnrollment: 38,
    department: "Business",
  },
  {
    id: "5",
    code: "PSY101",
    name: "Introduction to Psychology",
    credits: 3,
    instructor: "Dr. Garcia",
    semester: "Fall 2024",
    maxCapacity: 100,
    currentEnrollment: 85,
    department: "Psychology",
  },
];

export const mockEnrollments: Enrollment[] = [
  {
    id: "1",
    studentId: "1",
    courseId: "1",
    enrollmentDate: "2024-08-25",
    status: "enrolled",
  },
  {
    id: "2",
    studentId: "1",
    courseId: "2",
    enrollmentDate: "2024-08-25",
    status: "enrolled",
  },
  {
    id: "3",
    studentId: "2",
    courseId: "2",
    enrollmentDate: "2024-08-25",
    status: "enrolled",
  },
  {
    id: "4",
    studentId: "3",
    courseId: "3",
    enrollmentDate: "2024-08-25",
    status: "enrolled",
  },
  {
    id: "5",
    studentId: "4",
    courseId: "4",
    enrollmentDate: "2024-01-15",
    status: "completed",
    grade: "A-",
  },
  {
    id: "6",
    studentId: "5",
    courseId: "5",
    enrollmentDate: "2024-08-25",
    status: "enrolled",
  },
];

export const mockEnrollmentTrends: EnrollmentTrend[] = [
  {
    date: "2024-01",
    totalEnrollments: 1200,
    newEnrollments: 180,
    courseCompletions: 45,
  },
  {
    date: "2024-02",
    totalEnrollments: 1250,
    newEnrollments: 200,
    courseCompletions: 150,
  },
  {
    date: "2024-03",
    totalEnrollments: 1180,
    newEnrollments: 120,
    courseCompletions: 190,
  },
  {
    date: "2024-04",
    totalEnrollments: 1300,
    newEnrollments: 240,
    courseCompletions: 120,
  },
  {
    date: "2024-05",
    totalEnrollments: 1350,
    newEnrollments: 180,
    courseCompletions: 130,
  },
  {
    date: "2024-06",
    totalEnrollments: 1100,
    newEnrollments: 80,
    courseCompletions: 330,
  },
  {
    date: "2024-07",
    totalEnrollments: 1150,
    newEnrollments: 150,
    courseCompletions: 100,
  },
  {
    date: "2024-08",
    totalEnrollments: 1400,
    newEnrollments: 350,
    courseCompletions: 100,
  },
  {
    date: "2024-09",
    totalEnrollments: 1450,
    newEnrollments: 200,
    courseCompletions: 150,
  },
  {
    date: "2024-10",
    totalEnrollments: 1420,
    newEnrollments: 120,
    courseCompletions: 150,
  },
];
export const mockUsers: User[] = [
  {
    id: "1",
    username: "adminUser",
    email: "admin@example.com",
    role: "admin",
    passwordHash: "hashedpassword1",
    createdAt: "2023-01-15T10:00:00Z",
  },
];

// Department mock data
export const mockDepartments = [
  {
    id: "1",
    name: "School of Education",
    code: "SOE",
  },
  {
    id: "2",
    name: "School of Hospitality and Tourism Management",
    code: "SOHTM",
  },
  {
    id: "3",
    name: "School of Information Technology",
    code: "SOIT",
  },
];

// Course Program mock data
export const mockCoursePrograms = [
  // School of Education Programs
  {
    id: "1",
    name: "Bachelor of Elementary Education (BEED)",
    departmentId: "1",
    department: "School of Education",
  },
  {
    id: "2",
    name: "Bachelor of Secondary Education (BSED) - Major in English",
    departmentId: "1",
    department: "School of Education",
  },
  {
    id: "3",
    name: "Bachelor of Secondary Education (BSED) - Major in Mathematics",
    departmentId: "1",
    department: "School of Education",
  },
  {
    id: "4",
    name: "Bachelor of Secondary Education (BSED) - Major in Science",
    departmentId: "1",
    department: "School of Education",
  },
  {
    id: "5",
    name: "Bachelor of Physical Education (BPED)",
    departmentId: "1",
    department: "School of Education",
  },
  // School of Hospitality and Tourism Management Programs
  {
    id: "6",
    name: "Bachelor of Science in Hospitality Management (BSHM)",
    departmentId: "2",
    department: "School of Hospitality and Tourism Management",
  },
  {
    id: "7",
    name: "Bachelor of Science in Tourism Management (BSTM)",
    departmentId: "2",
    department: "School of Hospitality and Tourism Management",
  },
  {
    id: "8",
    name: "Bachelor of Science in Culinary Arts (BSCA)",
    departmentId: "2",
    department: "School of Hospitality and Tourism Management",
  },
  {
    id: "9",
    name: "Bachelor of Science in Hotel and Restaurant Management (BSHRM)",
    departmentId: "2",
    department: "School of Hospitality and Tourism Management",
  },
  // School of Information Technology Programs
  {
    id: "10",
    name: "Bachelor of Science in Information Technology (BSIT)",
    departmentId: "3",
    department: "School of Information Technology",
  },
  {
    id: "11",
    name: "Bachelor of Science in Computer Science (BSCS)",
    departmentId: "3",
    department: "School of Information Technology",
  },
  {
    id: "12",
    name: "Bachelor of Science in Information Systems (BSIS)",
    departmentId: "3",
    department: "School of Information Technology",
  },
  {
    id: "13",
    name: "Bachelor of Science in Cybersecurity (BSCyS)",
    departmentId: "3",
    department: "School of Information Technology",
  },
];