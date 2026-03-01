import axios from "axios";
import { Reports } from "../types";

export async function getReports(): Promise<Reports[]> {
  try {
    const response = await axios.get("/api/auth/reports");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching reports:", error);
    throw error;
  }
}
