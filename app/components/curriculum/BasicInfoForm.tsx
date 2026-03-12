"use client";

import React, { useState, useEffect, useMemo } from "react";
import { BookOpen, FileText, Hash, CheckCircle2 } from "lucide-react";
import { Curriculum, Program, Major } from "../../types";
import { colors } from "../../colors";
import { getPrograms } from "../../utils/programUtils";
import { getMajors } from "../../utils/majorUtils";

interface BasicInfoFormProps {
  formData: Partial<Curriculum>;
  selectedProgramId: number | undefined;
  selectedMajorId: number | undefined;
  effectiveYear: number;
  currentYear: number;
  onProgramChange: (programId: number) => void;
  onMajorChange: (majorId: number) => void;
  onEffectiveYearChange: (year: number) => void;
  onStatusChange: (status: "active" | "inactive") => void;
  onFormDataChange: (data: Partial<Curriculum>) => void;
  onMajorReset: () => void;
}

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({
  formData,
  selectedProgramId,
  selectedMajorId,
  effectiveYear,
  currentYear,
  onProgramChange,
  onMajorChange,
  onEffectiveYearChange,
  onStatusChange,
  onFormDataChange,
  onMajorReset,
}) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [programsData, majorsData] = await Promise.all([
          getPrograms(),
          getMajors(),
        ]);
        const programsArray: Program[] = Array.isArray(programsData)
          ? programsData
          : (Object.values(programsData) as Program[]);
        const majorsArray: Major[] = Array.isArray(majorsData)
          ? majorsData
          : (Object.values(majorsData) as Major[]);
        // Filter only active programs and majors
        const activePrograms = programsArray.filter((p) => p.status === "active");
        const activeMajors = majorsArray.filter((m) => m.status === "active");
        setPrograms(activePrograms);
        setMajors(activeMajors);

        // Initialize selected IDs when editing (if not already set and formData has values)
        if (!selectedProgramId && formData.program_name) {
          const matchingProgram = activePrograms.find(
            (p) => p.name === formData.program_name || p.code === formData.program_code
          );
          if (matchingProgram) {
            onProgramChange(matchingProgram.id);
          }
        }
      } catch (error) {
        console.error("Error fetching programs and majors:", error);
        setPrograms([]);
        setMajors([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize major when program is selected and formData has major
  useEffect(() => {
    if (selectedProgramId && !selectedMajorId && formData.major && majors.length > 0) {
      const matchingMajor = majors.find(
        (m) => m.name === formData.major && m.program_id === selectedProgramId
      );
      if (matchingMajor) {
        onMajorChange(matchingMajor.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgramId, majors, formData.major]);

  // Filter majors based on selected program
  const filteredMajors = useMemo(() => {
    if (!selectedProgramId) return [];
    return majors.filter((major) => major.program_id === selectedProgramId);
  }, [majors, selectedProgramId]);

  const handleFocus = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    e.currentTarget.style.borderColor = colors.secondary;
    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    e.currentTarget.style.borderColor = "#E5E7EB";
    e.currentTarget.style.boxShadow = "none";
  };

  const handleProgramChange = (programId: number) => {
    const selectedProgram = programs.find((p) => p.id === programId);
    if (selectedProgram) {
      onFormDataChange({
        ...formData,
        program_name: selectedProgram.name,
        program_code: selectedProgram.code,
      });
      onProgramChange(programId);
      // Reset major when program changes
      onMajorReset();
    }
  };

  const handleMajorChange = (majorId: number) => {
    const selectedMajor = filteredMajors.find((m) => m.id === majorId);
    if (selectedMajor) {
      onFormDataChange({
        ...formData,
        major: selectedMajor.name,
      });
      onMajorChange(majorId);
    }
  };

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
      {/* Program Select */}
      <div>
        <label
          className='flex items-center gap-2 text-sm font-semibold mb-2'
          style={{ color: colors.primary }}
        >
          <BookOpen className='w-4 h-4 text-gray-400' />
          Program <span className='text-red-500'>*</span>
        </label>
        <select
          value={selectedProgramId || ""}
          onChange={(e) => {
            const programId = e.target.value ? parseInt(e.target.value) : 0;
            if (programId > 0) {
              handleProgramChange(programId);
            }
          }}
          className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white'
          style={{
            border: "1px solid #E5E7EB",
            outline: "none",
            color: "#6B5B4F",
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={loading}
          required
        >
          <option value=''>{loading ? "Loading programs..." : "Select Program"}</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name} ({program.code})
            </option>
          ))}
        </select>
      </div>

      {/* Major Select */}
      <div>
        <label
          className='flex items-center gap-2 text-sm font-semibold mb-2'
          style={{ color: colors.primary }}
        >
          <FileText className='w-4 h-4 text-gray-400' />
          Major
        </label>
        <select
          value={selectedMajorId || ""}
          onChange={(e) => {
            const majorId = e.target.value ? parseInt(e.target.value) : 0;
            if (majorId > 0) {
              handleMajorChange(majorId);
            } else {
              onMajorReset();
            }
          }}
          className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white'
          style={{
            border: "1px solid #E5E7EB",
            outline: "none",
            color: "#6B5B4F",
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={loading || !selectedProgramId}
        >
          <option value=''>
            {!selectedProgramId
              ? "Select a program first"
              : filteredMajors.length === 0
              ? "No majors available"
              : "Select Major (Optional)"}
          </option>
          {filteredMajors.map((major) => (
            <option key={major.id} value={major.id}>
              {major.name} ({major.code})
            </option>
          ))}
        </select>
      </div>

      {/* Effective Year */}
      <div>
        <label
          className='flex items-center gap-2 text-sm font-semibold mb-2'
          style={{ color: colors.primary }}
        >
          <Hash className='w-4 h-4 text-gray-400' />
          Effective Year <span className='text-red-500'>*</span>
        </label>
        <input
          type='number'
          min='2000'
          max='2100'
          value={effectiveYear}
          onChange={(e) => {
            const year = parseInt(e.target.value) || currentYear;
            onEffectiveYearChange(year);
          }}
          className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
          style={{
            border: "1px solid #E5E7EB",
            outline: "none",
            color: "#6B5B4F",
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required
        />
      </div>

      {/* Status */}
      <div>
        <label
          className='flex items-center gap-2 text-sm font-semibold mb-2'
          style={{ color: colors.primary }}
        >
          <CheckCircle2 className='w-4 h-4 text-gray-400' />
          Status <span className='text-red-500'>*</span>
        </label>
        <select
          value={formData.status || "active"}
          onChange={(e) =>
            onStatusChange(e.target.value as "active" | "inactive")
          }
          className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white'
          style={{
            border: "1px solid #E5E7EB",
            outline: "none",
            color: "#6B5B4F",
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required
        >
          <option value='active'>Active</option>
          <option value='inactive'>Inactive</option>
        </select>
      </div>

      {/* Tuition Fee Per Unit */}
      <div>
        <label
          className='flex items-center gap-2 text-sm font-semibold mb-2'
          style={{ color: colors.primary }}
        >
          <Hash className='w-4 h-4 text-gray-400' />
          Tuition Fee Per Unit (₱)
        </label>
        <input
          type='number'
          min='0'
          step='0.01'
          value={formData.tuition_fee_per_unit ?? 570}
          onChange={(e) => {
            const fee = parseFloat(e.target.value) || 0;
            onFormDataChange({ ...formData, tuition_fee_per_unit: fee });
          }}
          className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
          style={{
            border: "1px solid #E5E7EB",
            outline: "none",
            color: "#6B5B4F",
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder='e.g. 570.00'
        />
      </div>
    </div>
  );
};

export default BasicInfoForm;
