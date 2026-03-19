import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/authOptions";
import { prisma } from "@/app/lib/prisma";

const ROLES = {
  FACULTY: 3,
} as const;

type EnrollmentPreview = {
  student_number: string | null;
  first_name: string | null;
  middle_name: string | null;
  family_name: string | null;
  email_address: string | null;
};

type DropHistoryRow = {
  student_number: string | null;
  academic_year: string | null;
  semester: number | null;
  curriculum_course_id: number | null;
  status: string | null;
};

function normalizeSemesterToNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = String(value || "").trim().toLowerCase();
  if (!text) return null;
  if (text === "1" || text.includes("first")) return 1;
  if (text === "2" || text.includes("second")) return 2;
  if (text === "3" || text.includes("third") || text.includes("summer")) return 3;
  return null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = Number((session?.user as any)?.role) || 0;
    const userId = Number((session?.user as any)?.id) || 0;

    if (!session || userRole !== ROLES.FACULTY || !Number.isFinite(userId)) {
      return NextResponse.json(
        { error: "Unauthorized. Faculty access only." },
        { status: 403 },
      );
    }

    const faculty = await prisma.faculty.findFirst({
      where: {
        user_id: userId,
      },
      select: {
        id: true,
        employee_id: true,
        first_name: true,
        middle_name: true,
        last_name: true,
        department_id: true,
      },
    });

    if (!faculty) {
      return NextResponse.json(
        {
          error:
            "No faculty profile linked to this account. Please assign this user to a faculty record.",
        },
        { status: 404 },
      );
    }

    const [department, scheduleCounts] = await Promise.all([
      prisma.department.findUnique({
        where: { id: faculty.department_id },
        select: { name: true },
      }),
      prisma.class_schedule.groupBy({
        by: ["section_id"],
        where: { faculty_id: faculty.id },
        _count: { id: true },
      }),
    ]);

    const sectionIds = scheduleCounts
      .map((row) => row.section_id)
      .filter((id): id is number => Number.isFinite(id));

    if (sectionIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          faculty: {
            id: faculty.id,
            employeeId: faculty.employee_id,
            fullName: [
              faculty.first_name,
              faculty.middle_name,
              faculty.last_name,
            ]
              .filter(Boolean)
              .join(" "),
            department: department?.name || "N/A",
          },
          sections: [],
          summary: {
            totalSections: 0,
            totalStudents: 0,
          },
        },
      });
    }

    const [sections, assignments, facultySchedules] = await Promise.all([
      prisma.sections.findMany({
        where: {
          id: { in: sectionIds },
        },
        select: {
          id: true,
          section_name: true,
          year_level: true,
          academic_year: true,
          semester: true,
          status: true,
          student_count: true,
          max_capacity: true,
        },
        orderBy: [{ academic_year: "desc" }, { section_name: "asc" }],
      }),
      prisma.student_section.findMany({
        where: {
          section_id: { in: sectionIds },
        },
        select: {
          id: true,
          section_id: true,
          student_number: true,
          academic_year: true,
          semester: true,
          assignment_type: true,
        },
        orderBy: [{ section_id: "asc" }, { student_number: "asc" }],
      }),
      prisma.class_schedule.findMany({
        where: {
          faculty_id: faculty.id,
          section_id: { in: sectionIds },
        },
        select: {
          section_id: true,
          curriculum_course_id: true,
        },
      }),
    ]);

    const studentNumbers = [
      ...new Set(
        assignments.map((item) => item.student_number).filter(Boolean),
      ),
    ];

    const enrollmentRows =
      studentNumbers.length > 0
        ? await prisma.enrollment.findMany({
            where: {
              student_number: { in: studentNumbers },
            },
            select: {
              student_number: true,
              first_name: true,
              middle_name: true,
              family_name: true,
              email_address: true,
            },
            orderBy: [{ id: "desc" }],
          })
        : [];

    const enrollmentByStudent = new Map<string, EnrollmentPreview>();
    for (const row of enrollmentRows) {
      const key = row.student_number || "";
      if (!key || enrollmentByStudent.has(key)) {
        continue;
      }
      enrollmentByStudent.set(key, row);
    }

    const scheduleCountMap = new Map<number, number>(
      scheduleCounts.map((row) => [row.section_id, row._count.id]),
    );

    const curriculumBySection = new Map<number, Set<number>>();
    for (const schedule of facultySchedules) {
      if (!Number.isFinite(schedule.section_id) || !Number.isFinite(schedule.curriculum_course_id)) {
        continue;
      }
      const sectionSet =
        curriculumBySection.get(schedule.section_id) || new Set<number>();
      sectionSet.add(Number(schedule.curriculum_course_id));
      curriculumBySection.set(schedule.section_id, sectionSet);
    }

    const allCurriculumCourseIds = [
      ...new Set(
        facultySchedules
          .map((row) => Number(row.curriculum_course_id))
          .filter((id) => Number.isFinite(id)),
      ),
    ];
    const allAcademicYears = [
      ...new Set(assignments.map((row) => row.academic_year).filter(Boolean)),
    ];

    const dropHistoryRows =
      studentNumbers.length > 0 &&
      allCurriculumCourseIds.length > 0 &&
      allAcademicYears.length > 0
        ? await prisma.$queryRaw<DropHistoryRow[]>`
            SELECT
              student_number,
              academic_year,
              semester,
              curriculum_course_id,
              status
            FROM subject_drop_history
            WHERE student_number IN (${Prisma.join(studentNumbers)})
              AND academic_year IN (${Prisma.join(allAcademicYears as string[])})
              AND curriculum_course_id IN (${Prisma.join(allCurriculumCourseIds)})
              AND status IN ('pending_approval', 'dropped')
          `
        : [];

    const dropStatusByStudentTerm = new Map<
      string,
      { pending: number; dropped: number }
    >();

    for (const row of dropHistoryRows) {
      const studentNumber = String(row.student_number || "");
      const academicYear = String(row.academic_year || "");
      const semesterNum = normalizeSemesterToNumber(row.semester);
      const curriculumCourseId = Number(row.curriculum_course_id);
      const normalizedStatus = String(row.status || "").toLowerCase();
      if (
        !studentNumber ||
        !academicYear ||
        !semesterNum ||
        !Number.isFinite(curriculumCourseId)
      ) {
        continue;
      }

      for (const section of sections) {
        if (
          section.academic_year !== academicYear ||
          normalizeSemesterToNumber(section.semester) !== semesterNum
        ) {
          continue;
        }

        const sectionCurricula = curriculumBySection.get(section.id);
        if (!sectionCurricula || !sectionCurricula.has(curriculumCourseId)) {
          continue;
        }

        const key = `${section.id}|${studentNumber}|${academicYear}|${semesterNum}`;
        const bucket = dropStatusByStudentTerm.get(key) || {
          pending: 0,
          dropped: 0,
        };
        if (normalizedStatus === "pending_approval") {
          bucket.pending += 1;
        } else if (normalizedStatus === "dropped") {
          bucket.dropped += 1;
        }
        dropStatusByStudentTerm.set(key, bucket);
      }
    }

    const studentsBySection = new Map<number, any[]>();
    for (const assignment of assignments) {
      const studentEnrollment = enrollmentByStudent.get(
        assignment.student_number,
      );
      const fullName = [
        studentEnrollment?.first_name,
        studentEnrollment?.middle_name,
        studentEnrollment?.family_name,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      const semesterNum = normalizeSemesterToNumber(assignment.semester);
      const dropKey = `${assignment.section_id}|${assignment.student_number}|${assignment.academic_year}|${semesterNum || ""}`;
      const dropStats = dropStatusByStudentTerm.get(dropKey);
      const pendingDropCount = dropStats?.pending || 0;
      const droppedCount = dropStats?.dropped || 0;
      const dropStatus =
        pendingDropCount > 0
          ? "pending_drop"
          : droppedCount > 0
            ? "dropped"
            : "active";

      const student = {
        assignmentId: assignment.id,
        studentNumber: assignment.student_number,
        fullName: fullName || assignment.student_number,
        email: studentEnrollment?.email_address || "",
        academicYear: assignment.academic_year,
        semester: assignment.semester,
        assignmentType: assignment.assignment_type || "regular",
        dropStatus,
        pendingDropCount,
        droppedCount,
      };

      const bucket = studentsBySection.get(assignment.section_id) || [];
      bucket.push(student);
      studentsBySection.set(assignment.section_id, bucket);
    }

    const formattedSections = sections.map((section) => ({
      id: section.id,
      sectionName: section.section_name,
      yearLevel: section.year_level,
      academicYear: section.academic_year,
      semester: section.semester,
      status: section.status,
      studentCount: section.student_count || 0,
      maxCapacity: section.max_capacity || 0,
      classScheduleCount: scheduleCountMap.get(section.id) || 0,
      students: studentsBySection.get(section.id) || [],
    }));

    const totalStudents = formattedSections.reduce(
      (acc, section) => acc + section.students.length,
      0,
    );

    return NextResponse.json({
      success: true,
      data: {
        faculty: {
          id: faculty.id,
          employeeId: faculty.employee_id,
          fullName: [faculty.first_name, faculty.middle_name, faculty.last_name]
            .filter(Boolean)
            .join(" "),
          department: department?.name || "N/A",
        },
        sections: formattedSections,
        summary: {
          totalSections: formattedSections.length,
          totalStudents,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching faculty sections/students:", error);
    return NextResponse.json(
      { error: "Failed to fetch faculty sections and students." },
      { status: 500 },
    );
  }
}
