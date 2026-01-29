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
