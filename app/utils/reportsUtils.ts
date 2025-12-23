import axios from "axios";
import { Reports } from "../types";

export async function insertIntoReports(reports: Reports) {
  const response = await axios.post("/api/auth/reports", {
    action: reports.action,
    user_id: reports.user_id,
    created_at: new Date(),
  });
  return response;
}
