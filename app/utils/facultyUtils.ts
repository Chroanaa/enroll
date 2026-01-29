import axios from "axios";
import { Faculty } from "../types";
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "./cache";

export async function getFaculties(): Promise<Faculty[]> {
  return cacheManager.getOrFetch(
    CACHE_KEYS.FACULTIES,
    async () => {
      const response = await axios.get("/api/auth/faculty");
      return response.data || [];
    },
    CACHE_TTL.LONG,
  );
}
