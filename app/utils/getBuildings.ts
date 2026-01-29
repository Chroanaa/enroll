import axios from "axios";
import { Building } from "../types";
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "./cache";

export async function getBuildings(): Promise<Building[]> {
  return cacheManager.getOrFetch(
    CACHE_KEYS.BUILDINGS,
    () =>
      axios.get("/api/auth/building").then((response) => response.data || []),
    CACHE_TTL.LONG,
  );
}
