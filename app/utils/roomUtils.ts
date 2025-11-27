import axios from "axios";
import { Room } from "../types";
export async function getRooms(): Promise<Room[]> {
  try {
    const response = await axios.get("/api/auth/room");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching room data:", error);
    throw error;
  }
}
