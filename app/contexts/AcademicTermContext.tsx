"use client";

import React, { createContext, useContext, useEffect, ReactNode } from "react";
import {
  useAcademicTerm,
  UseAcademicTermResult,
} from "../hooks/useAcademicTerm";

// Create context with default values
const AcademicTermContext = createContext<UseAcademicTermResult | null>(null);

interface AcademicTermProviderProps {
  children: ReactNode;
  /**
   * Automatically sync academic term settings on mount
   * @default true
   */
  autoSync?: boolean;
  /**
   * Auto-refresh interval in milliseconds
   * Set to 0 to disable auto-refresh
   * @default 300000 (5 minutes)
   */
  refreshInterval?: number;
}

/**
 * Provider component that fetches and provides academic term data
 * throughout the application.
 *
 * Uses database server time to prevent client-side tampering.
 *
 * @example
 * // In your root layout or providers.tsx
 * <AcademicTermProvider autoSync={true}>
 *   <App />
 * </AcademicTermProvider>
 *
 * @example
 * // In any child component
 * const { currentTerm } = useAcademicTermContext();
 * console.log(currentTerm?.formatted); // "First Semester, A.Y. 2025-2026"
 */
export function AcademicTermProvider({
  children,
  autoSync = true,
  refreshInterval = 5 * 60 * 1000, // 5 minutes
}: AcademicTermProviderProps) {
  const academicTerm = useAcademicTerm({
    autoSync,
    includeNext: true,
    includePrevious: true,
    refreshInterval,
  });

  // Log when term changes (useful for debugging)
  useEffect(() => {
    if (academicTerm.currentTerm) {
      console.log(
        `[AcademicTerm] Current: ${academicTerm.currentTerm.formatted}`,
        `| Server time: ${academicTerm.currentTerm.serverTime}`
      );
    }
  }, [academicTerm.currentTerm]);

  return (
    <AcademicTermContext.Provider value={academicTerm}>
      {children}
    </AcademicTermContext.Provider>
  );
}

/**
 * Hook to access academic term context.
 * Must be used within an AcademicTermProvider.
 *
 * @throws Error if used outside of AcademicTermProvider
 *
 * @example
 * function MyComponent() {
 *   const { currentTerm, loading, error, sync } = useAcademicTermContext();
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return (
 *     <div>
 *       <p>Current: {currentTerm?.formatted}</p>
 *       <button onClick={sync}>Sync</button>
 *     </div>
 *   );
 * }
 */
export function useAcademicTermContext(): UseAcademicTermResult {
  const context = useContext(AcademicTermContext);

  if (!context) {
    throw new Error(
      "useAcademicTermContext must be used within an AcademicTermProvider. " +
        "Make sure to wrap your component tree with <AcademicTermProvider>."
    );
  }

  return context;
}

export default AcademicTermProvider;
