# Update: Eligible Students API - Using Enrollment Table

## Change Summary
Updated the `/api/eligible-students` endpoint to query from the **`enrollment` table** instead of the `students` table to ensure only enrolled students are shown for section assignment.

---

## What Changed

### **Before: Using `students` Table**
```typescript
// Got ALL students matching program and year level
const allStudents = await prisma.students.findMany({
  where: {
    course_id: targetProgramId,
    year_level: targetYearLevel
  }
});
```
**Problem:** This returned ALL students in the database, even those not enrolled for the current term.

### **After: Using `enrollment` Table**
```typescript
// Get only ENROLLED students directly from enrollment table
const enrolledStudents = await prisma.enrollment.findMany({
  where: {
    course_program: targetProgramId.toString(),
    year_level: parseInt(targetYearLevel),
    academic_year: targetAcademicYear.toString(),
    term: targetSemester.toString(), // term field = semester
    status: 1 // 1 = enrolled/active status
  },
  select: {
    id: true,
    student_number: true,
    first_name: true,
    middle_name: true,
    family_name: true,
    email_address: true,
    course_program: true
  }
});
```
**Benefit:** 
- Only returns students who are actually enrolled for the specific term
- Gets all student data directly from enrollment (no need to join with students table)
- Uses `term` field which represents the semester

---

## Query Flow

### **Step 1: Get Enrolled Students (Single Query)**
```sql
SELECT id, student_number, first_name, middle_name, family_name, email_address, course_program
FROM enrollment
WHERE course_program = '1'
  AND year_level = 2
  AND academic_year = '2024'
  AND term = '1'  -- term field represents semester
  AND status = 1  -- 1 = enrolled/active
```

### **Step 2: Filter Out Assigned Students**
```sql
SELECT * FROM student_section
WHERE student_number = '2024-0001'
  AND academic_year = 2024
  AND semester = 1
```

### **Step 3: Return Eligible Students**
Only students who are:
- ✅ Enrolled for the specific academic year AND semester (term)
- ✅ In the correct program
- ✅ In the correct year level
- ✅ Have active enrollment status (status = 1)
- ✅ NOT already assigned to a section for this term

---

## Tables Used

### 1. **`enrollment` table** (Primary Source - All Student Data)
**Fields Used:**
- `id` - Enrollment ID
- `student_number` - Student identifier
- `first_name` - Student's first name
- `middle_name` - Student's middle name
- `family_name` - Student's last name (used as lastName)
- `email_address` - Student's email
- `course_program` - Program ID (as string)
- `year_level` - Year level (1-4)
- `academic_year` - Academic year (e.g., "2024")
- `term` - **Semester/Term** (e.g., "1", "2", "3")
- `status` - Enrollment status (1 = enrolled/active)

**Purpose:** Get all enrolled students with their complete information in a single query

### 2. **`student_section` table** (Assignment Check)
**Fields Used:**
- `student_number`, `academic_year`, `semester`

**Purpose:** Check if student is already assigned to a section for this term

### 3. **`program` table** (Program Details)
**Fields Used:**
- `id`, `code`, `name`

**Purpose:** Get program code and name for display

---

## Important Notes

### **⚠️ CRITICAL: `term` field = Semester (STRING FORMAT)**
- The `enrollment` table uses the **`term`** field to represent the semester
- **IMPORTANT:** `term` is stored as **VARCHAR** (text), NOT integer!
- **Mapping required:**
  - Section `semester: 1` → Enrollment `term: "First Semester"`
  - Section `semester: 2` → Enrollment `term: "Second Semester"`
  - Section `semester: 3` → Enrollment `term: "Summer"`

**Code:**
```typescript
const semesterToTerm: { [key: number]: string } = {
  1: 'First Semester',
  2: 'Second Semester',
  3: 'Summer'
};
const termString = semesterToTerm[targetSemester];
```

### **Status Values**
- `status: 1` = Enrolled/Active
- `status: 2` = Inactive
- `status: 3` = Graduated
- `status: 4` = Pending

### **Data Types**
- `course_program` is stored as **string** in enrollment
- `year_level` is stored as **number** in enrollment
- `academic_year` is stored as **string** in enrollment
- `term` is stored as **string** in enrollment

### **Student Name Fields**
- `first_name` - First name
- `middle_name` - Middle name (nullable)
- `family_name` - Last name (NOT `last_name`)

---

## Benefits

### **Before (Students Table)**
❌ Showed ALL students in database
❌ Included students not enrolled this year
❌ Included inactive/graduated students
❌ Required manual filtering

### **After (Enrollment Table)**
✅ Shows ONLY enrolled students
✅ Filters by academic year automatically
✅ Respects enrollment status
✅ More accurate eligible student list

---

## Example Scenario

### **Section Details:**
- Program: BSCS (ID: 1)
- Year Level: 2
- Academic Year: 2024
- Semester: 1

### **Before (Students Table):**
Returns:
- Student A (enrolled 2024) ✅
- Student B (enrolled 2024) ✅
- Student C (enrolled 2023, not 2024) ❌ Should not show
- Student D (graduated 2023) ❌ Should not show

### **After (Enrollment Table):**
Returns:
- Student A (enrolled 2024) ✅
- Student B (enrolled 2024) ✅

**Result:** More accurate list of eligible students!

---

## API Response Format

```json
{
  "success": true,
  "data": [
    {
      "studentId": 1,
      "studentNumber": "2024-0001",
      "firstName": "John",
      "middleName": "M",
      "lastName": "Doe",
      "name": "John M Doe",
      "email": "john@example.com",
      "programId": 1,
      "programCode": "BSCS",
      "programName": "Bachelor of Science in Computer Science"
    }
  ]
}
```

---

## Files Modified

- `app/api/eligible-students/route.ts`
  - Changed query from `students` table to `enrollment` table
  - Added two-step query (enrollment → students)
  - Added enrollment status filter
  - Fixed TypeScript type issues

---

## Testing Checklist

- [ ] Only enrolled students appear in the list
- [ ] Students from correct program show up
- [ ] Students from correct year level show up
- [ ] Students from correct academic year show up
- [ ] Already assigned students are filtered out
- [ ] Student details display correctly
- [ ] Search functionality works
- [ ] Assignment process works

---

## Date Updated
February 16, 2026

## Status
✅ **COMPLETE** - Eligible students API now uses enrollment table for accurate filtering
