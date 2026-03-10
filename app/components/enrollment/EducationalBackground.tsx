import React, { useState, useMemo, useRef } from "react";
import { School, X, Loader2 } from "lucide-react";
import { colors } from "../../colors";
import { EnrollmentPageProps } from "./types";
import Axios from "axios";
import ConfirmationModal from "../common/ConfirmationModal";
import SuccessModal from "../common/SuccessModal";

const EducationalBackground: React.FC<EnrollmentPageProps> = ({
  formData,
  handleInputChange,
  fieldErrors = {},
}) => {
  const [shsPrograms, setShsPrograms] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [customProgram, setCustomProgram] = useState("");
  const [customSchool, setCustomSchool] = useState("");
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateWarningMessage, setDuplicateWarningMessage] = useState("");
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({ isOpen: false, message: "" });
  const [isSavingProgram, setIsSavingProgram] = useState(false);
  const [isSavingSchool, setIsSavingSchool] = useState(false);
  const isSubmittingProgramRef = useRef(false);
  const isSubmittingSchoolRef = useRef(false);

  // Load SHS programs and schools from database
  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingPrograms(true);
        setLoadingSchools(true);
        
        const [programsRes, schoolsRes] = await Promise.all([
          Axios.get("/api/auth/enroll/shs-programs"),
          Axios.get("/api/auth/enroll/schools"),
        ]);
        
        if (programsRes.data?.data) {
          setShsPrograms(programsRes.data.data.map((p: any) => p.name));
        }
        setLoadingPrograms(false);
        
        if (schoolsRes.data?.data) {
          setSchools(schoolsRes.data.data.map((s: any) => s.name));
        }
        setLoadingSchools(false);
      } catch (error) {
        console.error("Error loading programs/schools:", error);
        setLoadingPrograms(false);
        setLoadingSchools(false);
      }
    };
    loadData();
  }, []);

  const inputClasses =
    "w-full px-4 py-2.5 rounded-xl border bg-white/50 transition-all duration-300 focus:ring-2 focus:ring-offset-0 outline-none";
  
  const getInputStyle = (fieldName: string) => ({
    borderColor: fieldErrors[fieldName] ? "#ef4444" : colors.tertiary + "30",
    color: colors.primary,
  });
  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, fieldName: string) => {
    e.currentTarget.style.borderColor = fieldErrors[fieldName] ? "#ef4444" : colors.secondary;
    e.currentTarget.style.boxShadow = `0 0 0 4px ${fieldErrors[fieldName] ? "#ef444410" : colors.secondary + "10"}`;
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, fieldName: string) => {
    e.currentTarget.style.borderColor = fieldErrors[fieldName] ? "#ef4444" : colors.tertiary + "30";
    e.currentTarget.style.boxShadow = "none";
  };


  const handleSchoolChange = async (value: string) => {
    if (value === "OTHER") {
      setShowSchoolModal(true);
    } else {
      handleInputChange("last_school_attended", value);
      
      // Check for duplicate if program is already selected
      if (formData.program_shs) {
        const isDuplicate = await checkDuplicateSchoolProgram(value, formData.program_shs);
        if (isDuplicate) {
          setDuplicateWarningMessage("This school and program combination already exists.");
          setShowDuplicateWarning(true);
          // Reset the selection
          handleInputChange("last_school_attended", "");
          return;
        }
      }
    }
  };

  const handleProgramChange = async (value: string) => {
    if (value === "OTHER") {
      setShowProgramModal(true);
    } else {
      handleInputChange("program_shs", value);
      
      // Check for duplicate if school is already selected
      if (formData.last_school_attended) {
        const isDuplicate = await checkDuplicateSchoolProgram(formData.last_school_attended, value);
        if (isDuplicate) {
          setDuplicateWarningMessage("This school and program combination already exists.");
          setShowDuplicateWarning(true);
          // Reset the selection
          handleInputChange("program_shs", "");
          return;
        }
      }
    }
  };

  // Check for duplicate school + program combination
  // DISABLED: Multiple students can have the same school and program combination
  const checkDuplicateSchoolProgram = async (schoolName: string, programName: string): Promise<boolean> => {
    // Always return false - allow duplicate school + program combinations
    return false;
  };

  const saveCustomProgram = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent multiple simultaneous submissions
    if (isSubmittingProgramRef.current || isSavingProgram) {
      return;
    }
    
    if (!customProgram.trim()) return;
    
    const programName = customProgram.toUpperCase();
    const schoolName = formData.last_school_attended?.toUpperCase() || "";
    
    // Set loading state and prevent multiple submissions
    setIsSavingProgram(true);
    isSubmittingProgramRef.current = true;
    
    try {
      // Check for duplicate if school is already selected
      if (schoolName) {
        const isDuplicate = await checkDuplicateSchoolProgram(schoolName, programName);
        if (isDuplicate) {
          setDuplicateWarningMessage("This school and program combination already exists.");
          setShowDuplicateWarning(true);
          setIsSavingProgram(false);
          isSubmittingProgramRef.current = false;
          return;
        }
      }
      
      await Axios.post("/api/auth/enroll/shs-programs", { name: programName });
      // Success - show success modal, then insert and close
      setSuccessModal({
        isOpen: true,
        message: `Program "${programName}" has been successfully added.`,
      });
      setShsPrograms([...shsPrograms, programName]);
      handleInputChange("program_shs", programName);
      setCustomProgram("");
      setShowProgramModal(false);
    } catch (error: any) {
      // Handle 409 Conflict - program already exists
      if (error.response?.status === 409) {
        // Program already exists - add it to the list if not present, select it, and show info message
        if (!shsPrograms.includes(programName)) {
          setShsPrograms([...shsPrograms, programName]);
        }
        handleInputChange("program_shs", programName);
        setCustomProgram("");
        setShowProgramModal(false);
        setDuplicateWarningMessage("This program already exists in the system and has been selected.");
        setShowDuplicateWarning(true);
      } else {
        // Other errors - log and show error message
        console.error("Error saving custom program:", error);
        const errorMessage = error.response?.data?.error || error.message || "Failed to save custom program. Please try again.";
        setDuplicateWarningMessage(errorMessage);
        setShowDuplicateWarning(true);
      }
    } finally {
      setIsSavingProgram(false);
      isSubmittingProgramRef.current = false;
    }
  };

  const saveCustomSchool = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent multiple simultaneous submissions
    if (isSubmittingSchoolRef.current || isSavingSchool) {
      return;
    }
    
    if (!customSchool.trim()) return;
    
    const schoolName = customSchool.toUpperCase();
    const programName = formData.program_shs?.toUpperCase() || "";
    
    // Set loading state and prevent multiple submissions
    setIsSavingSchool(true);
    isSubmittingSchoolRef.current = true;
    
    try {
      // Check for duplicate if program is already selected
      if (programName) {
        const isDuplicate = await checkDuplicateSchoolProgram(schoolName, programName);
        if (isDuplicate) {
          setDuplicateWarningMessage("This school and program combination already exists.");
          setShowDuplicateWarning(true);
          setIsSavingSchool(false);
          isSubmittingSchoolRef.current = false;
          return;
        }
      }
      
      await Axios.post("/api/auth/enroll/schools", { name: schoolName });
      // Success - show success modal, then insert and close
      setSuccessModal({
        isOpen: true,
        message: `School "${schoolName}" has been successfully added.`,
      });
      setSchools([...schools, schoolName]);
      handleInputChange("last_school_attended", schoolName);
      setCustomSchool("");
      setShowSchoolModal(false);
    } catch (error: any) {
      // Handle 409 Conflict - school already exists
      if (error.response?.status === 409) {
        // School already exists - add it to the list if not present, select it, and show info message
        if (!schools.includes(schoolName)) {
          setSchools([...schools, schoolName]);
        }
        handleInputChange("last_school_attended", schoolName);
        setCustomSchool("");
        setShowSchoolModal(false);
        setDuplicateWarningMessage("This school already exists in the system and has been selected.");
        setShowDuplicateWarning(true);
      } else {
        // Other errors - log and show error message
        console.error("Error saving custom school:", error);
        const errorMessage = error.response?.data?.error || error.message || "Failed to save custom school. Please try again.";
        setDuplicateWarningMessage(errorMessage);
        setShowDuplicateWarning(true);
      }
    } finally {
      setIsSavingSchool(false);
      isSubmittingSchoolRef.current = false;
    }
  };

  const defaultShsPrograms = [
    "STEM – Science, Technology, Engineering, and Mathematics",
    "ABM – Accountancy, Business, and Management",
    "HUMSS – Humanities and Social Sciences",
    "GAS – General Academic Strand",
    "TVL – ICT (Information and Communications Technology)",
    "TVL – HE (Home Economics)",
    "TVL – IA (Industrial Arts)",
    "TVL – AFA (Agri-Fishery Arts)",
  ];

  const shsProgramOptions = useMemo(() => {
    const customPrograms = shsPrograms.filter(p => !defaultShsPrograms.includes(p));
    return [...defaultShsPrograms, ...customPrograms, "OTHER"];
  }, [shsPrograms]);

  const remarksOptions = [
    "NONE",
    "GRADUATED WITH HIGHEST HONORS",
    "GRADUATED WITH HIGH HONORS",
    "GRADUATED WITH HONORS",
  ];

  return (
    <div className='space-y-4 animate-in slide-in-from-bottom-4 duration-500 delay-200'>
      <div
        className='p-6 rounded-2xl bg-white border shadow-lg shadow-gray-100/50'
        style={{
          borderColor: colors.accent + "20",
          background: `linear-gradient(to bottom right, #ffffff, ${colors.paper})`,
        }}
      >
        <div className='flex items-center gap-4 mb-6 pb-4 border-b' style={{ borderColor: colors.accent + "10" }}>
          <div
            className='p-3 rounded-2xl shadow-sm transform transition-transform hover:scale-105 duration-300'
            style={{
              backgroundColor: "white",
              border: `1px solid ${colors.accent}20`
            }}
          >
            <School className='w-6 h-6' style={{ color: colors.secondary }} />
          </div>
          <div>
            <h2 className='text-2xl font-bold tracking-tight' style={{ color: colors.primary }}>
              Educational Background
            </h2>
            <p className='text-sm mt-1 font-medium' style={{ color: colors.tertiary }}>
              Previous educational information
            </p>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
          <div className="group">
            <label
              className='block text-sm font-semibold mb-2 ml-1 transition-colors'
              style={{ color: colors.primary }}
            >
              Last School Attended
            </label>
            <div className="relative">
              <select
                name="last_school_attended"
                data-field="last_school_attended"
                value={formData.last_school_attended}
                onChange={(e) => handleSchoolChange(e.target.value)}
                disabled={loadingSchools}
                className={`${inputClasses} appearance-none cursor-pointer ${fieldErrors.last_school_attended ? "border-red-500" : ""} ${loadingSchools ? "opacity-60" : ""}`}
                style={getInputStyle("last_school_attended")}
                onFocus={(e) => handleFocus(e, "last_school_attended")}
                onBlur={(e) => handleBlur(e, "last_school_attended")}
              >
                <option value=''>{loadingSchools ? "Loading schools..." : "Select School"}</option>
                {!loadingSchools && schools.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
                {!loadingSchools && <option value="OTHER">OTHER</option>}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                {loadingSchools ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: colors.secondary }} />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            {fieldErrors.last_school_attended && (
              <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.last_school_attended}</p>
            )}
          </div>
          <div className="group">
            <label
              className='block text-sm font-semibold mb-2 ml-1 transition-colors'
              style={{ color: colors.primary }}
            >
              Previous School Year (SHS)
            </label>
            <div className="relative">
              <select
                name="previous_school_year"
                data-field="previous_school_year"
                value={formData.previous_school_year || ""}
                onChange={(e) => handleInputChange("previous_school_year", e.target.value)}
                className={`${inputClasses} appearance-none cursor-pointer ${fieldErrors.previous_school_year ? "border-red-500" : ""}`}
                style={getInputStyle("previous_school_year")}
                onFocus={(e) => handleFocus(e as any, "previous_school_year")}
                onBlur={(e) => handleBlur(e as any, "previous_school_year")}
              >
                <option value=''>Select Previous School Year</option>
                {Array.from({ length: 10 }, (_, i) => {
                  const currentYear = new Date().getFullYear();
                  const startYear = currentYear - i - 1; // Start from previous year and go back
                  const endYear = startYear + 1;
                  const yearValue = `${startYear}-${endYear}`;
                  return (
                    <option key={yearValue} value={yearValue}>
                      {yearValue}
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            {fieldErrors.previous_school_year && (
              <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.previous_school_year}</p>
            )}
          </div>
          <div className="group">
            <label
              className='block text-sm font-semibold mb-2 ml-1 transition-colors'
              style={{ color: colors.primary }}
            >
              Program (SHS)
            </label>
            <div className="relative">
              <select
                name="program_shs"
                data-field="program_shs"
                value={formData.program_shs}
                onChange={(e) => handleProgramChange(e.target.value)}
                disabled={loadingPrograms}
                className={`${inputClasses} appearance-none cursor-pointer ${fieldErrors.program_shs ? "border-red-500" : ""} ${loadingPrograms ? "opacity-60" : ""}`}
                style={getInputStyle("program_shs")}
                onFocus={(e) => handleFocus(e, "program_shs")}
                onBlur={(e) => handleBlur(e, "program_shs")}
              >
                <option value=''>{loadingPrograms ? "Loading programs..." : "Select Program"}</option>
                {!loadingPrograms && shsProgramOptions.map((program) => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                {loadingPrograms ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: colors.secondary }} />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            {fieldErrors.program_shs && (
              <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.program_shs}</p>
            )}
          </div>
        </div>

        <div className="group">
          <label
            className='block text-sm font-semibold mb-2 ml-1 transition-colors'
            style={{ color: colors.primary }}
          >
            Remarks
          </label>
          <div className="relative">
            <select
              name="remarks"
              data-field="remarks"
              value={formData.remarks}
              onChange={(e) => handleInputChange("remarks", e.target.value)}
              className={`${inputClasses} appearance-none cursor-pointer ${fieldErrors.remarks ? "border-red-500" : ""}`}
              style={getInputStyle("remarks")}
              onFocus={(e) => handleFocus(e, "remarks")}
              onBlur={(e) => handleBlur(e, "remarks")}
            >
              <option value=''>Select Remarks</option>
              {remarksOptions.map((remark) => (
                <option key={remark} value={remark}>
                  {remark}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          {fieldErrors.remarks && (
            <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.remarks}</p>
          )}
        </div>

        {/* Custom Program Modal */}
        {showProgramModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold" style={{ color: colors.primary }}>Add Custom Program</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowProgramModal(false);
                    setCustomProgram("");
                    setIsSavingProgram(false);
                    isSubmittingProgramRef.current = false;
                  }}
                  disabled={isSavingProgram}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>
                    Program Name
                  </label>
                  <input
                    type="text"
                    value={customProgram}
                    onChange={(e) => setCustomProgram(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customProgram.trim() && !isSavingProgram) saveCustomProgram();
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setShowProgramModal(false);
                        setCustomProgram("");
                      }
                    }}
                    className={inputClasses}
                    style={getInputStyle("program_shs")}
                    placeholder="Enter program name"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowProgramModal(false);
                      setCustomProgram("");
                      setIsSavingProgram(false);
                      isSubmittingProgramRef.current = false;
                    }}
                    disabled={isSavingProgram}
                    className="px-4 py-2 rounded-xl border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderColor: colors.tertiary + "30" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveCustomProgram}
                    disabled={isSavingProgram || !customProgram.trim()}
                    className="px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{ backgroundColor: isSavingProgram ? colors.tertiary : colors.secondary }}
                  >
                    {isSavingProgram && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {isSavingProgram ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom School Modal */}
        {showSchoolModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold" style={{ color: colors.primary }}>Add Custom School</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowSchoolModal(false);
                    setCustomSchool("");
                    setIsSavingSchool(false);
                    isSubmittingSchoolRef.current = false;
                  }}
                  disabled={isSavingSchool}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: colors.primary }}>
                    School Name
                  </label>
                  <input
                    type="text"
                    value={customSchool}
                    onChange={(e) => setCustomSchool(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customSchool.trim() && !isSavingSchool) saveCustomSchool();
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setShowSchoolModal(false);
                        setCustomSchool("");
                      }
                    }}
                    className={inputClasses}
                    style={getInputStyle("last_school_attended")}
                    placeholder="Enter school name"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowSchoolModal(false);
                      setCustomSchool("");
                      setIsSavingSchool(false);
                      isSubmittingSchoolRef.current = false;
                    }}
                    disabled={isSavingSchool}
                    className="px-4 py-2 rounded-xl border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderColor: colors.tertiary + "30" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveCustomSchool}
                    disabled={isSavingSchool || !customSchool.trim()}
                    className="px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{ backgroundColor: isSavingSchool ? colors.tertiary : colors.secondary }}
                  >
                    {isSavingSchool && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {isSavingSchool ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Warning Modal */}
        <ConfirmationModal
          isOpen={showDuplicateWarning}
          onClose={() => {
            setShowDuplicateWarning(false);
            setDuplicateWarningMessage("");
          }}
          onConfirm={() => {
            setShowDuplicateWarning(false);
            setDuplicateWarningMessage("");
          }}
          title="Duplicate Entry"
          message={duplicateWarningMessage || "This entry already exists."}
          confirmText="OK"
          variant="warning"
        />

        {/* Success Modal */}
        <SuccessModal
          isOpen={successModal.isOpen}
          onClose={() => setSuccessModal({ isOpen: false, message: "" })}
          message={successModal.message}
        />
      </div>
    </div>
  );
};

export default EducationalBackground;
