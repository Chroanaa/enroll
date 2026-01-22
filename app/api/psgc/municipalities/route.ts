import { NextResponse } from "next/server";

const PSGC_API_BASE = "https://psgc.cloud/api";

// Cache for 1 hour
const CACHE_DURATION = 3600 * 1000;
let cache: { data: any[]; timestamp: number } | null = null;

export async function GET() {
  try {
    // Check cache
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json({ data: cache.data }, { status: 200 });
    }

    // Fetch from PSGC API
    const response = await fetch(`${PSGC_API_BASE}/municipalities`, {
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

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching municipalities from PSGC API:", error);
    return NextResponse.json(
      { error: "Failed to fetch municipalities" },
      { status: 500 }
    );
  }
}

