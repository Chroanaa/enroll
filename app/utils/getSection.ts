import axios from "axios";
import { Section } from "../types";
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "./cache";

export async function getSections(): Promise<Section[]> {
  return cacheManager.getOrFetch(
    CACHE_KEYS.SECTIONS,
    async () => {
      const response = await axios.get("/api/auth/section");
      return response.data || [];
    },
    CACHE_TTL.LONG,
  );
}
