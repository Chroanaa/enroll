import { NextRequest, NextResponse } from "next/server";

const PSGC_API_BASE = "https://psgc.cloud/api";

// Cache for 1 hour
const CACHE_DURATION = 3600 * 1000;
const cache: Record<string, { data: any[]; timestamp: number }> = {};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ regionCode: string }> },
) {
  try {
    const resolvedParams = await params;
    const { regionCode } = resolvedParams;

    if (!regionCode) {
      return NextResponse.json(
        { error: "Region code is required" },
        { status: 400 },
      );
    }

    // Check cache first
    const cacheKey = regionCode;
    if (
      cache[cacheKey] &&
      Date.now() - cache[cacheKey].timestamp < CACHE_DURATION
    ) {
      return NextResponse.json({ data: cache[cacheKey].data }, { status: 200 });
    }

    // Fetch from PSGC API v2 - regions endpoint
    // API URL format: /v2/regions/1300000000/cities (with extra zero at the end)
    // If regionCode is 130000000, convert to 1300000000 for the API
    const apiRegionCode =
      regionCode.length === 9 ? `${regionCode}0` : regionCode;
    const response = await fetch(
      `${PSGC_API_BASE}/v2/regions/${apiRegionCode}/cities`,
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
