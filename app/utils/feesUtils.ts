import axios from "axios";
import { Fee } from "../types";
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "./cache";

export async function getFees(): Promise<Fee[]> {
  return cacheManager.getOrFetch(
    CACHE_KEYS.FEES,
    async () => {
      const response = await axios.get("/api/auth/fees");
      return response.data || [];
    },
    CACHE_TTL.LONG,
  );
}
