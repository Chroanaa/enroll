import axios from "axios";
import { Fee } from "../types";
export async function getFees(): Promise<Fee[]> {
  try {
    const response = await axios.get("/api/auth/fees");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching fees data:", error);
    throw error;
  }
}
