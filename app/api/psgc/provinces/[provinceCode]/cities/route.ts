import { NextRequest, NextResponse } from "next/server";

const PSGC_API_BASE = "https://psgc.cloud/api";

// Cache for 1 hour
const CACHE_DURATION = 3600 * 1000;
const cache: Record<string, { data: any[]; timestamp: number }> = {};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provinceCode: string }> },
) {
  try {
    const resolvedParams = await params;
    const { provinceCode } = resolvedParams;

    if (!provinceCode) {
      return NextResponse.json(
        { error: "Province code is required" },
        { status: 400 },
      );
    }

    // Check cache first
    const cacheKey = provinceCode;
    if (
      cache[cacheKey] &&
      Date.now() - cache[cacheKey].timestamp < CACHE_DURATION
    ) {
      return NextResponse.json({ data: cache[cacheKey].data }, { status: 200 });
    }

    // Fetch from PSGC API v2 - provinces endpoint
    // API URL format: /v2/provinces/{provinceCode}/cities
    const response = await fetch(
      `${PSGC_API_BASE}/v2/provinces/${provinceCode}/cities`,
      {
        next: { revalidate: 3600 }, // Revalidate every hour
      },
    );

    if (!response.ok) {
      throw new Error(`PSGC API error: ${response.status}`);
    }

    const data = await response.json();

    // Update cache
    cache[cacheKey] = {
      data: data.data || data,
      timestamp: Date.now(),
    };

    return NextResponse.json({ data: data.data || data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching cities from PSGC API:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities" },
      { status: 500 },
    );
  }
}
