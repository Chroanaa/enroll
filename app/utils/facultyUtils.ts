import axios from "axios";
import { Faculty } from "../types";
export async function getFaculties(): Promise<Faculty[]> {
  try {
    const response = await axios.get("/api/auth/faculty");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching faculty data:", error);
    throw error;
  }
}
