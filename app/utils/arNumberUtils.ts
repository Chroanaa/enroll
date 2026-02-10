import { prisma } from "@/app/lib/prisma";
import { getAcademicYear, getCurrentSemester } from "./academicTermUtils";

/**
 * Generates a unique OR (Official Receipt) number for transactions
 * Format: YYYYTT######
 * - YYYY = Academic Year (e.g., 2526 for AY 2025-2026)
 * - TT = Term (01 for 1st semester, 02 for 2nd semester)
 * - ###### = 6-digit alphanumeric sequence (000001, 000002, etc.)
 *
 * Example: 252601000001 = AY 2025-2026, 1st Semester, Sequence 1
 *
 * The date is fetched from the database to prevent tampering
 */
export async function generateORNumber(): Promise<string> {
  // Get server date from database to prevent client-side tampering
  const serverTimeResult = await prisma.$queryRaw<
    [{ now: Date }]
  >`SELECT NOW() as now`;
  const serverDate = serverTimeResult[0].now;

  // Get academic year info
  const { startYear, endYear } = getAcademicYear(serverDate);

  // Format academic year as YYYY (last 2 digits of start year + last 2 digits of end year)
  const ayCode = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;

  // Get current semester
  const { semester } = getCurrentSemester(serverDate);
  const termCode = semester === "First" ? "01" : "02";

  // Create prefix for OR number (YYYYTT)
  const orPrefix = `${ayCode}${termCode}`;

  // Count existing OR numbers with the same prefix to create a sequence number
  const existingCountResult = await prisma.$queryRaw<
    [{ count: bigint }]
  >`SELECT COUNT(*) as count FROM order_header WHERE or_number LIKE ${orPrefix + "%"}`;
  const existingCount = Number(existingCountResult[0].count);

  // Sequence number (1-based, padded to 6 digits)
  const sequence = String(existingCount + 1).padStart(6, "0");

  // Final OR Number format: YYYYTT######
  return `${orPrefix}${sequence}`;
}

/**
 * Generates a unique AR (Acknowledgment Receipt) number for transactions
 * Format: AR-{YYYYMMDD}-{StudentNumber/ORDER}-{Sequence}
 *
 * The date is fetched from the database to prevent tampering
 */
export async function generateARNumber(
  studentNumber?: string | null,
): Promise<string> {
  // Get server date from database to prevent client-side tampering
  const serverTimeResult = await prisma.$queryRaw<
    [{ now: Date }]
  >`SELECT NOW() as now`;
  const serverDate = serverTimeResult[0].now;

  // Format date as YYYYMMDD
  const year = serverDate.getFullYear();
  const month = String(serverDate.getMonth() + 1).padStart(2, "0");
  const day = String(serverDate.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  // Use student number or 'ORD' for orders without student
  const identifier = studentNumber
    ? studentNumber.replace(/[^a-zA-Z0-9]/g, "") // Remove special chars from student number
    : "ORD";

  // Get the count of orders today to create a sequence number
  const startOfDay = new Date(serverDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(serverDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Count existing AR numbers with the same date and identifier prefix
  const arPrefix = `AR-${dateStr}-${identifier}`;

  const existingCount = await prisma.order_header.count({
    where: {
      ar_number: {
        startsWith: arPrefix,
      },
    },
  });

  // Sequence number (1-based, padded to 4 digits)
  const sequence = String(existingCount + 1).padStart(4, "0");

  // Final AR Number format: AR-YYYYMMDD-STUDENTNUMBER-0001
  return `${arPrefix}-${sequence}`;
}

/**
 * Gets the current server date from database
 * Used to ensure date consistency and prevent tampering
 */
export async function getServerDate(): Promise<Date> {
  const serverTimeResult = await prisma.$queryRaw<
    [{ now: Date }]
  >`SELECT NOW() as now`;
  return serverTimeResult[0].now;
}
