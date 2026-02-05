import axios from "axios";
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "./cache";

export async function getCurriculums() {
  return cacheManager.getOrFetch(
    CACHE_KEYS.CURRICULUMS,
    async () => {
      const response = await axios.get("/api/auth/curriculum");
      return response.data || [];
    },
    CACHE_TTL.LONG,
  );
}

export async function getCurriculumsFresh() {
  // Force fresh fetch by invalidating cache first
  cacheManager.invalidate(CACHE_KEYS.CURRICULUMS);
  return getCurriculums();
}

export function invalidateCurriculumsCache() {
  cacheManager.invalidate(CACHE_KEYS.CURRICULUMS);
}
