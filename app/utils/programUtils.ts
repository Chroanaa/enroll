import axios from "axios";
import { Program } from "../types";
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "./cache";

export async function getPrograms(): Promise<Program[]> {
  return cacheManager.getOrFetch(
    CACHE_KEYS.PROGRAMS,
    async () => {
      const response = await axios.get("/api/auth/program");
      return response.data || [];
    },
    CACHE_TTL.LONG,
  );
}
