"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  FolderTree,
  Hash,
  BookOpen,
  Users,
  CheckCircle2,
  X,
  Calendar,
  GraduationCap,
} from "lucide-react";
import { Section, Program } from "../../../types";
import { getPrograms } from "../../../utils/programUtils";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import { useAcademicTermContext } from "../../../contexts/AcademicTermContext";
import { useProgramsWithMajors } from "../../../hooks/useProgramsWithMajors";
import { generateSectionName, fetchExistingSectionsByPrefix, generateSectionPrefix } from "../../../utils/sectionNameGenerator";

interface SectionFormProps {
  section: Section | null;
  onSave: (section: Section & { programName?: string }) => void;
  onCancel: () => void;
}

const SectionForm: React.FC<SectionFormProps> = ({
  section,
  onSave,
  onCancel,
}) => {
  const { currentTerm } = useAcademicTermContext();

  const normalizeSemesterLabel = (semester?: string | null) => {
    if (!semester) return undefined;
    const normalized = semester.trim().toLowerCase();
    if (normalized === "1" || normalized === "first" || normalized === "first semester") return "first";
    if (normalized === "2" || normalized === "second" || normalized === "second semester") return "second";
    if (normalized === "3" || normalized === "summer") return "summer";
    return normalized;
  };
  
  const formatAcademicYearRange = (value?: number | string | null) => {
    if (!value && value !== 0) return undefined;
    if (typeof value === "number") return `${value}-${value + 1}`;
    if (value.includes("-")) return value;
    const startYear = parseInt(value, 10);
    return Number.isNaN(startYear) ? value : `${startYear}-${startYear + 1}`;
  };

  const initialFormData = useRef<Partial<Section>>(
    section
      ? {
          ...section,
          academic_year: formatAcademicYearRange(section.academic_year),
        }
      : {
      section_name: "",
      program_id: 1,
      advisor: "",
      student_count: 0,
      status: "draft",
      year_level: undefined,
      semester: undefined,
      academic_year: undefined,
      }
  );

  const [formData, setFormData] = useState<Partial<Section>>(
    initialFormData.current
  );
  const [programs, setPrograms] = useState<Program[]>([]);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [programMajorValue, setProgramMajorValue] = useState<string>("");

  const { programs: programsWithMajors, loading: programsLoading } = useProgramsWithMajors();

  const academicYearOptions = [2024, 2025, 2026, 2027, 2028].map((startYear) => ({
    value: startYear,
    label: `${startYear}-${startYear + 1}`
  }));

  // Set default semester and academic year from context when creating new section
  useEffect(() => {
    if (!section && currentTerm) {
      setFormData((prev) => ({
        ...prev,
        semester: prev.semester ?? normalizeSemesterLabel(currentTerm.semester),
        academic_year: prev.academic_year ?? formatAcademicYearRange(currentTerm.academicYear),
      }));
    }
  }, [currentTerm, section]);

  // Set initial program-major value when editing
  useEffect(() => {
    if (section && section.program_id && programsWithMajors.length > 0) {
      const matchingProgram = programsWithMajors.find(
        (p) => p.programId === section.program_id
      );
      if (matchingProgram) {
        setProgramMajorValue(matchingProgram.value);
      }
    }
  }, [section, programsWithMajors]);

  // Auto-generate section name when program-major or year level changes
  useEffect(() => {
    const generateName = async () => {
      if (programMajorValue && formData.year_level && !section) {
        const selected = programsWithMajors.find((p) => p.value === programMajorValue);
        
        if (!selected) return;

        const { programCode, majorName } = selected;

        // Generate prefix
        const prefix = generateSectionPrefix(programCode, majorName, formData.year_level);

        // Fetch existing sections with this prefix
        const existingSections = await fetchExistingSectionsByPrefix(prefix);

        // Generate the section name
        const sectionName = generateSectionName(
          programCode,
          majorName,
          formData.year_level,
          existingSections
        );

        setFormData((prev) => ({
          ...prev,
          section_name: sectionName,
        }));
      }
    };

    generateName();
  }, [programMajorValue, formData.year_level, programsWithMajors, section]);

  React.useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const data = await getPrograms();
        setPrograms(Array.isArray(data) ? data : Object.values(data));
      } catch (error) {
        console.error("Error fetching programs:", error);
        setPrograms([]);
      }
    };
    fetchPrograms();
  }, []);

  const handleProgramMajorChange = (value: string) => {
    setProgramMajorValue(value);
    
    // Extract programId from the selected value
    const selected = programsWithMajors.find((p) => p.value === value);
    if (selected) {
      setFormData({
        ...formData,
        program_id: selected.programId,
      });
    }
  };

  const hasChanges = () => {
    if (!section) return false;
    return (
      formData.section_name !== initialFormData.current.section_name ||
      formData.program_id !== initialFormData.current.program_id ||
      formData.student_count !== initialFormData.current.student_count ||
      formData.status !== initialFormData.current.status ||
      formData.year_level !== initialFormData.current.year_level ||
      formData.semester !== initialFormData.current.semester ||
      formData.academic_year !== initialFormData.current.academic_year
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      formData.section_name &&
      formData.program_id
    ) {
      if (section && hasChanges()) {
        setShowSaveConfirmation(true);
      } else {
        performSave();
      }
    }
  };

  const performSave = () => {
    if (
      formData.section_name &&
      formData.program_id
    ) {
      const programName =
        programs.find((p) => p.id === formData.program_id)?.name || "";
      const sectionData: Partial<Section> = {
        section_name: formData.section_name!,
        program_id: formData.program_id!,
        advisor: '', // Empty advisor field
        student_count: formData.student_count || 0,
        status: (formData.status as "draft" | "active" | "closed" | "inactive") || "draft",
        year_level: formData.year_level,
        semester: formData.semester,
        academic_year: formatAcademicYearRange(formData.academic_year),
      };

      onSave({
        ...sectionData,
        id: section?.id || Math.random(),
        programName: programName,
      } as Section & { programName?: string });
      setShowSaveConfirmation(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges()) {
      setShowCancelWarning(true);
    } else {
      onCancel();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelWarning(false);
    onCancel();
  };

  return (
    <div
      className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={handleCancel}
    >
      <div
        className='rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200'
        style={{
          backgroundColor: "white",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className='px-6 py-4 flex items-center justify-between border-b'
          style={{
            backgroundColor: `${colors.primary}08`,
            borderColor: `${colors.primary}15`,
          }}
        >
          <div className='flex items-center gap-3'>
            <div
              className='p-2 rounded-lg'
              style={{ backgroundColor: `${colors.secondary}20` }}
            >
              <FolderTree
                className='w-5 h-5'
                style={{ color: colors.secondary }}
              />
            </div>
            <div>
              <h2
                className='text-xl font-bold'
                style={{ color: colors.primary }}
              >
                {section ? "Edit Section" : "Add New Section"}
              </h2>
              <p className='text-sm text-gray-500'>
                {section
                  ? "Update section details"
                  : "Create a new section record"}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className='p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-6 overflow-y-auto custom-scrollbar'>
          <form onSubmit={handleSubmit} className='space-y-5'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <Hash className='w-4 h-4 text-gray-400' />
                  Section Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={formData.section_name || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section_name: e.target.value.toUpperCase(),
                    })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                    color: "#6B5B4F",
                    backgroundColor: !section ? '#F9FAFB' : 'white',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  placeholder={!section ? "Auto-generated (e.g., BSIT1 - 1)" : "e.g. A"}
                  readOnly={!section}
                  required
                />
                {!section && (
                  <p className="text-xs text-gray-500 mt-1">
                    Section name is auto-generated based on Program-Major and Year Level
                  </p>
                )}
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <BookOpen className='w-4 h-4 text-gray-400' />
                  Program - Major <span className='text-red-500'>*</span>
                </label>
                <select
                  value={programMajorValue}
                  onChange={(e) => handleProgramMajorChange(e.target.value)}
                  disabled={programsLoading}
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                    color: "#6B5B4F",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  required
                >
                  <option value=''>
                    {programsLoading ? 'Loading programs...' : 'Select program - major'}
                  </option>
                  {programsWithMajors.map((program) => (
                    <option key={program.value} value={program.value}>
                      {program.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <Users className='w-4 h-4 text-gray-400' />
                  Student Count
                </label>
                <input
                  type='number'
                  min='0'
                  value={formData.student_count || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      student_count: parseInt(e.target.value) || 0,
                    })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                    color: "#6B5B4F",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <CheckCircle2 className='w-4 h-4 text-gray-400' />
                  Status <span className='text-red-500'>*</span>
                </label>
                <select
                  value={formData.status?.toString() || "draft"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "draft" | "active" | "closed" | "inactive",
                    })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                    color: "#6B5B4F",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value='draft'>Draft</option>
                  <option value='active'>Active</option>
                  <option value='closed'>Closed</option>
                  <option value='inactive'>Inactive</option>
                </select>
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <GraduationCap className='w-4 h-4 text-gray-400' />
                  Year Level <span className='text-red-500'>*</span>
                </label>
                <select
                  value={formData.year_level?.toString() || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      year_level: parseInt(e.target.value) || undefined,
                    })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                    color: "#6B5B4F",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  required
                >
                  <option value=''>Select Year Level</option>
                  <option value='1'>1st Year</option>
                  <option value='2'>2nd Year</option>
                  <option value='3'>3rd Year</option>
                  <option value='4'>4th Year</option>
                  <option value='5'>5th Year</option>
                  <option value='6'>6th Year</option>
                </select>
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <BookOpen className='w-4 h-4 text-gray-400' />
                  Semester <span className='text-red-500'>*</span>
                </label>
                <select
                  value={formData.semester || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      semester: e.target.value || undefined,
                    })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                    color: "#6B5B4F",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  required
                >
                  <option value=''>Select Semester</option>
                  <option value='first'>First Semester</option>
                  <option value='second'>Second Semester</option>
                  <option value='summer'>Summer</option>
                </select>
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <Calendar className='w-4 h-4 text-gray-400' />
                  Academic Year <span className='text-red-500'>*</span>
                </label>
                <select
                  value={formData.academic_year?.toString() || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      academic_year: e.target.value || undefined,
                    })
                  }
                  className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white'
                  style={{
                    border: "1px solid #E5E7EB",
                    outline: "none",
                    color: "#6B5B4F",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E5E7EB";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  required
                >
                  <option value=''>Select Academic Year</option>
                  {academicYearOptions.map((year) => (
                    <option key={year.value} value={year.label}>
                      {year.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              className='flex justify-end gap-3 pt-6 mt-6 border-t'
              style={{ borderColor: `${colors.primary}10` }}
            >
              <button
                type='button'
                onClick={handleCancel}
                className='px-6 py-2.5 rounded-xl transition-all font-medium flex items-center gap-2 hover:bg-gray-100'
                style={{
                  color: colors.primary,
                  border: "1px solid #E5E7EB",
                }}
              >
                Cancel
              </button>
              <button
                type='submit'
                className='px-6 py-2.5 text-white rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20'
                style={{ backgroundColor: colors.secondary }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = colors.primary)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = colors.secondary)
                }
              >
                <CheckCircle2 className='w-4 h-4' />
                {section ? "Save Changes" : "Add Section"}
              </button>
            </div>
          </form>
        </div>

        {/* Save Confirmation Modal */}
        <ConfirmationModal
          isOpen={showSaveConfirmation}
          onClose={() => setShowSaveConfirmation(false)}
          onConfirm={performSave}
          title='Save Changes'
          message={`Are you sure you want to save changes to "${formData.section_name || section?.section_name}"?`}
          description='The section information will be updated with the new details.'
          confirmText='Save Changes'
          cancelText='Cancel'
          variant='info'
        />

        {/* Cancel Warning Modal */}
        <ConfirmationModal
          isOpen={showCancelWarning}
          onClose={() => setShowCancelWarning(false)}
          onConfirm={handleConfirmCancel}
          title='Unsaved Changes'
          message='You have unsaved changes. Are you sure you want to leave?'
          description='Your changes will be lost if you continue without saving.'
          confirmText='Leave Without Saving'
          cancelText='Stay and Edit'
          variant='warning'
        />
      </div>
    </div>
  );
};

export default SectionForm;


