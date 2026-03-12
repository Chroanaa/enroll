/**
 * Academic Term Utilities
 *
 * Automatically detects the current semester and school year based on dates.
 * Uses database server time to prevent tampering.
 *
 * Semester Schedule:
 * - First Semester: August 1 - December 20
 * - Second Semester: January 12 - July 31
 *
 * School Year Format: "2025-2026"
 * - First Semester (Aug-Dec) = current year - next year (e.g., Aug 2025 = "2025-2026")
 * - Second Semester (Jan-Jul) = previous year - current year (e.g., Jan 2026 = "2025-2026")
 */

export interface AcademicTerm {
  semester: "First" | "Second";
  semesterCode: "first" | "second";
  academicYear: string; // Format: "2025-2026"
  startYear: number;
  endYear: number;
  semesterStartDate: Date;
  semesterEndDate: Date;
  serverTime: Date;
  isWithinSemester: boolean;
}

export interface SemesterDateRange {
  semester: "First" | "Second";
  startMonth: number; // 1-12
  startDay: number;
  endMonth: number;
  endDay: number;
}

// Semester date configurations
export const SEMESTER_DATES: SemesterDateRange[] = [
  {
    semester: "First",
    startMonth: 8, // August
    startDay: 1,
    endMonth: 12, // December
    endDay: 20,
  },
  {
    semester: "Second",
    startMonth: 1, // January
    startDay: 12,
    endMonth: 7, // July
    endDay: 31,
  },
];

/**
 * Get the academic year string based on the current date
 * First Semester (Aug-Dec): uses current year as start year
 * Second Semester (Jan-Jul): uses previous year as start year
 */
export function getAcademicYear(date: Date): {
  academicYear: string;
  startYear: number;
  endYear: number;
} {
  const month = date.getMonth() + 1; // getMonth() is 0-indexed
  const year = date.getFullYear();

  let startYear: number;
  let endYear: number;

  // August to December = First Semester (current year - next year)
  if (month >= 8) {
    startYear = year;
    endYear = year + 1;
  } else {
    // January to July = Second Semester (previous year - current year)
    startYear = year - 1;
    endYear = year;
  }

  return {
    academicYear: `${startYear}-${endYear}`,
    startYear,
    endYear,
  };
}

/**
 * Determine the current semester based on the date
 */
export function getCurrentSemester(date: Date): {
  semester: "First" | "Second";
  semesterCode: "first" | "second";
  isWithinSemester: boolean;
} {
  const month = date.getMonth() + 1; // getMonth() is 0-indexed
  const day = date.getDate();

  // Check First Semester: August 1 - December 20
  if (
    (month === 8 && day >= 1) ||
    (month > 8 && month < 12) ||
    (month === 12 && day <= 20)
  ) {
    return { semester: "First", semesterCode: "first", isWithinSemester: true };
  }

  // Check Second Semester: January 12 - July 31
  if (
    (month === 1 && day >= 12) ||
    (month > 1 && month < 7) ||
    (month === 7 && day <= 31)
  ) {
    return {
      semester: "Second",
      semesterCode: "second",
      isWithinSemester: true,
    };
  }

  // Gap periods (December 21-31, January 1-11)
  // During gaps, use the upcoming semester
  if ((month === 12 && day > 20) || (month === 1 && day < 12)) {
    // This is the winter break - next semester is Second
    return {
      semester: "Second",
      semesterCode: "second",
      isWithinSemester: false,
    };
  }

  // Default fallback (should not reach here normally)
  return { semester: "First", semesterCode: "first", isWithinSemester: false };
}

/**
 * Get semester start and end dates for a given academic year
 */
export function getSemesterDates(
  semester: "First" | "Second",
  academicYearStart: number,
): { startDate: Date; endDate: Date } {
  const config = SEMESTER_DATES.find((s) => s.semester === semester);

  if (!config) {
    throw new Error(`Invalid semester: ${semester}`);
  }

  let startYear: number;
  let endYear: number;

  if (semester === "First") {
    // First semester: Aug-Dec of start year
    startYear = academicYearStart;
    endYear = academicYearStart;
  } else {
    // Second semester: Jan-Jul of end year (start year + 1)
    startYear = academicYearStart + 1;
    endYear = academicYearStart + 1;
  }

  return {
    startDate: new Date(startYear, config.startMonth - 1, config.startDay),
    endDate: new Date(endYear, config.endMonth - 1, config.endDay),
  };
}

/**
 * Get complete academic term information based on a date
 */
export function getAcademicTerm(date: Date): AcademicTerm {
  const { academicYear, startYear, endYear } = getAcademicYear(date);
  const { semester, semesterCode, isWithinSemester } = getCurrentSemester(date);
  const { startDate, endDate } = getSemesterDates(semester, startYear);

  return {
    semester,
    semesterCode,
    academicYear,
    startYear,
    endYear,
    semesterStartDate: startDate,
    semesterEndDate: endDate,
    serverTime: date,
    isWithinSemester,
  };
}

/**
 * Filter used by the bulk section schedule print flow.
 * Keeps the active academic year, while always targeting second semester.
 */
export function getPrintAllSectionScheduleFilter(
  term?: Pick<AcademicTerm, "academicYear"> | null,
): {
  academicYear: string;
  semester: "second";
} {
  return {
    academicYear: term?.academicYear ?? getAcademicTerm(new Date()).academicYear,
    semester: "second",
  };
}

/**
 * Format academic term for display
 */
export function formatAcademicTerm(term: AcademicTerm): string {
  return `${term.semester} Semester, A.Y. ${term.academicYear}`;
}

/**
 * Validate if a given date falls within an expected semester
 */
export function isDateInSemester(
  date: Date,
  expectedSemester: "First" | "Second",
  expectedAcademicYear: string,
): boolean {
  const term = getAcademicTerm(date);
  return (
    term.semester === expectedSemester &&
    term.academicYear === expectedAcademicYear
  );
}

/**
 * Get the next semester information
 */
export function getNextSemester(currentTerm: AcademicTerm): AcademicTerm {
  let nextDate: Date;

  switch (currentTerm.semester) {
    case "First":
      // Next is Second semester of the same academic year
      nextDate = new Date(currentTerm.endYear, 0, 12); // January 12 of end year
      break;
    case "Second":
      // Next is First semester of the next academic year
      nextDate = new Date(currentTerm.endYear, 7, 1); // August 1 of end year
      break;
    default:
      nextDate = new Date();
  }

  return getAcademicTerm(nextDate);
}

/**
 * Get the previous semester information
 */
export function getPreviousSemester(currentTerm: AcademicTerm): AcademicTerm {
  let prevDate: Date;

  switch (currentTerm.semester) {
    case "First":
      // Previous is Second semester of the previous academic year
      prevDate = new Date(currentTerm.startYear, 0, 12); // January 12 of start year
      break;
    case "Second":
      // Previous is First semester of the same academic year
      prevDate = new Date(currentTerm.startYear, 7, 1); // August 1 of start year
      break;
    default:
      prevDate = new Date();
  }

  return getAcademicTerm(prevDate);
}
