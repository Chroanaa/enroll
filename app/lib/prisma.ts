import { PrismaClient } from "@prisma/client";

// Force new connections by not caching in development after schema changes
// Delete the cached prisma instance to get fresh query plans
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Always create a new client to avoid cached query plan issues
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

// Don't cache in development to avoid stale connections
if (process.env.NODE_ENV === "production") {
  globalForPrisma.prisma = prisma;
}
