import axios from "axios";
import { Department } from "../types";
export async function getDepartments(): Promise<Department[]> {
  try {
    const response = await axios.get("/api/auth/department");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching department data:", error);
    throw error;
  }
}
