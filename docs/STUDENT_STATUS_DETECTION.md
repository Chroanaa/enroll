# Student Status Detection: Resident/Returnee vs New Student

## Overview
The system automatically detects whether a student is a **Resident/Returnee** or a **New Student** to determine if their enrolled subjects should be editable.

## Detection Methods

The system uses **two methods** to determine student status:

### Method 1: Admission Status Check
- **Function**: Checks the `admission_status` field in the `enrollment` table
- **Logic**: If a student's `admission_status` is **"transferee"**, **"returnee"**, or **"resident"**, they are considered resident/returnee
- **Database Table**: `enrollment` table
- **Field**: `admission_status`

### Method 2: Enrolled Subjects History
- **Function**: Checks if the student has previous enrolled subjects
- **Logic**: If a student has records in the `enrolled_subjects` table, they have been enrolled before
- **Database Table**: `enrolled_subjects` table

## Comprehensive Check Function

**API Endpoint**: `/api/auth/students/check-status?studentNumber={studentNumber}`

This endpoint combines both methods and returns:
```json
{
  "success": true,
  "data": {
    "isResidentReturnee": true/false,
    "admissionStatus": "new" | "transferee" | "returnee" | "resident" | null,
    "hasEnrolledSubjects": true/false,
    "enrollmentDate": "YYYY-MM-DD",
    "academicYear": "YYYY-YYYY",
    "term": "First Semester" | "Second Semester"
  }
}
```

## Detection Logic

A student is considered **Resident/Returnee** if **ANY** of the following conditions are true:

1. ✅ **Admission status is "transferee", "returnee", or "resident"** (not a new student)
2. ✅ **Has previous enrolled subjects** (has been assessed before)

Otherwise, the student is considered a **New Student**.

## Code Location

### Frontend (React Component)
**File**: `app/components/AssessmentManagement.tsx`
**Function**: `fetchStudentByNumber()`
**Lines**: ~159-170

```typescript
// Check if student is resident/returnee using comprehensive check
const statusResponse = await fetch(
  `/api/auth/students/check-status?studentNumber=${studentNum.trim()}`
);
if (statusResponse.ok) {
  const statusData = await statusResponse.json();
  if (statusData.success && statusData.data) {
    setIsResidentReturnee(statusData.data.isResidentReturnee);
  }
}
```

### Backend (API Route)
**File**: `app/api/auth/students/check-status/route.ts`
**Method**: `GET`
**Function**: Checks all three methods and returns comprehensive status

## How It Works in Practice

### Scenario 1: New Student
1. Student enters student number
2. System checks: No previous enrollments, no student record, no enrolled subjects
3. Result: `isResidentReturnee = false`
4. Behavior: Subjects are **read-only** (auto-loaded from curriculum)

### Scenario 2: Resident/Returnee Student
1. Student enters student number
2. System checks: Has previous enrollments OR student record OR enrolled subjects
3. Result: `isResidentReturnee = true`
4. Behavior: Subjects are **editable** (can add/remove subjects)

## UI Behavior

### New Student
- ✅ Subjects automatically loaded from curriculum
- ✅ Subjects are read-only (cannot edit)
- ✅ No "Edit Subjects" button

### Resident/Returnee
- ✅ "Resident/Returnee" badge displayed
- ✅ "Edit Subjects" button appears
- ✅ Can add subjects from curriculum
- ✅ Can remove subjects
- ✅ Changes saved to `enrolled_subjects` table

## Database Tables Used

1. **`enrollment`** - Stores enrollment records
   - Fields: `student_number`, `admission_date`, `admission_status`
   - **Key Field**: `admission_status` - determines if student is transferee/returnee/resident
   
2. **`enrolled_subjects`** - Stores enrolled subjects per term
   - Fields: `student_number`, `academic_year`, `semester`
   - Used to check if student has previous enrollment history

## Notes

- The detection happens **automatically** when a student number is entered
- The status is cached in component state (`isResidentReturnee`)
- If detection fails, the system defaults to **New Student** (safer default)
- Console logs are available for debugging student status detection

