import axios from "axios";
import { Subject } from "../types";
export async function getSubjects(): Promise<Subject[]> {
  try {
    const response = await axios.get("/api/auth/subject");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching subject data:", error);
    throw error;
  }
}
