import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import { termValidator } from '../../..//app/utils/sectionService';
import {
  CreateSectionRequest,
  SectionResponse,
  ApiError
} from '../../../app/types/sectionTypes';

/**
 * POST /api/sections
 * Create a new section
 *
 * Request Body:
 * - programId: number
 * - yearLevel: number
 * - academicYear: string
 * - semester: string
 * - sectionName: string
 * - advisor: string
 * - maxCapacity: number
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateSectionRequest = await request.json();

    // Validate required fields
    if (
      !body.programId ||
      !body.yearLevel ||
      !body.academicYear ||
      !body.semester ||
      !body.sectionName ||
      !body.advisor ||
      !body.maxCapacity
    ) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message:
            'Missing required fields: programId, yearLevel, academicYear, semester, sectionName, advisor, maxCapacity'
        } as ApiError,
        { status: 400 }
      );
    }

    // Validate year level (1-4)
    if (body.yearLevel < 1 || body.yearLevel > 4) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Year level must be between 1 and 4'
        } as ApiError,
        { status: 400 }
      );
    }

    // Validate semester
    const validSemesters = ['first', 'second', 'summer'];
    if (!validSemesters.includes(body.semester)) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Semester must be "first", "second", or "summer"'
        } as ApiError,
        { status: 400 }
      );
    }

    // Check if program exists
    const program = await prisma.program.findUnique({
      where: { id: body.programId }
    });

    if (!program) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Program ${body.programId} not found`
        } as ApiError,
        { status: 404 }
      );
    }

    // Check for duplicate section
    const isDuplicate = await termValidator.checkDuplicateSection(
      body.programId,
      body.yearLevel,
      body.academicYear,
      body.semester,
      body.sectionName
    );

    if (isDuplicate) {
      return NextResponse.json(
        {
          error: 'DUPLICATE_SECTION',
          message: `Section '${body.sectionName}' already exists for this program, year level, and term`
        } as ApiError,
        { status: 409 }
      );
    }

    // Create section in transaction
    const section = await prisma.$transaction(async (tx: any) => {
      return await tx.sections.create({
        data: {
          program_id: body.programId,
          year_level: body.yearLevel,
          academic_year: body.academicYear,
          semester: body.semester,
          section_name: body.sectionName,
          advisor: body.advisor,
          max_capacity: body.maxCapacity,
          student_count: 0,
          status: 'draft'
        }
      });
    });

    const response: SectionResponse = {
      id: section.id,
      programId: section.program_id,
      programCode: program?.code,
      programName: program?.name,
      yearLevel: section.year_level ?? 0,
      academicYear: section.academic_year ?? '',
      semester: section.semester ?? '',
      sectionName: section.section_name,
      advisor: section.advisor,
      maxCapacity: section.max_capacity ?? 0,
      studentCount: section.student_count ?? 0,
      status: section.status as 'draft' | 'active' | 'locked' | 'closed',
      createdAt: section.created_at?.toISOString() ?? ''
    };

    return NextResponse.json(
      { success: true, data: response },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to create section'
      } as ApiError,
      { status: 500 }
    );
  }
}

/**
 * GET /api/sections
 * List sections with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    const yearLevel = searchParams.get('yearLevel');
    const academicYear = searchParams.get('academicYear');
    const semester = searchParams.get('semester');
    const status = searchParams.get('status');

    const where: any = {};

    if (programId) where.program_id = parseInt(programId);
    if (yearLevel) where.year_level = parseInt(yearLevel);
    if (academicYear) where.academic_year = academicYear;
    if (semester) where.semester = semester;
    if (status) where.status = status;

    const sections = await prisma.sections.findMany({
      where,
      orderBy: [
        { academic_year: 'desc' },
        { semester: 'desc' },
        { section_name: 'asc' }
      ]
    });

    // Get real student counts from student_section (grouped by section_id)
    // This is accurate regardless of the cached sections.student_count value
    const sectionIds = sections.map((s: any) => s.id);
    const studentCountRows = sectionIds.length > 0
      ? await prisma.$queryRaw<{ section_id: number; cnt: bigint }[]>`
          SELECT section_id, COUNT(*) AS cnt
          FROM student_section
          WHERE section_id IN (${Prisma.join(sectionIds)})
          GROUP BY section_id
        `
      : [];

    const studentCountMap = new Map<number, number>(
      studentCountRows.map(row => [row.section_id, Number(row.cnt)])
    );

    // Fetch unique program IDs once to avoid N+1
    const uniqueProgramIds = [...new Set(sections.map((s: any) => s.program_id))];
    const programs = await prisma.program.findMany({
      where: { id: { in: uniqueProgramIds as number[] } },
      select: { id: true, code: true, name: true }
    });
    const programMap = new Map(programs.map((p: any) => [p.id, p]));

    const response = sections.map((section: any) => {
      const program = programMap.get(section.program_id);
      const realCount = studentCountMap.get(section.id) ?? 0;

      // Keep cached student_count in sync silently (fire-and-forget)
      if (realCount !== (section.student_count ?? 0)) {
        prisma.sections.update({
          where: { id: section.id },
          data: { student_count: realCount }
        }).catch(() => {});
      }

      return {
        id: section.id,
        programId: section.program_id,
        programCode: program?.code,
        programName: program?.name,
        yearLevel: section.year_level ?? 0,
        academicYear: section.academic_year ?? '',
        semester: section.semester ?? '',
        sectionName: section.section_name,
        advisor: section.advisor,
        maxCapacity: section.max_capacity ?? 0,
        studentCount: realCount,
        status: section.status as 'draft' | 'active' | 'locked' | 'closed',
        createdAt: section.created_at?.toISOString() ?? ''
      } as SectionResponse;
    });

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to fetch sections'
      } as ApiError,
      { status: 500 }
    );
  }
}
