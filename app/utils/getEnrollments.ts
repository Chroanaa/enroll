import axios from "axios";
import { EnrollmentFormData } from "@/app/hooks/useEnrollmentForm";
export async function getEnrollments(): Promise<EnrollmentFormData[]> {
  return axios
    .get("/api/auth/enroll")
    .then((response) => response.data.data || []);
}
