import axios from "axios";
import { Room } from "../types";
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "./cache";

export async function getRooms(): Promise<Room[]> {
  return cacheManager.getOrFetch(
    CACHE_KEYS.ROOMS,
    async () => {
      const response = await axios.get("/api/auth/room");
      return response.data || [];
    },
    CACHE_TTL.LONG,
  );
}
