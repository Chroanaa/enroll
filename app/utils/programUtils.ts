import axios from "axios";
import { Program } from "../types";
export async function getPrograms(): Promise<Program[]> {
  try {
    const response = await axios.get("/api/auth/program");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching program data:", error);
    throw error;
  }
}
