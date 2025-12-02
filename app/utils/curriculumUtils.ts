import axios from "axios";

export async function getCurriculums() {
  try {
    const response = await axios.get("/api/auth/curriculum");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching curriculum data:", error);
    throw error;
  }
}
