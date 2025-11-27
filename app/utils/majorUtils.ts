import axios from "axios";
import { Major } from "../types";
export async function getMajors(): Promise<Major[]> {
  try {
    const response = await axios.get("/api/auth/major");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching major data:", error);
    throw error;
  }
}
