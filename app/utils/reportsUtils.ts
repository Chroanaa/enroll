import axios from "axios";
import { Reports } from "../types";

export async function insertIntoReports(reports: Reports) {

  // updated to handle the server-side and client-side environment
  if (typeof window === "undefined") {

    const { prisma } = await import("../lib/prisma");
    const newReport = await prisma.reports.create({
      data: {
        action: reports.action,
        user_id: reports.user_id,
        created_at: reports.created_at || new Date(),
      },
    });
    return { data: newReport };
  } else {

    const response = await axios.post("/api/auth/reports", {
      action: reports.action,
      user_id: reports.user_id,
      created_at: reports.created_at || new Date(),
    });
    return response;
  }
}
