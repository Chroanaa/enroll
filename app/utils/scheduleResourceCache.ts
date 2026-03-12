"use client";

interface ScheduleResources {
  faculty: any[];
  rooms: any[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedResources: ScheduleResources | null = null;
let cachedAt = 0;
let inflightPromise: Promise<ScheduleResources> | null = null;

function normalizeFaculty(data: any): any[] {
  return Array.isArray(data)
    ? data.filter((f: any) => f.status === "active" || f.status === 1)
    : [];
}

function normalizeRooms(data: any): any[] {
  return Array.isArray(data)
    ? data.filter((r: any) => r.status === "available" || r.status === "active")
    : [];
}

async function fetchScheduleResources(): Promise<ScheduleResources> {
  const [facultyResponse, roomsResponse] = await Promise.all([
    fetch("/api/auth/faculty"),
    fetch("/api/auth/room"),
  ]);

  const [facultyData, roomsData] = await Promise.all([
    facultyResponse.ok ? facultyResponse.json() : [],
    roomsResponse.ok ? roomsResponse.json() : [],
  ]);

  return {
    faculty: normalizeFaculty(facultyData),
    rooms: normalizeRooms(roomsData),
  };
}

export async function getScheduleResources(
  forceRefresh = false,
): Promise<ScheduleResources> {
  const now = Date.now();

  if (
    !forceRefresh &&
    cachedResources &&
    now - cachedAt < CACHE_TTL_MS
  ) {
    return cachedResources;
  }

  if (!forceRefresh && inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = fetchScheduleResources()
    .then((resources) => {
      cachedResources = resources;
      cachedAt = Date.now();
      return resources;
    })
    .finally(() => {
      inflightPromise = null;
    });

  return inflightPromise;
}

export function primeScheduleResources(): void {
  void getScheduleResources().catch(() => {});
}
