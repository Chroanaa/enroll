# Complete Assessment Process Documentation

## Overview
The assessment process is a comprehensive system that handles student enrollment, subject enrollment, fee calculation, and payment scheduling. This document explains the complete flow, including all Prisma database operations and code functions.

---

## Table of Contents
1. [Assessment Flow Overview](#assessment-flow-overview)
2. [Step-by-Step Process](#step-by-step-process)
3. [Prisma Database Operations](#prisma-database-operations)
4. [API Endpoints and Functions](#api-endpoints-and-functions)
5. [Data Models and Relationships](#data-models-and-relationships)

---

## Assessment Flow Overview

```
1. Student Search/Selection
   ↓
2. Fetch Student Information (enrollment table)
   ↓
3. Determine Student Type (New vs Resident/Returnee)
   ↓
4. Fetch Enrolled Subjects (enrolled_subjects OR curriculum)
   ↓
5. Calculate Tuition and Fees
   ↓
6. Set Payment Schedule (if installment)
   ↓
7. Save Assessment Data
```

---

## Step-by-Step Process

### Step 1: Student Search and Selection

**Location**: `app/components/AssessmentManagement.tsx`

**Function**: `fetchStudentByNumber(studentNum: string)`

**Process**:
1. User enters student number (with 500ms debounce)
2. Validates student number (minimum 5 characters)
3. Calls API endpoint: `GET /api/students/[studentNumber]`

**API Endpoint**: `app/api/students/[studentNumber]/route.ts`

**Prisma Operations**:
```typescript
// 1. Fetch enrollment record (most recent by admission_date)
const enrollment = await prisma.enrollment.findFirst({
  where: { student_number: studentNumber },
  orderBy: { admission_date: 'desc' },
});

// 2. Fetch program data (multiple fallback strategies)
// Strategy A: If course_program is numeric, search by ID
if (isNumeric) {
  program = await prisma.program.findFirst({
    where: { id: parseInt(courseProgramValue), status: "active" },
  });
  // Fallback: try without status filter
  if (!program) {
    program = await prisma.program.findFirst({
      where: { id: parseInt(courseProgramValue) },
    });
  }
}

// Strategy B: Search by name or code
if (!program) {
  program = await prisma.program.findFirst({
    where: {
      OR: [
        { name: courseProgramValue },
        { code: courseProgramValue },
      ],
      status: "active",
    },
  });
}

// Strategy C: Search by department_id
if (!programData && enrollment.department) {
  program = await prisma.program.findFirst({
    where: {
      department_id: enrollment.department,
      status: "active",
    },
  });
}

// 3. Fetch major data (if major_id exists)
if (enrollment.major_id) {
  const major = await prisma.major.findUnique({
    where: { id: enrollment.major_id },
  });
}
```

**Returns**:
- Student information from `enrollment` table
- Program details from `program` table (joined)
- Major details from `major` table (if applicable)

---

### Step 2: Student Status Detection

**Location**: `app/components/AssessmentManagement.tsx` (lines 180-199)

**Function**: Checks if student is Resident/Returnee or New Student

**API Endpoint**: `GET /api/auth/students/check-status?studentNumber={studentNumber}`

**Prisma Operations**:
```typescript
// Check admission_status in enrollment table
const enrollment = await prisma.enrollment.findFirst({
  where: { student_number: studentNumber },
  orderBy: { admission_date: 'desc' },
});

// Check if student has previous enrolled subjects
const enrolledSubjects = await prisma.enrolled_subjects.findFirst({
  where: { student_number: studentNumber },
});
```

**Logic**:
- Student is **Resident/Returnee** if:
  - `admission_status` is "transferee", "returnee", or "resident" OR
  - Has records in `enrolled_subjects` table
- Otherwise, student is **New Student**

**Impact**:
- **Resident/Returnee**: Can edit enrolled subjects, subjects are editable
- **New Student**: Subjects come from curriculum, may be auto-saved

---

### Step 3: Fetch Enrolled Subjects

**Location**: `app/components/AssessmentManagement.tsx`

**Function**: `fetchEnrolledSubjects(programIdValue: number, semesterNum: number)`

**Process**:

#### 3A. Check Existing Enrolled Subjects (Priority)

**API Endpoint**: `GET /api/auth/enrolled-subjects?studentNumber={studentNumber}&academicYear={academicYear}&semester={semester}`

**Prisma Operations** (`app/api/auth/enrolled-subjects/route.ts`):
```typescript
// Fetch enrolled subjects with curriculum course details
const enrolledSubjects = await prisma.$queryRaw<any[]>`
  SELECT 
    es.*,
    cc.course_code,
    cc.descriptive_title,
    cc.units_lec,
    cc.units_lab,
    cc.lecture_hour,
    cc.lab_hour,
    cc.prerequisite,
    cc.year_level as curriculum_year_level
  FROM enrolled_subjects es
  LEFT JOIN curriculum_course cc ON es.curriculum_course_id = cc.id
  WHERE es.student_number = ${studentNumber}
    AND es.academic_year = ${academicYear}
    AND es.semester = ${semesterNum}
  ORDER BY cc.course_code
`;

// Batch fetch prerequisite subject codes
const subjectIdsArray = Array.from(allPrerequisiteSubjectIds);
const subjects = await prisma.$queryRaw<any[]>`
  SELECT id, code FROM subject WHERE id = ANY(${subjectIdsArray}::int[])
`;
```

**If enrolled subjects exist**: Use them directly (for Resident/Returnee students)

#### 3B. Fallback: Fetch from Curriculum

**API Endpoint**: `GET /api/auth/curriculum/subjects?programId={programId}&semester={semester}`

**When Used**:
- New students (no enrolled subjects)
- Empty enrolled_subjects for current term

**Prisma Operations**:
```typescript
// Fetch curriculum courses for program and semester
const curriculumCourses = await prisma.curriculum_course.findMany({
  where: {
    curriculum: {
      program_code: programCode,
      effective_year: academicYear,
    },
    semester: semesterNum,
  },
  include: {
    curriculum: true,
  },
});
```

**Auto-Save Logic** (for Resident/Returnee only):
- If curriculum subjects are fetched AND student is Resident/Returnee
- Automatically save to `enrolled_subjects` table
- Allows them to start with curriculum and modify later

---

### Step 4: Save Enrolled Subjects

**Location**: `app/components/AssessmentManagement.tsx`

**Function**: `saveEnrolledSubjects()`

**API Endpoint**: `POST /api/auth/enrolled-subjects`

**Prisma Operations** (`app/api/auth/enrolled-subjects/route.ts`):

```typescript
// 1. Check if records exist for this term
const existingRecords = await prisma.$queryRaw<any[]>`
  SELECT id FROM enrolled_subjects 
  WHERE student_number = ${studentNumber} 
  AND academic_year = ${academicYear} 
  AND semester = ${semesterNum}
  LIMIT 1
`;

// 2. If records exist, DELETE old records for this term only
if (recordsExist) {
  await prisma.$executeRaw`
    DELETE FROM enrolled_subjects 
    WHERE student_number = ${studentNumber} 
    AND academic_year = ${academicYear} 
    AND semester = ${semesterNum}
  `;
}

// 3. Calculate total units and determine status
const totalUnits = subjects.reduce((sum, subject) => {
  return sum + (subject.units_total || 0);
}, 0);

// 4. Determine enrollment status
// If total units > 27 and user is not admin, set status to "pending"
const enrollmentStatus = totalUnits > 27 && !isAdmin ? "pending" : "enrolled";

// 5. Insert new enrolled subjects using transaction
await prisma.$transaction(
  enrolledSubjectsData.map((subjectData) =>
    prisma.$executeRaw`
      INSERT INTO enrolled_subjects (
        student_number, program_id, curriculum_course_id, subject_id,
        academic_year, semester, term, year_level, units_total, status
      ) VALUES (
        ${subjectData.student_number},
        ${subjectData.program_id},
        ${subjectData.curriculum_course_id},
        ${subjectData.subject_id},
        ${subjectData.academic_year},
        ${subjectData.semester},
        ${subjectData.term},
        ${subjectData.year_level},
        ${subjectData.units_total},
        ${subjectData.status}
      )
    `
  )
);
```

**Key Features**:
- **Update Strategy**: Deletes old records for same term, preserves historical data
- **Status Management**: 
  - "enrolled" if units ≤ 27 OR user is admin
  - "pending" if units > 27 AND user is not admin
- **Transaction Safety**: Uses Prisma transaction for atomic operations

---

### Step 5: Fetch Fees

**Location**: `app/components/AssessmentManagement.tsx`

**Function**: `fetchFees()`

**API Endpoint**: `GET /api/auth/fees`

**Prisma Operations** (`app/api/auth/fees/route.ts`):
```typescript
const fees = await prisma.fee.findMany();
```

**Fee Model** (from `prisma/schema.prisma`):
```prisma
model fee {
  id            Int     @id @default(autoincrement())
  code          String  @db.VarChar(50)
  name          String  @db.VarChar(255)
  description   String?
  amount        Decimal @db.Decimal(10, 2)
  category      String  @db.VarChar(20)  // e.g., "tuition", "miscellaneous"
  academic_year String  @db.VarChar(20)
  semester      String? @db.VarChar(20)
  status        String  @db.VarChar(10)  // "active" or "inactive"
}
```

**Usage**:
- Filters fees by `status === "active"` and `category !== "tuition"`
- Initializes `dynamicFees` state with default amounts from database
- Allows manual adjustment of fee amounts in UI

---

### Step 6: Calculate Tuition and Fees

**Location**: `app/components/AssessmentManagement.tsx`

**Functions**: Multiple `useEffect` hooks for calculations

#### 6A. Tuition Calculation
```typescript
// Triggered when totalUnits or tuitionPerUnit changes
useEffect(() => {
  if (totalUnits > 0 && tuitionPerUnit) {
    const tuitionAmount = totalUnits * parseFloat(tuitionPerUnit);
    setTuition(tuitionAmount);
  } else if (totalUnits === 0) {
    setTuition(0);
  }
}, [totalUnits, tuitionPerUnit]);
```

**Formula**: `Tuition = Total Units × Tuition Per Unit`

#### 6B. Net Tuition Calculation
```typescript
// Triggered when tuition, discount, dynamicFees, or downPayment changes
useEffect(() => {
  // Calculate net tuition
  const net = tuition - discount;
  setNetTuition(net);

  // Calculate total of dynamic fees
  const dynamicFeesTotal = Object.values(dynamicFees).reduce(
    (sum, amount) => sum + amount, 0
  );

  // Calculate total fees (cash basis)
  const total = net + dynamicFeesTotal;
  setTotalFees(total);

  // Calculate installment basis
  const installmentNet = total - downPayment;
  setNet(installmentNet);
  const insurance = installmentNet * 0.05; // 5% insurance charge
  setInsuranceCharge(insurance);
  setTotalInstallment(installmentNet + insurance);
}, [tuition, discount, dynamicFees, downPayment]);
```

**Formulas**:
- **Net Tuition** = Tuition - Discount
- **Total Fees (Cash)** = Net Tuition + Sum of Dynamic Fees
- **Installment Net** = Total Fees - Down Payment
- **Insurance Charge** = Installment Net × 0.05 (5%)
- **Total Installment** = Installment Net + Insurance Charge

---

### Step 7: Payment Schedule (Installment Mode)

**Location**: `app/components/assessmentManagement/PaymentScheduleTab.tsx`

**Fields**:
- Prelim Date & Amount
- Midterm Date & Amount
- Finals Date & Amount

**Validation**: Sum of all installment amounts should equal `totalInstallment`

---

## Prisma Database Operations Summary

### Tables Used

1. **`enrollment`** - Student enrollment information
   - Primary key: `id`
   - Key fields: `student_number`, `course_program`, `department`, `major_id`, `admission_status`

2. **`program`** - Academic programs
   - Primary key: `id`
   - Key fields: `code`, `name`, `department_id`, `status`

3. **`major`** - Program majors
   - Primary key: `id`
   - Key fields: `code`, `name`, `program_id`

4. **`enrolled_subjects`** - Student enrolled subjects
   - Primary key: `id`
   - Key fields: `student_number`, `curriculum_course_id`, `academic_year`, `semester`, `units_total`, `status`
   - Indexes: `student_number`, `academic_year + semester`, `program_id + semester + academic_year`

5. **`curriculum_course`** - Curriculum course definitions
   - Primary key: `id`
   - Key fields: `curriculum_id`, `course_code`, `descriptive_title`, `units_lec`, `units_lab`, `semester`, `year_level`

6. **`curriculum`** - Curriculum definitions
   - Primary key: `id`
   - Key fields: `program_code`, `effective_year`, `status`

7. **`fee`** - Fee definitions
   - Primary key: `id`
   - Key fields: `code`, `name`, `amount`, `category`, `status`, `academic_year`, `semester`

8. **`subject`** - Subject master data
   - Primary key: `id`
   - Key fields: `code`, `name`

### Prisma Query Patterns

#### Pattern 1: Find First with Ordering
```typescript
await prisma.enrollment.findFirst({
  where: { student_number: studentNumber },
  orderBy: { admission_date: 'desc' },
});
```

#### Pattern 2: Find with Multiple Conditions (OR)
```typescript
await prisma.program.findFirst({
  where: {
    OR: [
      { name: courseProgramValue },
      { code: courseProgramValue },
    ],
    status: "active",
  },
});
```

#### Pattern 3: Raw SQL Queries (for complex joins)
```typescript
await prisma.$queryRaw<any[]>`
  SELECT es.*, cc.course_code, cc.descriptive_title
  FROM enrolled_subjects es
  LEFT JOIN curriculum_course cc ON es.curriculum_course_id = cc.id
  WHERE es.student_number = ${studentNumber}
`;
```

#### Pattern 4: Transaction for Multiple Inserts
```typescript
await prisma.$transaction(
  enrolledSubjectsData.map((subjectData) =>
    prisma.$executeRaw`INSERT INTO ...`
  )
);
```

#### Pattern 5: Conditional Delete (Raw SQL)
```typescript
await prisma.$executeRaw`
  DELETE FROM enrolled_subjects 
  WHERE student_number = ${studentNumber} 
  AND academic_year = ${academicYear} 
  AND semester = ${semesterNum}
`;
```

---

## API Endpoints and Functions

### 1. GET `/api/students/[studentNumber]`
**File**: `app/api/students/[studentNumber]/route.ts`

**Purpose**: Fetch student information with program and major details

**Prisma Operations**:
- `prisma.enrollment.findFirst()` - Get enrollment record
- `prisma.program.findFirst()` - Get program (multiple strategies)
- `prisma.major.findUnique()` - Get major (if applicable)

**Returns**: Student data with joined program and major information

---

### 2. GET `/api/auth/students/check-status`
**Purpose**: Determine if student is Resident/Returnee or New Student

**Prisma Operations**:
- `prisma.enrollment.findFirst()` - Check admission_status
- `prisma.enrolled_subjects.findFirst()` - Check enrollment history

**Returns**: `{ isResidentReturnee: boolean, admissionStatus: string, hasEnrolledSubjects: boolean }`

---

### 3. GET `/api/auth/enrolled-subjects`
**File**: `app/api/auth/enrolled-subjects/route.ts`

**Purpose**: Fetch enrolled subjects for a student

**Prisma Operations**:
- `prisma.$queryRaw()` - Complex join query with curriculum_course
- `prisma.$queryRaw()` - Batch fetch prerequisite subjects

**Returns**: Array of enrolled subjects with curriculum details

---

### 4. POST `/api/auth/enrolled-subjects`
**File**: `app/api/auth/enrolled-subjects/route.ts`

**Purpose**: Save or update enrolled subjects

**Prisma Operations**:
- `prisma.$queryRaw()` - Check existing records
- `prisma.$executeRaw()` - Delete old records (if updating)
- `prisma.$transaction()` - Insert new records atomically

**Returns**: Success message with action (inserted/updated) and status

---

### 5. GET `/api/auth/curriculum/subjects`
**Purpose**: Fetch curriculum courses for a program and semester

**Prisma Operations**:
- `prisma.curriculum_course.findMany()` - Get courses with curriculum join

**Returns**: Array of curriculum courses

---

### 6. GET `/api/auth/fees`
**File**: `app/api/auth/fees/route.ts`

**Purpose**: Fetch all fees from database

**Prisma Operations**:
- `prisma.fee.findMany()` - Get all fees

**Returns**: Array of fee objects

---

## Data Models and Relationships

### Enrollment → Program Relationship
- `enrollment.course_program` (String) can be:
  - Numeric ID → Lookup in `program.id`
  - Program code → Lookup in `program.code`
  - Program name → Lookup in `program.name`
- Fallback: `enrollment.department` → `program.department_id`

### Enrollment → Major Relationship
- `enrollment.major_id` → `major.id` (direct foreign key)

### Enrolled Subjects → Curriculum Course Relationship
- `enrolled_subjects.curriculum_course_id` → `curriculum_course.id`
- `enrolled_subjects.subject_id` → `subject.id` (optional)

### Curriculum → Program Relationship
- `curriculum.program_code` → `program.code`
- `curriculum.program_name` → `program.name`

---

## Key Features

### 1. Student Type Detection
- Automatically detects if student is new or returning
- Affects subject editability and auto-save behavior

### 2. Subject Enrollment Priority
- **First Priority**: Existing `enrolled_subjects` records
- **Fallback**: `curriculum_course` for the program

### 3. Update Strategy
- Preserves historical data from other semesters/years
- Only updates records for the current term

### 4. Status Management
- "enrolled" - Normal enrollment
- "pending" - Requires admin approval (units > 27)

### 5. Fee Calculation
- Dynamic fees from database
- Manual adjustment capability
- Automatic calculation of totals and installments

### 6. Payment Modes
- **Cash Basis**: Full payment upfront
- **Installment Basis**: Down payment + 3 installments (Prelim, Midterm, Finals) with 5% insurance charge

---

## Error Handling

1. **Student Not Found**: Returns 404 with error message
2. **Missing Required Fields**: Returns 400 with validation error
3. **Database Errors**: Returns 500 with error details
4. **Validation Errors**: Client-side validation before API calls

---

## Performance Optimizations

1. **Debounced Student Search**: 500ms delay to reduce API calls
2. **Batch Prerequisite Fetching**: Single query for all prerequisites
3. **Transaction for Multiple Inserts**: Faster than individual inserts
4. **Indexed Queries**: Database indexes on frequently queried fields
5. **Conditional Queries**: Only fetch when necessary (programId, semester available)

---

## Conclusion

The assessment process is a comprehensive system that:
1. Fetches student data from multiple related tables
2. Determines student type for appropriate handling
3. Manages subject enrollment with fallback strategies
4. Calculates fees dynamically from database
5. Supports both cash and installment payment modes
6. Preserves historical data while allowing updates

All database operations use Prisma ORM with a mix of:
- Type-safe queries (`findFirst`, `findUnique`, `findMany`)
- Raw SQL queries (`$queryRaw`, `$executeRaw`) for complex joins
- Transactions for atomic operations

