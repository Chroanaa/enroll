# Section Management System - Implementation Guide

## Overview

Complete implementation of a **term-based section management system** with scheduling, student assignment, and conflict prevention. Follows clean architecture with service layer validation.

---

## 🏗️ Architecture

### Layers

```
┌─────────────────────────────────────┐
│ UI Layer (React Components)         │
├─────────────────────────────────────┤
│ API Layer (Next.js Route Handlers)  │
├─────────────────────────────────────┤
│ Service Layer (Business Logic)      │
├─────────────────────────────────────┤
│ Repository Layer (Prisma ORM)       │
└─────────────────────────────────────┘
```

---

## 📁 File Structure

```
app/
├── api/
│   ├── sections/
│   │   ├── route.ts                 # POST (create), GET (list)
│   │   └── [id]/route.ts            # PATCH (activate), GET (details)
│   ├── class-schedule/
│   │   └── route.ts                 # POST (create), GET (list)
│   └── student-section/
│       └── route.ts                 # POST (bulk assign), GET (list)
├── components/
│   └── sections/
│       ├── SectionList.tsx          # Section table with filters
│       ├── CreateSectionModal.tsx   # Create section form
│       ├── ScheduleBuilder.tsx      # Weekly schedule grid & builder
│       └── StudentAssignment.tsx    # Student selection & assignment
├── admin/
│   └── sections/
│       └── page.tsx                 # Main management page
├── types/
│   └── sectionTypes.ts              # TypeScript interfaces
└── utils/
    ├── sectionService.ts            # Business logic & validators
    └── sectionApi.ts                # API helper functions
```

---

## 🎯 API Endpoints

### 1. Create Section
**POST** `/api/sections`

```json
{
  "programId": 1,
  "yearLevel": 2,
  "academicYear": 2024,
  "semester": 1,
  "sectionName": "A",
  "advisor": "Dr. Smith",
  "maxCapacity": 40
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "programId": 1,
    "yearLevel": 2,
    "academicYear": 2024,
    "semester": 1,
    "sectionName": "A",
    "advisor": "Dr. Smith",
    "maxCapacity": 40,
    "studentCount": 0,
    "status": "draft",
    "createdAt": "2024-02-13T00:00:00.000Z"
  }
}
```

**Validations:**
- Year level: 1-4
- Semester: 1-3
- All required fields present
- No duplicate section (same program, year, term, name)

---

### 2. Create Class Schedule
**POST** `/api/class-schedule`

```json
{
  "sectionId": 1,
  "curriculumCourseId": 5,
  "facultyId": 3,
  "roomId": 12,
  "dayOfWeek": "Monday",
  "startTime": "2024-02-13T08:00:00Z",
  "endTime": "2024-02-13T09:30:00Z",
  "academicYear": 2024,
  "semester": 1
}
```

**Conflict Prevention:**
- ✅ Room double-booking check
- ✅ Faculty schedule conflict check
- ✅ Section internal time overlap check
- ✅ Subject duplication in section check

---

### 3. Activate Section
**PATCH** `/api/sections/{id}/activate`

**Validations:**
- Section must be in draft status
- Section must have at least 1 schedule
- No internal schedule overlaps

---

### 4. Bulk Assign Students
**POST** `/api/student-section`

```json
{
  "sectionId": 1,
  "studentNumbers": [
    "2024-0001",
    "2024-0002",
    "2024-0003"
  ],
  "academicYear": 2024,
  "semester": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sectionId": 1,
    "assigned": 3,
    "failed": [
      {
        "studentNumber": "2024-0004",
        "reason": "Section is at capacity"
      }
    ]
  }
}
```

**Validations:**
- Student exists
- Student not already assigned for term
- Section capacity not exceeded
- Transactional increment of student count

---

## 🔧 Service Layer

### `conflictChecker`

```typescript
await conflictChecker.checkRoomConflict(
  roomId, dayOfWeek, startTime, endTime,
  academicYear, semester
);
```

All conflict checks use **time overlap logic:**
```
(newStart < existingEnd) AND (newEnd > existingStart)
```

### `capacityValidator`

```typescript
const { canAdd, currentCount, maxCapacity } =
  await capacityValidator.canAddStudents(sectionId, numberOfStudents);
```

### `termValidator`

```typescript
const { isValid, errors } =
  await termValidator.validateSectionForActivation(sectionId);
```

### `sectionService`

```typescript
// Get eligible students for assignment
const students = await sectionService.getEligibleStudents(
  programId, yearLevel, academicYear, semester
);

// Get curriculum for section
const courses = await sectionService.getSectionCurriculum(
  programId, yearLevel, semester
);

// Get all schedules with relations
const schedules = await sectionService.getSectionSchedules(
  sectionId, academicYear, semester
);
```

---

## 📊 Database Schema

```prisma
model sections {
  id            Int       @id @default(autoincrement())
  program_id    Int
  section_name  String    @db.VarChar(100)
  advisor       String    @db.VarChar(150)
  student_count Int?      @default(0)
  status        String    @db.VarChar(50)    // draft | active | closed
  year_level    Int?
  academic_year Int?
  semester      Int?
  max_capacity  Int?
  created_at    DateTime? @default(now())
}

model student_section {
  id             Int    @id @default(autoincrement())
  student_number String @db.VarChar(255)
  section_id     Int
  academic_year  Int
  semester       Int

  @@unique([student_number, academic_year, semester])
}

model class_schedule {
  id                   Int      @id @default(autoincrement())
  section_id           Int
  curriculum_course_id Int
  faculty_id           Int
  room_id              Int
  day_of_week          String   @db.VarChar(255)
  start_time           DateTime @db.Timestamp(6)
  end_time             DateTime @db.Timestamp(6)
  academic_year        Int
  semester             Int
  status               String?  @default("active") @db.VarChar(50)

  @@index([faculty_id], map: "idx_class_schedule_faculty")
  @@index([room_id], map: "idx_class_schedule_room")
  @@index([section_id, academic_year, semester], map: "idx_class_schedule_section")
}
```

---

## 🎨 UI Components

### SectionList
- **Features:** Filter by program, year, term, status
- **Actions:** Edit, Build Schedule, Assign Students, Activate
- **Display:** Capacity indicator, status badges

### CreateSectionModal
- **Fields:** Program, Year Level, Section Name, Advisor, Max Capacity
- **Auto-filled:** Academic Year, Semester (from current term)
- **Validation:** All fields required, capacity > 0

### ScheduleBuilder
- **Left Panel:** Curriculum courses with units
- **Right Panel:** Weekly grid view (Mon-Sat, 7:00-18:30)
- **Add Schedule:** Subject, Faculty, Room, Day, Time selection
- **Conflict Prevention:** Real-time validation with error messages

### StudentAssignment
- **Filter:** Search by student number or name
- **Capacity Indicator:** Shows available seats
- **Bulk Selection:** Select all / deselect all
- **Progress:** Shows assigned count, available seats, selected count

---

## 🔄 Complete Flow

```
1. ADMIN CREATES SECTION (Draft status)
   ├─ POST /api/sections
   ├─ Status: draft
   └─ student_count: 0

2. ADMIN BUILDS SCHEDULE
   ├─ GET /api/curriculum (fetch subjects)
   ├─ POST /api/class-schedule (add each class)
   ├─ Conflict prevention checks run
   └─ Can add multiple schedules

3. ADMIN ACTIVATES SECTION
   ├─ PATCH /api/sections/{id}/activate
   ├─ Validation: at least 1 schedule
   └─ Status: active

4. ADMIN ASSIGNS STUDENTS
   ├─ GET eligible students (not assigned yet)
   ├─ POST /api/student-section (bulk)
   ├─ Capacity check
   └─ Increment section.student_count

5. SECTION LOCKED FOR TERM
   ├─ Status: active
   ├─ Can only update existing assignments
   └─ Cannot change schedule/capacity
```

---

## 🛡️ Validation Rules

### Section Rules
```
✓ Cannot activate without schedule
✓ Cannot assign student to draft section
✓ Cannot exceed capacity
✓ Cannot duplicate section name per term
✓ Year level must be 1-4
✓ Semester must be 1-3
```

### Schedule Rules
```
✓ Prevent room double booking
✓ Prevent faculty double booking
✓ Prevent section time overlap
✓ Prevent subject duplication in section
✓ Start time must be before end time
✓ Subject must belong to curriculum
```

### Assignment Rules
```
✓ Student must exist
✓ Student not already assigned for term
✓ Section must be active
✓ Section must have capacity
✓ Unique: (student, academic_year, semester)
```

---

## 🔌 Integration Points

### Get Current Academic Term
```typescript
const { academicYear, semester } =
  await termValidator.getCurrentTerm();
```

Currently returns:
- **Semester 1:** August - December
- **Semester 2:** January - May
- **Summer:** June - July

**Customize** in `termValidator.getCurrentTerm()` based on your institution's calendar.

### Load Programs & Faculty

Update the UI components to fetch from your data:

```typescript
// In CreateSectionModal.tsx
const programs = await fetch('/api/programs').then(r => r.json());

// In ScheduleBuilder.tsx
const faculty = await fetch('/api/faculty').then(r => r.json());
const rooms = await fetch('/api/rooms').then(r => r.json());
```

---

## 📋 Usage Examples

### Create a Section
```typescript
const section = await createSection({
  programId: 1,
  yearLevel: 2,
  academicYear: 2024,
  semester: 1,
  sectionName: "A",
  advisor: "Dr. Smith",
  maxCapacity: 40
});
```

### Add Schedule with Conflict Check
```typescript
try {
  const schedule = await createClassSchedule({
    sectionId: section.id,
    curriculumCourseId: 5,
    facultyId: 3,
    roomId: 12,
    dayOfWeek: "Monday",
    startTime: new Date("2024-02-13T08:00:00Z"),
    endTime: new Date("2024-02-13T09:30:00Z"),
    academicYear: 2024,
    semester: 1
  });
} catch (error) {
  // Handles: Room conflict, Faculty conflict, etc.
}
```

### Activate Section
```typescript
try {
  const activated = await activateSection(section.id);
  // Section now accepts student assignments
} catch (error) {
  // "Section must have at least one schedule"
}
```

### Bulk Assign Students
```typescript
const result = await bulkAssignStudents({
  sectionId: section.id,
  studentNumbers: ["2024-0001", "2024-0002"],
  academicYear: 2024,
  semester: 1
});

console.log(`Assigned: ${result.assigned}, Failed: ${result.failed.length}`);
```

---

## 🚀 Next Steps

1. **Load Dynamic Data:**
   - Replace placeholder program/faculty/room selects
   - Integrate with your existing data endpoints

2. **Error Handling:**
   - Add toast notifications for success/error
   - Implement form error displays

3. **Edit Functionality:**
   - Implement edit endpoint for sections
   - Handle schedule updates/deletions

4. **Advanced Features:**
   - Drag-and-drop scheduling
   - Section cloning for next semester
   - Conflict warning modals
   - Export schedules (PDF/Excel)

5. **Testing:**
   - Add unit tests for validators
   - Add e2e tests for workflows
   - Test edge cases (capacity, overlaps)

---

## 📞 Key Validation Points

| Operation | Key Checks |
|-----------|-----------|
| Create Section | Duplicate check, Valid year/semester |
| Add Schedule | Room/Faculty/Section conflicts, Time validation |
| Activate | Has schedule, No overlaps, Draft status |
| Assign Student | Exists, Not already assigned, Capacity, Active section |

All operations use **transactions** to ensure data consistency.

---

## 🎓 Status Workflows

```
SECTION STATUS FLOW:
draft  ──→  active  ──→  closed
       ↑               ↓
       └───────────────┘
          (via API only)

SCHEDULE STATUS:
active  ──→  cancelled

STUDENT SECTION STATUS:
active  ──→  transferred
```

---

Generated: February 13, 2024
