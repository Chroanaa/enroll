import axios from "axios";
import { Section } from "../types";
export async function getSections(): Promise<Section[]> {
  try {
    const response = await axios.get("/api/auth/section");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching section data:", error);
    throw error;
  }
}
