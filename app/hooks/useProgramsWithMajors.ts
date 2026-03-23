import { useState, useEffect } from "react";

export interface ProgramWithMajor {
  value: string;
  label: string;
  programId: number;
  programCode: string;
  programName: string;
  majorId: number | null;
  majorName: string | null;
}

export function useProgramsWithMajors() {
  const [programs, setPrograms] = useState<ProgramWithMajor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/programs-with-majors");
        
        if (!response.ok) {
          throw new Error("Failed to fetch programs");
        }

        const result = await response.json();
        
        if (result.success) {
          setPrograms(result.data);
        } else {
          throw new Error(result.error || "Failed to fetch programs");
        }
      } catch (err) {
        console.error("Error fetching programs with majors:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  return { programs, loading, error };
}
