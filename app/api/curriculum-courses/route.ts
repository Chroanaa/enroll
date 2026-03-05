import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

/**
 * GET /api/curriculum-courses
 * Fetch all unique curriculum courses
 */
export async function GET() {
  try {
    // Get all curriculum courses with distinct course codes
    const courses = await prisma.curriculum_course.findMany({
      select: {
        id: true,
        course_code: true,
        descriptive_title: true,
        curriculum_id: true,
      },
      orderBy: {
        course_code: 'asc',
      },
    });

    // Remove duplicates based on course_code
    const uniqueCourses = courses.reduce((acc: any[], course) => {
      const exists = acc.find(c => c.course_code === course.course_code);
      if (!exists) {
        acc.push(course);
      }
      return acc;
    }, []);

    return NextResponse.json(uniqueCourses);
  } catch (error) {
    console.error('Error fetching curriculum courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch curriculum courses' },
      { status: 500 }
    );
  }
}
