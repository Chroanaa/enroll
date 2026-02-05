import { useState, useRef, useEffect, useCallback } from "react";
import { EnrolledStudent, getEnrolledStudent, searchEnrolledStudents } from "../../../utils/billingUtils";

export const useStudentSearch = () => {
  const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);
  const [studentNumberInput, setStudentNumberInput] = useState("");
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentSearchError, setStudentSearchError] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState<EnrolledStudent[]>([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const studentSearchRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const onStudentSelectCallbackRef = useRef<((student: EnrolledStudent) => void) | null>(null);

  // Debounced student search for autocomplete
  const handleStudentInputChange = useCallback((value: string) => {
    setStudentNumberInput(value);
    setStudentSearchError("");

    // Clear previous timeout
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!value.trim()) {
      setStudentSearchResults([]);
      setShowStudentDropdown(false);
      return;
    }

    // Debounce the search
    searchDebounceRef.current = setTimeout(async () => {
      setStudentSearchLoading(true);
      try {
        const results = await searchEnrolledStudents(value);
        setStudentSearchResults(results);
        setShowStudentDropdown(results.length > 0);
      } catch (error) {
        console.error("Error searching students:", error);
        setStudentSearchResults([]);
      } finally {
        setStudentSearchLoading(false);
      }
    }, 300);
  }, []);

  // Handle student selection from dropdown
  const handleStudentSelect = (student: EnrolledStudent) => {
    setSelectedStudent(student);
    setStudentNumberInput("");
    setStudentSearchResults([]);
    setShowStudentDropdown(false);
    setStudentSearchError("");
    
    // Call the callback if provided (for automatic financial summary fetch)
    if (onStudentSelectCallbackRef.current) {
      onStudentSelectCallbackRef.current(student);
    }
  };

  // Search enrolled student by student number (fallback for Enter key)
  const handleStudentSearch = async () => {
    if (!studentNumberInput.trim()) {
      setStudentSearchError("Please enter a student number or name");
      return;
    }

    setStudentSearchLoading(true);
    setStudentSearchError("");
    setShowStudentDropdown(false);

    try {
      // First try exact match
      const student = await getEnrolledStudent(studentNumberInput.trim());
      if (student) {
        setSelectedStudent(student);
        setStudentNumberInput("");
        setStudentSearchResults([]);
        setStudentSearchError("");
        
        // Call the callback if provided (for automatic financial summary fetch)
        if (onStudentSelectCallbackRef.current) {
          onStudentSelectCallbackRef.current(student);
        }
      } else {
        // If no exact match, search and show dropdown
        const results = await searchEnrolledStudents(studentNumberInput.trim());
        if (results.length === 1) {
          // If only one result, auto-select it
          const selectedStudent = results[0];
          setSelectedStudent(selectedStudent);
          setStudentNumberInput("");
          setStudentSearchResults([]);
          
          // Call the callback if provided (for automatic financial summary fetch)
          if (onStudentSelectCallbackRef.current) {
            onStudentSelectCallbackRef.current(selectedStudent);
          }
        } else if (results.length > 1) {
          setStudentSearchResults(results);
          setShowStudentDropdown(true);
        } else {
          setStudentSearchError("No students found");
        }
      }
    } catch (error) {
      setStudentSearchError("Error searching for student");
      console.error(error);
    } finally {
      setStudentSearchLoading(false);
    }
  };

  const clearSelectedStudent = () => {
    setSelectedStudent(null);
    setStudentNumberInput("");
    setStudentSearchError("");
    setStudentSearchResults([]);
    setShowStudentDropdown(false);
  };

  const setOnStudentSelectCallback = useCallback((callback: ((student: EnrolledStudent) => void) | null) => {
    onStudentSelectCallbackRef.current = callback;
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        studentSearchRef.current &&
        !studentSearchRef.current.contains(event.target as Node)
      ) {
        setShowStudentDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  return {
    selectedStudent,
    studentNumberInput,
    studentSearchLoading,
    studentSearchError,
    studentSearchResults,
    showStudentDropdown,
    setShowStudentDropdown,
    studentSearchRef,
    handleStudentInputChange,
    handleStudentSearch,
    handleStudentSelect,
    clearSelectedStudent,
    setOnStudentSelectCallback,
  };
};

