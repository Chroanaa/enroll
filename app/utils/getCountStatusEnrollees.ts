import axios from "axios";

export async function getCountOfEnrolleesStatus() {
  try {
    const response = await axios.get("/api/auth/status");
    return response.data;
  } catch (error) {
    console.error("Error fetching count of enrollees by status:", error);
    return [];
  }
}
