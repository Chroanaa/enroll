import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with connection pool settings to handle connection resets
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// Reuse existing client in production to avoid connection exhaustion
// In development, also reuse to avoid connection reset issues
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
} else {
  globalForPrisma.prisma = prisma;
}

// Helper function to execute queries with retry logic for connection resets
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a connection reset error
      const isConnectionError = 
        error.message?.includes('ConnectionReset') ||
        error.message?.includes('connection was forcibly closed') ||
        error.code === 'P2024' || // Prisma connection pool timeout
        error.code === 'P1001' || // Can't reach database server
        error.code === 'P1002';   // Database server timed out
      
      if (isConnectionError && attempt < maxRetries) {
        console.warn(`Database connection error (attempt ${attempt}/${maxRetries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}
