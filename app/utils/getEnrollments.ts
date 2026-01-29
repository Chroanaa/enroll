import axios from "axios";
import { EnrollmentFormData } from "@/app/hooks/useEnrollmentForm";
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "./cache";

export async function getEnrollments(): Promise<EnrollmentFormData[]> {
  return cacheManager.getOrFetch(
    CACHE_KEYS.ENROLLMENTS,
    () =>
      axios
        .get("/api/auth/enroll")
        .then((response) => response.data.data || []),
    CACHE_TTL.MEDIUM,
  );
}
