import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import {
  getAcademicTerm,
  formatAcademicTerm,
  getNextSemester,
  getPreviousSemester,
  AcademicTerm,
} from "../../../utils/academicTermUtils";

/**
 * GET /api/auth/academic-term
 *
 * Returns the current academic term (semester and school year) based on
 * database server time to prevent client-side tampering.
 *
 * Query Parameters:
 * - sync=true: Also updates the settings table with current values
 * - includeNext=true: Include next semester information
 * - includePrevious=true: Include previous semester information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shouldSync = searchParams.get("sync") === "true";
    const includeNext = searchParams.get("includeNext") === "true";
    const includePrevious = searchParams.get("includePrevious") === "true";

    // Get current time from database server (PostgreSQL)
    // This prevents tampering by using the database's own clock
    const serverTimeResult = await prisma.$queryRaw<
      [{ now: Date }]
    >`SELECT NOW() as now`;
    const serverTime = serverTimeResult[0].now;

    // Calculate academic term based on server time
    const currentTerm = getAcademicTerm(serverTime);

    // Prepare response
    const response: {
      success: boolean;
      data: {
        currentTerm: AcademicTerm & { formatted: string };
        nextTerm?: AcademicTerm & { formatted: string };
        previousTerm?: AcademicTerm & { formatted: string };
        synced?: boolean;
        storedSettings?: {
          semester: string | null;
          academicYear: string | null;
        };
      };
    } = {
      success: true,
      data: {
        currentTerm: {
          ...currentTerm,
          formatted: formatAcademicTerm(currentTerm),
        },
      },
    };

    // Include next semester if requested
    if (includeNext) {
      const nextTerm = getNextSemester(currentTerm);
      response.data.nextTerm = {
        ...nextTerm,
        formatted: formatAcademicTerm(nextTerm),
      };
    }

    // Include previous semester if requested
    if (includePrevious) {
      const previousTerm = getPreviousSemester(currentTerm);
      response.data.previousTerm = {
        ...previousTerm,
        formatted: formatAcademicTerm(previousTerm),
      };
    }

    // Sync to settings table if requested
    if (shouldSync) {
      await Promise.all([
        prisma.settings.upsert({
          where: { key: "current_semester" },
          update: {
            value: currentTerm.semester,
            description: `Auto-synced at ${serverTime.toISOString()}`,
          },
          create: {
            key: "current_semester",
            value: currentTerm.semester,
            description: `Auto-synced at ${serverTime.toISOString()}`,
          },
        }),
        prisma.settings.upsert({
          where: { key: "current_academic_year" },
          update: {
            value: currentTerm.academicYear,
            description: `Auto-synced at ${serverTime.toISOString()}`,
          },
          create: {
            key: "current_academic_year",
            value: currentTerm.academicYear,
            description: `Auto-synced at ${serverTime.toISOString()}`,
          },
        }),
        prisma.settings.upsert({
          where: { key: "last_term_sync" },
          update: {
            value: serverTime.toISOString(),
            description: "Last automatic academic term synchronization",
          },
          create: {
            key: "last_term_sync",
            value: serverTime.toISOString(),
            description: "Last automatic academic term synchronization",
          },
        }),
      ]);

      response.data.synced = true;
    }

    // Get stored settings for comparison
    const [semesterSetting, academicYearSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: "current_semester" } }),
      prisma.settings.findUnique({ where: { key: "current_academic_year" } }),
    ]);

    response.data.storedSettings = {
      semester: semesterSetting?.value || null,
      academicYear: academicYearSetting?.value || null,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Academic term fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to determine academic term",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/academic-term
 *
 * Force sync the academic term settings with current server time.
 * This should be called on application startup or via a cron job.
 */
export async function POST(request: NextRequest) {
  try {
    // Get current time from database server
    const serverTimeResult = await prisma.$queryRaw<
      [{ now: Date }]
    >`SELECT NOW() as now`;
    const serverTime = serverTimeResult[0].now;

    // Calculate academic term
    const currentTerm = getAcademicTerm(serverTime);

    // Update settings
    const [semesterResult, academicYearResult, syncResult] = await Promise.all([
      prisma.settings.upsert({
        where: { key: "current_semester" },
        update: {
          value: currentTerm.semester,
          description: `Force-synced at ${serverTime.toISOString()}`,
        },
        create: {
          key: "current_semester",
          value: currentTerm.semester,
          description: `Force-synced at ${serverTime.toISOString()}`,
        },
      }),
      prisma.settings.upsert({
        where: { key: "current_academic_year" },
        update: {
          value: currentTerm.academicYear,
          description: `Force-synced at ${serverTime.toISOString()}`,
        },
        create: {
          key: "current_academic_year",
          value: currentTerm.academicYear,
          description: `Force-synced at ${serverTime.toISOString()}`,
        },
      }),
      prisma.settings.upsert({
        where: { key: "last_term_sync" },
        update: {
          value: serverTime.toISOString(),
          description: "Last automatic academic term synchronization",
        },
        create: {
          key: "last_term_sync",
          value: serverTime.toISOString(),
          description: "Last automatic academic term synchronization",
        },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Academic term settings synchronized successfully",
        data: {
          currentTerm: {
            ...currentTerm,
            formatted: formatAcademicTerm(currentTerm),
          },
          updatedSettings: {
            semester: semesterResult.value,
            academicYear: academicYearResult.value,
            lastSync: syncResult.value,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Academic term sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync academic term",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
