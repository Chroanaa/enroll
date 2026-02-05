import { useState, useEffect, useRef, useCallback } from "react";
import { useAcademicTermContext } from "../../../contexts/AcademicTermContext";

export const useFinancialSummary = () => {
  const { currentTerm } = useAcademicTermContext();
  const hasInitializedTermDefaults = useRef(false);
  const [studentNumberSearch, setStudentNumberSearch] = useState("");
  const [academicYearSearch, setAcademicYearSearch] = useState("");
  const [semesterSearch, setSemesterSearch] = useState<1 | 2>(1);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [isLoadingFinancialSummary, setIsLoadingFinancialSummary] = useState(false);
  const [autoFetchEnabled, setAutoFetchEnabled] = useState(false);
  const errorCallbackRef = useRef<((message: string, details: string) => void) | null>(null);

  // Default search values based on the current academic term
  useEffect(() => {
    if (!currentTerm || hasInitializedTermDefaults.current) return;

    const semesterValue = currentTerm.semester === "First" ? 1 : 2;
    setAcademicYearSearch((prev) =>
      prev.trim() ? prev : currentTerm.academicYear,
    );
    setSemesterSearch(semesterValue);
    hasInitializedTermDefaults.current = true;
  }, [currentTerm]);

  // Auto-fetch financial summary when all required values are available
  useEffect(() => {
    // If student number is cleared, clear the financial summary
    if (!studentNumberSearch) {
      setFinancialSummary(null);
      return;
    }

    if (!autoFetchEnabled || !studentNumberSearch || !academicYearSearch || !semesterSearch) {
      return;
    }

    const fetchData = async () => {
      setIsLoadingFinancialSummary(true);
      setFinancialSummary(null);

      try {
        const response = await fetch(
          `/api/auth/assessment/financial-summary?student_number=${encodeURIComponent(studentNumberSearch)}&academic_year=${encodeURIComponent(academicYearSearch)}&semester=${semesterSearch}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || "Failed to fetch financial summary");
        }

        const data = await response.json();
        setFinancialSummary(data.data);
      } catch (error: any) {
        console.error("Error fetching financial summary:", error);
        if (errorCallbackRef.current) {
          errorCallbackRef.current("Failed to Load Financial Summary", error.message || "Please check the student number, academic year, and semester.");
        }
      } finally {
        setIsLoadingFinancialSummary(false);
      }
    };

    fetchData();
  }, [studentNumberSearch, academicYearSearch, semesterSearch, autoFetchEnabled]); // Removed errorCallback from dependencies

  const fetchFinancialSummary = async (onError: (message: string, details: string) => void) => {
    if (!studentNumberSearch || !academicYearSearch) {
      onError("Missing Information", "Please enter student number and academic year.");
      return;
    }

    setIsLoadingFinancialSummary(true);
    setFinancialSummary(null);

    try {
      const response = await fetch(
        `/api/auth/assessment/financial-summary?student_number=${encodeURIComponent(studentNumberSearch)}&academic_year=${encodeURIComponent(academicYearSearch)}&semester=${semesterSearch}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Failed to fetch financial summary");
      }

      const data = await response.json();
      setFinancialSummary(data.data);
    } catch (error: any) {
      console.error("Error fetching financial summary:", error);
      onError("Failed to Load Financial Summary", error.message || "Please check the student number, academic year, and semester.");
    } finally {
      setIsLoadingFinancialSummary(false);
    }
  };

  const enableAutoFetch = useCallback((onError: (message: string, details: string) => void) => {
    errorCallbackRef.current = onError;
    setAutoFetchEnabled(true);
  }, []);

  const disableAutoFetch = useCallback(() => {
    setAutoFetchEnabled(false);
    errorCallbackRef.current = null;
  }, []);

  return {
    studentNumberSearch,
    setStudentNumberSearch,
    academicYearSearch,
    setAcademicYearSearch,
    semesterSearch,
    setSemesterSearch,
    financialSummary,
    isLoadingFinancialSummary,
    fetchFinancialSummary,
    enableAutoFetch,
    disableAutoFetch,
  };
};

