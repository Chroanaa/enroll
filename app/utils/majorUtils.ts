import axios from "axios";
import { Major } from "../types";
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "./cache";

export async function getMajors(): Promise<Major[]> {
  return cacheManager.getOrFetch(
    CACHE_KEYS.MAJORS,
    async () => {
      const response = await axios.get("/api/auth/major");
      return response.data || [];
    },
    CACHE_TTL.LONG,
  );
}
