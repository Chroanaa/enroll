import axios from "axios";
import { Department } from "../types";
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "./cache";

export async function getDepartments(): Promise<Department[]> {
  return cacheManager.getOrFetch(
    CACHE_KEYS.DEPARTMENTS,
    async () => {
      const response = await axios.get("/api/auth/department");
      return response.data || [];
    },
    CACHE_TTL.LONG,
  );
}
