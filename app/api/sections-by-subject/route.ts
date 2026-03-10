import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

/**
 * GET /api/sections-by-subject
 * Fetch all sections that have class schedules for a specific curriculum course
 * 
 * Query params:
 * - curriculumCourseId: number (required)
 * - academicYear: string (required)
 * - semester: string (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const curriculumCourseId = searchParams.get('curriculumCourseId');
    const academicYear = searchParams.get('academicYear');
    const semester = searchParams.get('semester');

    if (!curriculumCourseId) {
      return NextResponse.json(
        { error: 'Missing required parameter: curriculumCourseId' },
        { status: 400 }
      );
    }

    const parsedId = parseInt(curriculumCourseId);
    if (isNaN(parsedId)) {
      return NextResponse.json(
        { error: 'Invalid curriculumCourseId' },
        { status: 400 }
      );
    }

    console.log('[sections-by-subject] Searching for:', { curriculumCourseId, academicYear, semester });

    // Resolve all curriculum_course IDs that share the same course_code.
    // This handles curriculum-update scenarios where a subject was re-created
    // with a new ID: enrolled_subjects may reference the old ID while the
    // class_schedule references the new one.
    let curriculumCourseIds: number[] = [parsedId];
    try {
      const sourceCC = await prisma.curriculum_course.findUnique({
        where: { id: parsedId },
        select: { course_code: true }
      });
      if (sourceCC?.course_code) {
        const allCC = await prisma.curriculum_course.findMany({
          where: { course_code: sourceCC.course_code },
          select: { id: true }
        });
        curriculumCourseIds = allCC.map((c: { id: number }) => c.id);
      }
    } catch {
      // If lookup fails, fall back to the single ID
    }

    console.log('[sections-by-subject] Resolved curriculum course IDs:', curriculumCourseIds);

    // Build where clause — match any of the resolved curriculum course IDs.
    // We also tolerate class_schedule rows whose semester column is NULL
    // (can happen with records migrated from the old integer-semester schema).
    const scheduleWhere: any = {
      curriculum_course_id: { in: curriculumCourseIds },
    };

    if (academicYear) scheduleWhere.academic_year = academicYear;

    // For semester: match the requested value OR null (legacy records)
    if (semester) {
      scheduleWhere.OR = [
        { semester: semester },
        { semester: null }
      ];
    }

    // Find all class schedules for this curriculum course
    const classSchedules = await prisma.class_schedule.findMany({
      where: scheduleWhere,
      select: {
        section_id: true
      }
    });

    console.log('[sections-by-subject] Found class schedules:', classSchedules.length);

    // Get unique section IDs
    const sectionIds = [...new Set(classSchedules.map(cs => cs.section_id))];
    
    if (sectionIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0
      });
    }

    console.log('[sections-by-subject] Unique section IDs:', sectionIds);

    // Fetch all sections by IDs — include any status except 'closed'
    const sections = await prisma.sections.findMany({
      where: {
        id: { in: sectionIds },
        NOT: { status: 'closed' }
      }
    });

    console.log('[sections-by-subject] Found active sections:', sections.length);

    // Get program details for these sections
    const programIds = [...new Set(sections.map(s => s.program_id).filter(Boolean))];
    
    let programMap = new Map();
    if (programIds.length > 0) {
      const programs = await prisma.program.findMany({
        where: { id: { in: programIds } },
        select: { id: true, code: true, name: true }
      });
      programs.forEach(p => programMap.set(p.id, { code: p.code, name: p.name }));
    }

    // Format response
    const sectionsWithPrograms = sections.map(section => {
      const program = programMap.get(section.program_id);
      return {
        id: section.id,
        sectionName: section.section_name,
        programCode: program?.code || '',
        programName: program?.name || '',
        yearLevel: section.year_level,
        academicYear: section.academic_year,
        semester: section.semester,
        status: section.status,
        studentCount: section.student_count || 0,
        maxCapacity: section.max_capacity || 0
      };
    });

    return NextResponse.json({
      success: true,
      data: sectionsWithPrograms,
      count: sectionsWithPrograms.length
    });

  } catch (error) {
    console.error('Error fetching sections by subject:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}
