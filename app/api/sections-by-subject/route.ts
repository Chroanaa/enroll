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

    console.log('[sections-by-subject] Searching for:', { curriculumCourseId, academicYear, semester });

    // Build where clause
    const whereClause: any = {
      curriculum_course_id: parseInt(curriculumCourseId),
      status: 'active'
    };

    // Add optional filters
    if (academicYear) whereClause.academic_year = academicYear;
    if (semester) whereClause.semester = semester;

    // Find all active class schedules for this curriculum course
    const classSchedules = await prisma.class_schedule.findMany({
      where: whereClause,
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

    // Fetch all sections by IDs and filter active ones
    const sections = await prisma.sections.findMany({
      where: {
        id: { in: sectionIds },
        status: 'active'
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
