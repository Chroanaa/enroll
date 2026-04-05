import { useState, useEffect, useCallback } from "react";
import { AcademicTerm } from "../utils/academicTermUtils";

export interface UseAcademicTermResult {
  currentTerm: (AcademicTerm & { formatted: string }) | null;
  nextTerm: (AcademicTerm & { formatted: string }) | null;
  previousTerm: (AcademicTerm & { formatted: string }) | null;
  storedSettings: {
    semester: string | null;
    academicYear: string | null;
  } | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  sync: () => Promise<boolean>;
}

interface AcademicTermResponse {
  success: boolean;
  data: {
    currentTerm: AcademicTerm & { formatted: string };
    nextTerm?: AcademicTerm & { formatted: string };
    previousTerm?: AcademicTerm & { formatted: string };
    synced?: boolean;
    storedSettings?: {
      semester: string | null;
      academicYear: string | null;
    };
  };
  error?: string;
}

/**
 * React hook to get the current academic term from the server.
 * Uses database server time to prevent tampering.
 *
 * @param options.autoSync - Automatically sync settings on mount (default: false)
 * @param options.includeNext - Include next semester info (default: false)
 * @param options.includePrevious - Include previous semester info (default: false)
 * @param options.refreshInterval - Auto-refresh interval in ms (default: 0 = disabled)
 *
 * @example
 * const { currentTerm, loading, error } = useAcademicTerm();
 *
 * @example
 * const { currentTerm, nextTerm, sync } = useAcademicTerm({
 *   includeNext: true,
 *   autoSync: true
 * });
 */
export function useAcademicTerm(options?: {
  autoSync?: boolean;
  includeNext?: boolean;
  includePrevious?: boolean;
  refreshInterval?: number;
}): UseAcademicTermResult {
  const {
    autoSync = false,
    includeNext = false,
    includePrevious = false,
    refreshInterval = 0,
  } = options || {};

  const [currentTerm, setCurrentTerm] = useState<
    (AcademicTerm & { formatted: string }) | null
  >(null);
  const [nextTerm, setNextTerm] = useState<
    (AcademicTerm & { formatted: string }) | null
  >(null);
  const [previousTerm, setPreviousTerm] = useState<
    (AcademicTerm & { formatted: string }) | null
  >(null);
  const [storedSettings, setStoredSettings] = useState<{
    semester: string | null;
    academicYear: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAcademicTermErrorMessage = (err: unknown) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return "Unable to load the academic term because your internet connection appears to be offline. The system will retry when the network is back.";
    }

    if (err instanceof Error && /network|fetch|load/i.test(err.message)) {
      return "Unable to load the academic term due to a network issue. Please check your connection and try again.";
    }

    return err instanceof Error
      ? err.message
      : "Failed to fetch academic term";
  };

  const fetchAcademicTerm = useCallback(
    async (shouldSync: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (shouldSync) params.append("sync", "true");
        if (includeNext) params.append("includeNext", "true");
        if (includePrevious) params.append("includePrevious", "true");

        const response = await fetch(
          `/api/auth/academic-term?${params.toString()}`
        );
        const data: AcademicTermResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to fetch academic term");
        }

        setCurrentTerm(data.data.currentTerm);
        setNextTerm(data.data.nextTerm || null);
        setPreviousTerm(data.data.previousTerm || null);
        setStoredSettings(data.data.storedSettings || null);
      } catch (err) {
        setError(getAcademicTermErrorMessage(err));
        console.error("Failed to fetch academic term:", err);
      } finally {
        setLoading(false);
      }
    },
    [includeNext, includePrevious]
  );

  const refresh = useCallback(async () => {
    await fetchAcademicTerm(false);
  }, [fetchAcademicTerm]);

  const sync = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/academic-term", {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh local state after sync
        await fetchAcademicTerm(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to sync academic term:", err);
      return false;
    }
  }, [fetchAcademicTerm]);

  // Initial fetch on mount
  useEffect(() => {
    fetchAcademicTerm(autoSync);
  }, [fetchAcademicTerm, autoSync]);

  useEffect(() => {
    const handleOnline = () => {
      void fetchAcademicTerm(false);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [fetchAcademicTerm]);

  // Set up auto-refresh interval if specified
  useEffect(() => {
    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchAcademicTerm(false);
      }, refreshInterval);

      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, fetchAcademicTerm]);

  return {
    currentTerm,
    nextTerm,
    previousTerm,
    storedSettings,
    loading,
    error,
    refresh,
    sync,
  };
}

export default useAcademicTerm;
