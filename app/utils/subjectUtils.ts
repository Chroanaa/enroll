import axios from "axios";
import { Subject } from "../types";
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "./cache";

export async function getSubjects(): Promise<Subject[]> {
  return cacheManager.getOrFetch(
    CACHE_KEYS.SUBJECTS,
    async () => {
      const response = await axios.get("/api/auth/subject");
      return response.data || [];
    },
    CACHE_TTL.LONG,
  );
}
