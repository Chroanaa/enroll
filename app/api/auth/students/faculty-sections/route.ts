import { NextResponse } from "next/server";
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

    const [sections, assignments] = await Promise.all([
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

      const student = {
        assignmentId: assignment.id,
        studentNumber: assignment.student_number,
        fullName: fullName || assignment.student_number,
        email: studentEnrollment?.email_address || "",
        academicYear: assignment.academic_year,
        semester: assignment.semester,
        assignmentType: assignment.assignment_type || "regular",
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
