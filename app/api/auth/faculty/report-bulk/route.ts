import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

interface FacultyReportBulkRequest {
  departmentId?: number | 'all' | null;
  status?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as FacultyReportBulkRequest;
    const rawDepartmentId = body?.departmentId;
    const status = (body?.status || 'active').toLowerCase();

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    if (rawDepartmentId !== undefined && rawDepartmentId !== null && rawDepartmentId !== 'all') {
      const departmentId = Number(rawDepartmentId);
      if (Number.isInteger(departmentId) && departmentId > 0) {
        where.department_id = departmentId;
      }
    }

    const faculties = await prisma.faculty.findMany({
      where,
      orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
      select: {
        id: true,
        employee_id: true,
        first_name: true,
        middle_name: true,
        last_name: true,
        email: true,
        phone: true,
        department_id: true,
        position: true,
        status: true,
      },
    });

    const departmentIds = [...new Set(faculties.map((item) => item.department_id).filter(Boolean))];
    const departments = departmentIds.length
      ? await prisma.department.findMany({
          where: { id: { in: departmentIds } },
          select: { id: true, name: true },
        })
      : [];
    const departmentMap = new Map(departments.map((department) => [department.id, department.name]));

    const rows = faculties.map((faculty) => ({
      ...faculty,
      departmentName: faculty.department_id ? departmentMap.get(faculty.department_id) || 'N/A' : 'N/A',
    }));

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching bulk faculty report data:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch faculty report data',
      },
      { status: 500 }
    );
  }
}

