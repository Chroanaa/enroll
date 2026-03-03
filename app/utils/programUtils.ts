/**
 * Utility functions for working with programs and majors
 */

export interface ProgramWithMajor {
  value: string;
  label: string;
  programId: number;
  programCode: string;
  majorId: number | null;
  majorName: string | null;
}

/**
 * Fetches all programs with their majors from the API
 * Returns formatted data like "BSIT - no major" or "BEED - Filipino"
 */
export async function fetchProgramsWithMajors(): Promise<ProgramWithMajor[]> {
  try {
    const response = await fetch("/api/programs-with-majors");
    
    if (!response.ok) {
      throw new Error("Failed to fetch programs");
    }

    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || "Failed to fetch programs");
    }
  } catch (error) {
    console.error("Error fetching programs with majors:", error);
    throw error;
  }
}

/**
 * Parses a program filter value (e.g., "1" or "1-5") into programId and majorId
 */
export function parseProgramFilter(filterValue: string): {
  programId: number | null;
  majorId: number | null;
} {
  if (!filterValue) {
    return { programId: null, majorId: null };
  }

  const parts = filterValue.split("-");
  const programId = parseInt(parts[0]);
  const majorId = parts[1] ? parseInt(parts[1]) : null;

  return {
    programId: isNaN(programId) ? null : programId,
    majorId: majorId !== null && isNaN(majorId) ? null : majorId,
  };
}

/**
 * Formats a program and major into a display string
 * @param programCode - The program code (e.g., "BSIT")
 * @param majorName - The major name (e.g., "Filipino") or null
 * @returns Formatted string like "BSIT - no major" or "BEED - Filipino"
 */
export function formatProgramDisplay(
  programCode: string,
  majorName: string | null
): string {
  if (!majorName) {
    return `${programCode} - no major`;
  }
  return `${programCode} - ${majorName}`;
}

/**
 * Server-side function to fetch programs with majors from database
 * This is meant to be used in API routes
 */
export async function getProgramsWithMajorsFromDB(prisma: any): Promise<ProgramWithMajor[]> {
  // Fetch all active programs
  const programs = await prisma.program.findMany({
    where: {
      status: "active",
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
    orderBy: {
      code: "asc",
    },
  });

  // Fetch all active majors
  const majors = await prisma.major.findMany({
    where: {
      status: "active",
    },
    select: {
      id: true,
      code: true,
      name: true,
      program_id: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // Group majors by program_id
  const majorsByProgram = majors.reduce((acc, major) => {
    if (!acc[major.program_id]) {
      acc[major.program_id] = [];
    }
    acc[major.program_id].push(major);
    return acc;
  }, {} as Record<number, typeof majors>);

  // Build the result with format: "BSIT - no major" or "BEED - Filipino"
  const result: ProgramWithMajor[] = [];

  programs.forEach((program) => {
    const programMajors = majorsByProgram[program.id] || [];

    if (programMajors.length === 0) {
      // Program with no majors
      result.push({
        value: `${program.id}`,
        label: formatProgramDisplay(program.code, null),
        programId: program.id,
        programCode: program.code,
        majorId: null,
        majorName: null,
      });
    } else {
      // Program with majors - create an entry for each major
      programMajors.forEach((major) => {
        result.push({
          value: `${program.id}-${major.id}`,
          label: formatProgramDisplay(program.code, major.name),
          programId: program.id,
          programCode: program.code,
          majorId: major.id,
          majorName: major.name,
        });
      });
    }
  });

  return result;
}

/**
 * Legacy function to fetch programs (without majors)
 * Fetches basic program data from the API
 */
export async function getPrograms() {
  try {
    const response = await fetch("/api/auth/program");
    
    if (!response.ok) {
      throw new Error("Failed to fetch programs");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching programs:", error);
    throw error;
  }
}
