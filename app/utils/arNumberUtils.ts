import { prisma } from "@/app/lib/prisma";

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
