import { NextRequest, NextResponse } from "next/server";

const PSGC_API_BASE = "https://psgc.cloud/api";

// Cache for 1 hour
const CACHE_DURATION = 3600 * 1000;
let cache: { data: any[]; timestamp: number } | null = null;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cityCode = searchParams.get("cityCode");

    // For now, fetch all barangays
    // In the future, PSGC API might support filtering by city code
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      const data = cityCode
        ? cache.data.filter((b: any) => b.city_code === cityCode)
        : cache.data;
      return NextResponse.json({ data }, { status: 200 });
    }

    // Fetch from PSGC API
    const response = await fetch(`${PSGC_API_BASE}/barangays`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) {
      throw new Error(`PSGC API error: ${response.status}`);
    }

    const data = await response.json();

    // Update cache
    cache = {
      data,
      timestamp: Date.now(),
    };

    // Filter by city code if provided
    const filteredData = cityCode
      ? data.filter((b: any) => b.city_code === cityCode)
      : data;

    return NextResponse.json({ data: filteredData }, { status: 200 });
  } catch (error) {
    console.error("Error fetching barangays from PSGC API:", error);
    return NextResponse.json(
      { error: "Failed to fetch barangays" },
      { status: 500 }
    );
  }
}

