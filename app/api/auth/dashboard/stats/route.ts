import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get current settings for semester and academic year
    const [semesterSetting, academicYearSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: "current_semester" } }),
      prisma.settings.findUnique({ where: { key: "current_academic_year" } }),
    ]);

    const currentSemester = semesterSetting?.value || "First";
    const currentAcademicYear =
      academicYearSetting?.value ||
      `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

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
      prisma.enrollment.count(),

      // Pending enrollments (status = 0 or null)
      prisma.enrollment.count({
        where: { OR: [{ status: 0 }, { status: null }] },
      }),

      // Approved enrollments (status = 1)
      prisma.enrollment.count({
        where: { status: 1 },
      }),

      // Total students
      prisma.students.count(),

      // Total programs
      prisma.program.count({
        where: { status: "active" },
      }),

      // Total departments
      prisma.department.count({
        where: { status: "active" },
      }),

      // Recent enrollments (last 7 days)
      prisma.enrollment.count({
        where: {
          admission_date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Enrollments by status
      prisma.enrollment.groupBy({
        by: ["admission_status"],
        _count: { id: true },
      }),

      // Enrollments by department
      prisma.enrollment.groupBy({
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

    return NextResponse.json({
      data: {
        currentSemester,
        currentAcademicYear,
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
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
