import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAcademicTerm } from "../../../../utils/academicTermUtils";
import { ROLES } from "@/app/lib/rbac";
import { getSessionScope, isRoleAllowed } from "@/app/lib/accessScope";

const DASHBOARD_ALLOWED_ROLES = [
  ROLES.ADMIN,
  ROLES.CASHIER,
  ROLES.FACULTY,
  ROLES.REGISTRAR,
  ROLES.DEAN,
];

export async function GET(request: NextRequest) {
  try {
    const scope = await getSessionScope();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRoleAllowed(scope.roleId, DASHBOARD_ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (scope.isDean && !scope.deanDepartmentId) {
      return NextResponse.json(
        { error: "Dean account is not linked to a department." },
        { status: 403 },
      );
    }

    const deanFilter =
      scope.isDean && scope.deanDepartmentId
        ? { department: scope.deanDepartmentId }
        : {};

    // Get current server time from database to prevent tampering
    const serverTimeResult = await prisma.$queryRaw<
      [{ now: Date }]
    >`SELECT NOW() as now`;
    const serverTime = serverTimeResult[0].now;

    // Calculate current academic term from server time
    const calculatedTerm = getAcademicTerm(serverTime);

    // Get stored settings (they may be overridden or not exist)
    const [semesterSetting, academicYearSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: "current_semester" } }),
      prisma.settings.findUnique({ where: { key: "current_academic_year" } }),
    ]);

    // Use calculated values (from server time) - this prevents tampering
    // Settings are only used if you want manual override capability
    const currentSemester = calculatedTerm.semester;
    const currentAcademicYear = calculatedTerm.academicYear;

    // Get enrollment statistics
    const [
      totalEnrollments,
      pendingEnrollments,
      approvedEnrollments,
      totalStudents,
      totalPrograms,
      totalDepartments,
      recentEnrollments,
      enrollmentsByStatus,
      enrollmentsByDepartment,
    ] = await Promise.all([
      // Total enrollments
      prisma.enrollment.count({ where: deanFilter }),

      // Pending enrollments (status = 0 or null)
      prisma.enrollment.count({
        where: {
          OR: [{ status: 0 }, { status: null }],
          ...deanFilter,
        },
      }),

      // Approved enrollments (status = 1)
      prisma.enrollment.count({
        where: { status: 1, ...deanFilter },
      }),

      // Total students
      scope.isDean && scope.deanDepartmentId
        ? prisma.enrollment
            .findMany({
              where: {
                ...deanFilter,
                student_number: { not: null },
              },
              distinct: ["student_number"],
              select: { student_number: true },
            })
            .then((rows) => rows.length)
        : prisma.students.count(),

      // Total programs
      prisma.program.count({
        where:
          scope.isDean && scope.deanDepartmentId
            ? { status: "active", department_id: scope.deanDepartmentId }
            : { status: "active" },
      }),

      // Total departments
      prisma.department.count({
        where:
          scope.isDean && scope.deanDepartmentId
            ? { status: "active", id: scope.deanDepartmentId }
            : { status: "active" },
      }),

      // Recent enrollments (last 7 days)
      prisma.enrollment.count({
        where: {
          ...deanFilter,
          admission_date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Enrollments by status
      prisma.enrollment.groupBy({
        where: deanFilter,
        by: ["admission_status"],
        _count: { id: true },
      }),

      // Enrollments by department
      prisma.enrollment.groupBy({
        where: deanFilter,
        by: ["department"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ]);

    // Get department names for the top departments
    const departmentIds = enrollmentsByDepartment
      .map((d) => d.department)
      .filter((id): id is number => id !== null);

    const departments = await prisma.department.findMany({
      where: { id: { in: departmentIds } },
      select: { id: true, name: true, code: true },
    });

    const departmentMap = new Map(departments.map((d) => [d.id, d]));

    const topDepartments = enrollmentsByDepartment.map((d) => ({
      id: d.department,
      name: departmentMap.get(d.department!)?.name || "Unknown",
      code: departmentMap.get(d.department!)?.code || "N/A",
      count: d._count.id,
    }));

    // Calculate enrollment trend (compare this week to last week)
    const lastWeekEnrollments = await prisma.enrollment.count({
      where: {
        ...deanFilter,
        admission_date: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const enrollmentTrend =
      lastWeekEnrollments > 0
        ? ((recentEnrollments - lastWeekEnrollments) / lastWeekEnrollments) *
          100
        : recentEnrollments > 0
          ? 100
          : 0;

    // Get recent pending enrollments list
    const recentPendingEnrollments = await prisma.enrollment.findMany({
      where: {
        OR: [{ status: 0 }, { status: null }],
        ...deanFilter,
      },
      select: {
        id: true,
        family_name: true,
        first_name: true,
        middle_name: true,
        admission_date: true,
        admission_status: true,
        course_program: true,
        student_number: true,
      },
      orderBy: { admission_date: "desc" },
      take: 10,
    });

    return NextResponse.json({
      data: {
        currentSemester,
        currentAcademicYear,
        serverTime: serverTime.toISOString(),
        isWithinSemester: calculatedTerm.isWithinSemester,
        semesterDates: {
          start: calculatedTerm.semesterStartDate.toISOString(),
          end: calculatedTerm.semesterEndDate.toISOString(),
        },
        stats: {
          totalEnrollments,
          pendingEnrollments,
          approvedEnrollments,
          totalStudents,
          totalPrograms,
          totalDepartments,
          recentEnrollments,
          enrollmentTrend: Math.round(enrollmentTrend * 10) / 10,
        },
        enrollmentsByStatus: enrollmentsByStatus.map((s) => ({
          status: s.admission_status || "unknown",
          count: s._count.id,
        })),
        topDepartments,
        recentPendingEnrollments: recentPendingEnrollments.map((e) => ({
          id: e.id,
          studentNumber: e.student_number,
          name: `${e.family_name || ""}, ${e.first_name || ""} ${e.middle_name || ""}`.trim(),
          admissionDate: e.admission_date,
          admissionStatus: e.admission_status,
          program: e.course_program,
        })),
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
