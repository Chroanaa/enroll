# Section Management - Implementation Tips & Examples

## 🎯 Real-World Integration Examples

### Example 1: Complete Workflow Test

```typescript
// 1. Create a section
const section = await createSection({
  programId: 1,
  yearLevel: 2,
  academicYear: 2024,
  semester: 1,
  sectionName: "CS-2A",
  advisor: "Dr. Johnson",
  maxCapacity: 35
});
// Result: section.id = 1, status = "draft"

// 2. Add schedule (checks conflicts automatically)
const schedule1 = await createClassSchedule({
  sectionId: section.id,
  curriculumCourseId: 10,      // Database Fundamentals
  facultyId: 5,                 // Dr. Johnson
  roomId: 101,                  // Room 101
  dayOfWeek: "Monday",
  startTime: new Date("2024-02-19T08:00:00Z"),
  endTime: new Date("2024-02-19T09:30:00Z"),
  academicYear: 2024,
  semester: 1
});
// ✅ Success

// 3. Try adding conflicting schedule (same faculty, overlapping time)
try {
  await createClassSchedule({
    sectionId: section.id,
    curriculumCourseId: 11,
    facultyId: 5,               // Same faculty
    roomId: 102,
    dayOfWeek: "Monday",
    startTime: new Date("2024-02-19T09:00:00Z"),  // Overlaps!
    endTime: new Date("2024-02-19T10:30:00Z"),
    academicYear: 2024,
    semester: 1
  });
} catch (error) {
  // ❌ Error: "Faculty has schedule conflict"
}

// 4. Activate section (requires schedule)
const activated = await activateSection(section.id);
// Result: status = "active"

// 5. Get eligible students
const students = await sectionService.getEligibleStudents(
  1, 2, 2024, 1  // program 1, year 2, term 2024/1
);
// Result: 45 students not yet assigned

// 6. Bulk assign first batch
const result1 = await bulkAssignStudents({
  sectionId: section.id,
  studentNumbers: [
    "2024-10001",
    "2024-10002",
    // ... up to capacity
  ],
  academicYear: 2024,
  semester: 1
});
// Result: assigned: 35 (at capacity)

// 7. Try assigning more (capacity exceeded)
const result2 = await bulkAssignStudents({
  sectionId: section.id,
  studentNumbers: ["2024-10036"],
  academicYear: 2024,
  semester: 1
});
// Result: assigned: 0, failed: [{reason: "Section is at capacity"}]
```

---

## 🛡️ Error Handling Patterns

### Pattern 1: API Error Handling

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    error: string;        // Error code
    message: string;      // User-friendly message
    statusCode: number;
  };
}

// Fetch with proper error handling
try {
  const response = await fetch('/api/sections', {
    method: 'POST',
    body: JSON.stringify(data)
  });

  const result: ApiResponse<SectionResponse> = await response.json();

  if (!response.ok) {
    switch (result.error?.error) {
      case 'VALIDATION_ERROR':
        // Show validation message to user
        toast.error(result.error.message);
        break;
      case 'DUPLICATE_SECTION':
        // Show specific duplicate error
        toast.error('Section already exists for this term');
        break;
      case 'NOT_FOUND':
        // Resource not found
        toast.error('Program not found');
        break;
      default:
        toast.error('Unknown error occurred');
    }
    return;
  }

  // Success
  onSuccess(result.data);
} catch (error) {
  toast.error('Network error: ' + error.message);
}
```

### Pattern 2: Transaction Rollback

```typescript
// If any step fails, entire transaction rolls back
const result = await prisma.$transaction(async (tx) => {
  // Step 1: Update section
  const section = await tx.sections.update({
    where: { id: sectionId },
    data: { student_count: { increment: 1 } }
  });

  // Step 2: Create assignment
  const assignment = await tx.student_section.create({
    data: {
      student_number: studentNumber,
      section_id: sectionId,
      academic_year: academicYear,
      semester: semester
    }
  });

  // If either fails, entire transaction rolls back
  return { section, assignment };
});
```

---

## 🔍 Debugging Tips

### Debug Conflict Detection

```typescript
// Check why a schedule was rejected
const conflict = await conflictChecker.checkRoomConflict(
  roomId, dayOfWeek, startTime, endTime,
  academicYear, semester
);

if (conflict) {
  // Find the conflicting schedule
  const conflicting = await prisma.class_schedule.findFirst({
    where: {
      room_id: roomId,
      day_of_week: dayOfWeek,
      status: 'active',
      AND: [
        { start_time: { lt: endTime } },
        { end_time: { gt: startTime } }
      ]
    },
    include: {
      curriculum_course: true,
      faculty: true
    }
  });
  
  console.log('Conflict found:', conflicting);
  // Output conflict details for investigation
}
```

### Debug Capacity Issues

```typescript
const { currentCount, maxCapacity, available, isFull } =
  await capacityValidator.getCapacityInfo(sectionId);

console.log(`
  Current: ${currentCount}
  Max: ${maxCapacity}
  Available: ${available}
  Is Full: ${isFull}
`);

// Verify section count is consistent
const students = await prisma.student_section.count({
  where: {
    section_id: sectionId,
    academic_year: 2024,
    semester: 1
  }
});

if (students !== currentCount) {
  console.warn('Count mismatch:', { 
    section: currentCount, 
    actual: students 
  });
}
```

---

## 🎨 Frontend Patterns

### Pattern 1: Loading State Management

```typescript
function ScheduleBuilder() {
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadSchedules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClassSchedules({ sectionId });
      setSchedules(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Skeleton />;
  if (error) return <ErrorAlert message={error} />;
  return <ScheduleGrid schedules={schedules} />;
}
```

### Pattern 2: Form Validation

```typescript
function CreateSectionModal() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (data: CreateSectionRequest): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.sectionName) newErrors.sectionName = 'Required';
    if (data.yearLevel < 1 || data.yearLevel > 4) 
      newErrors.yearLevel = 'Must be 1-4';
    if (data.maxCapacity < 1) 
      newErrors.maxCapacity = 'Must be at least 1';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (data: CreateSectionRequest) => {
    if (!validate(data)) return;
    
    try {
      await createSection(data);
      toast.success('Section created');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <form>
      <input 
        {...register('sectionName')}
        {...(errors.sectionName && { 'aria-invalid': true })}
      />
      {errors.sectionName && <span>{errors.sectionName}</span>}
    </form>
  );
}
```

---

## 📊 Query Optimization Tips

### Index Usage

```typescript
// These queries will use indexes:

// Index: [faculty_id]
const schedules = await prisma.class_schedule.findMany({
  where: { faculty_id: 5 }
});

// Index: [room_id]
const roomSchedules = await prisma.class_schedule.findMany({
  where: { room_id: 101 }
});

// Index: [section_id, academic_year, semester]
const sectionSchedules = await prisma.class_schedule.findMany({
  where: {
    section_id: 1,
    academic_year: 2024,
    semester: 1
  }
});

// Unique constraint query (fast)
const assigned = await prisma.student_section.findUnique({
  where: {
    student_number_academic_year_semester: {
      student_number: "2024-0001",
      academic_year: 2024,
      semester: 1
    }
  }
});
```

### Batch Operations

```typescript
// SLOW: 100 queries
for (const studentNumber of studentNumbers) {
  await prisma.student_section.create({ ... });
}

// BETTER: 1 query + 1 update
await prisma.$transaction([
  prisma.student_section.createMany({
    data: studentNumbers.map(num => ({ ... }))
  }),
  prisma.sections.update({
    where: { id: sectionId },
    data: { student_count: { increment: studentNumbers.length } }
  })
]);
```

---

## 🧪 Unit Test Examples

```typescript
describe('conflictChecker', () => {
  it('detects room double booking', async () => {
    const conflict = await conflictChecker.checkRoomConflict(
      1,                      // roomId
      'Monday',
      new Date('2024-02-19T08:00:00Z'),
      new Date('2024-02-19T09:30:00Z'),
      2024,
      1
    );
    expect(conflict).toBe(true);
  });

  it('detects faculty scheduling conflict', async () => {
    const conflict = await conflictChecker.checkFacultyConflict(
      5,                      // facultyId
      'Monday',
      new Date('2024-02-19T09:00:00Z'),  // Overlaps existing 08:00-09:30
      new Date('2024-02-19T10:00:00Z'),
      2024,
      1
    );
    expect(conflict).toBe(true);
  });

  it('allows non-overlapping schedules', async () => {
    const conflict = await conflictChecker.checkRoomConflict(
      1,
      'Monday',
      new Date('2024-02-19T10:00:00Z'),  // After 09:30, no overlap
      new Date('2024-02-19T11:30:00Z'),
      2024,
      1
    );
    expect(conflict).toBe(false);
  });
});

describe('capacityValidator', () => {
  it('enforces max capacity', async () => {
    const { canAdd } = await capacityValidator.canAddStudents(1, 5);
    expect(canAdd).toBe(section.studentCount + 5 <= section.maxCapacity);
  });

  it('returns capacity info', async () => {
    const info = await capacityValidator.getCapacityInfo(1);
    expect(info).toHaveProperty('currentCount');
    expect(info).toHaveProperty('maxCapacity');
    expect(info).toHaveProperty('available');
    expect(info).toHaveProperty('isFull');
  });
});

describe('termValidator', () => {
  it('detects duplicate sections', async () => {
    const isDuplicate = await termValidator.checkDuplicateSection(
      1, 2, 2024, 1, 'A'
    );
    expect(isDuplicate).toBe(true);
  });

  it('detects already assigned students', async () => {
    const isAssigned = await termValidator.checkStudentAlreadyAssigned(
      "2024-0001", 2024, 1
    );
    expect(isAssigned).toBe(true);
  });

  it('validates section for activation', async () => {
    const { isValid, errors } = 
      await termValidator.validateSectionForActivation(1);
    expect(isValid).toBe(errors.length === 0);
    if (!isValid) {
      expect(errors).toContain('Section must have at least one schedule');
    }
  });
});
```

---

## 📋 Deployment Checklist

- [ ] All 7 endpoints tested
- [ ] Conflict prevention verified
- [ ] Capacity enforcement tested
- [ ] Transaction rollback tested
- [ ] Error messages localized
- [ ] Audit logging added
- [ ] Permissions verified (admin only)
- [ ] Rate limiting configured
- [ ] Database backups configured
- [ ] Indexes verified in production
- [ ] Monitoring/alerting set up
- [ ] Documentation reviewed

---

## 🔐 Security Considerations

```typescript
// 1. Verify admin authorization
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  // ... rest of handler
}

// 2. Sanitize input
const sectionName = body.sectionName.trim().slice(0, 100);

// 3. Validate enums
const validStatuses = ['draft', 'active', 'closed'];
if (!validStatuses.includes(body.status)) {
  throw new Error('Invalid status');
}

// 4. Check ownership
const section = await prisma.sections.findUnique({
  where: { id: sectionId }
});

if (section.program_id !== userProgram) {
  throw new Error('Access denied');
}
```

---

## 🚀 Performance Optimization

### Before:
```typescript
// 100 separate queries
const schedules = await prisma.class_schedule.findMany({ ... });
for (const schedule of schedules) {
  const faculty = await prisma.faculty.findUnique({ where: { id: schedule.faculty_id } });
}
```

### After:
```typescript
// 1 query with relations
const schedules = await prisma.class_schedule.findMany({
  where: { ... },
  include: {
    faculty: true,
    room: true,
    curriculum_course: true
  }
});
```

**Result:** 99 fewer database queries! ⚡

---

Generated: February 13, 2024
