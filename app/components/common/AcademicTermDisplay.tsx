"use client";

import React from "react";
import { useAcademicTermContext } from "../../contexts/AcademicTermContext";

interface AcademicTermDisplayProps {
  /**
   * Show compact version (just semester and year)
   */
  compact?: boolean;
  /**
   * Show sync button
   */
  showSyncButton?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Component to display the current academic term.
 * Automatically updates based on database server time.
 *
 * @example
 * // Full display with sync button
 * <AcademicTermDisplay showSyncButton />
 *
 * @example
 * // Compact display (for navigation bar)
 * <AcademicTermDisplay compact className="text-sm" />
 */
export function AcademicTermDisplay({
  compact = false,
  showSyncButton = false,
  className = "",
}: AcademicTermDisplayProps) {
  const { currentTerm, loading, error, sync, storedSettings } =
    useAcademicTermContext();
  const [syncing, setSyncing] = React.useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await sync();
    setSyncing(false);
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className='h-4 bg-gray-200 rounded w-32'></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        Unable to load academic term
      </div>
    );
  }

  if (!currentTerm) {
    return null;
  }

  // Check if stored settings differ from calculated (may indicate need for sync)
  const needsSync =
    storedSettings &&
    (storedSettings.semester !== currentTerm.semester ||
      storedSettings.academicYear !== currentTerm.academicYear);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className='font-medium'>{currentTerm.semester} Sem</span>
        <span className='text-gray-400'>|</span>
        <span>A.Y. {currentTerm.academicYear}</span>
        {needsSync && (
          <span
            className='w-2 h-2 bg-yellow-400 rounded-full'
            title='Settings need sync'
          />
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-sm font-medium text-gray-500 uppercase tracking-wide'>
            Current Academic Term
          </h3>
          <p className='mt-1 text-lg font-semibold text-gray-900'>
            {currentTerm.formatted}
          </p>
          <p className='text-sm text-gray-500'>
            {currentTerm.isWithinSemester ? (
              <>
                Semester dates:{" "}
                {currentTerm.semesterStartDate.toLocaleDateString()} -{" "}
                {currentTerm.semesterEndDate.toLocaleDateString()}
              </>
            ) : (
              <span className='text-amber-600'>
                Currently in between semesters
              </span>
            )}
          </p>
        </div>

        {showSyncButton && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`
              px-3 py-1.5 text-sm rounded-md transition-colors
              ${
                needsSync
                  ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {syncing ? "Syncing..." : needsSync ? "Sync Now" : "Refresh"}
          </button>
        )}
      </div>

      {needsSync && (
        <div className='mt-3 p-2 bg-yellow-50 rounded text-sm text-yellow-700'>
          ⚠️ Stored settings differ from calculated term. Click "Sync Now" to
          update.
        </div>
      )}
    </div>
  );
}

export default AcademicTermDisplay;
