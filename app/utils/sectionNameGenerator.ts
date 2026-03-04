/**
 * Utility functions for generating section names
 */

/**
 * Generates a section name based on program, major, and year level
 * Format: PROGRAM + MAJOR(optional) + YEAR - COUNT
 * Example: BSIT1 - 1, BSEDFI1 - 1
 */
export function generateSectionName(
  programCode: string,
  majorName: string | null,
  yearLevel: number,
  existingSections: string[]
): string {
  let majorCode = "";
  
  if (majorName) {
    // Extract first 2 letters of the major name
    majorCode = majorName.substring(0, 2).toUpperCase();
  }

  // Create prefix: PROGRAM + MAJOR + YEAR
  const prefix = `${programCode}${majorCode}${yearLevel}`;

  // Filter existing sections with the same prefix
  const filtered = existingSections.filter((sec) =>
    sec.startsWith(prefix)
  );

  // Auto-increment count
  const count = filtered.length + 1;

  return `${prefix} - ${count}`;
}

/**
 * Fetches existing sections by prefix from the API
 */
export async function fetchExistingSectionsByPrefix(
  prefix: string
): Promise<string[]> {
  try {
    const response = await fetch(
      `/api/auth/section/by-prefix?prefix=${encodeURIComponent(prefix)}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch existing sections");
    }

    const result = await response.json();

    if (result.success) {
      return result.sections;
    } else {
      throw new Error(result.error || "Failed to fetch sections");
    }
  } catch (error) {
    console.error("Error fetching existing sections:", error);
    return [];
  }
}

/**
 * Generates section prefix without the count
 * Format: PROGRAM + MAJOR(optional) + YEAR
 */
export function generateSectionPrefix(
  programCode: string,
  majorName: string | null,
  yearLevel: number
): string {
  let majorCode = "";
  
  if (majorName) {
    majorCode = majorName.substring(0, 2).toUpperCase();
  }

  return `${programCode}${majorCode}${yearLevel}`;
}
