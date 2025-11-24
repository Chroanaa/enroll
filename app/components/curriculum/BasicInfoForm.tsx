"use client";

import React from "react";
import { BookOpen, FileText, Hash, CheckCircle2 } from "lucide-react";
import { Curriculum } from "../../types";
import { mockPrograms, mockMajors } from "../../data/mockData";
import { colors } from "../../colors";

interface BasicInfoFormProps {
  formData: Partial<Curriculum>;
  selectedProgramId: number | undefined;
  selectedMajorId: number | undefined;
  startYear: number;
  endYear: number;
  currentYear: number;
  onProgramChange: (programId: number | undefined) => void;
  onMajorChange: (majorId: number | undefined) => void;
  onStartYearChange: (year: number) => void;
  onEndYearChange: (year: number) => void;
  onStatusChange: (status: "active" | "inactive") => void;
  onFormDataChange: (data: Partial<Curriculum>) => void;
  onMajorReset: () => void;
}

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({
  formData,
  selectedProgramId,
  selectedMajorId,
  startYear,
  endYear,
  currentYear,
  onProgramChange,
  onMajorChange,
  onStartYearChange,
  onEndYearChange,
  onStatusChange,
  onFormDataChange,
  onMajorReset,
}) => {
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = colors.secondary;
    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "#E5E7EB";
    e.currentTarget.style.boxShadow = "none";
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
            const programId = e.target.value ? parseInt(e.target.value) : undefined;
            onProgramChange(programId);
            if (programId) {
              const selectedProgram = mockPrograms.find((p) => p.id === programId);
              if (selectedProgram) {
                onFormDataChange({
                  ...formData,
                  program_name: selectedProgram.name,
                  program_code: selectedProgram.code,
                });
              }
            } else {
              onFormDataChange({
                ...formData,
                program_name: "",
                program_code: "",
              });
            }
            onMajorReset();
          }}
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
          <option value=''>Select Program</option>
          {mockPrograms
            .filter((program) => program.status === "active")
            .map((program) => (
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
            const majorId = e.target.value ? parseInt(e.target.value) : undefined;
            onMajorChange(majorId);
            if (majorId) {
              const selectedMajor = mockMajors.find((m) => m.id === majorId);
              if (selectedMajor) {
                onFormDataChange({ ...formData, major: selectedMajor.name });
              }
            } else {
              onFormDataChange({ ...formData, major: "" });
            }
          }}
          className='w-full rounded-xl px-4 py-2.5 transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white'
          style={{
            border: "1px solid #E5E7EB",
            outline: "none",
            color: !selectedProgramId ? "#9CA3AF" : "#6B5B4F",
            backgroundColor: !selectedProgramId ? "#F9FAFB" : "white",
            cursor: !selectedProgramId ? "not-allowed" : "pointer",
          }}
          onFocus={(e) => {
            if (selectedProgramId) handleFocus(e);
          }}
          onBlur={handleBlur}
          disabled={!selectedProgramId}
        >
          <option value=''>Select Major (Optional)</option>
          {selectedProgramId
            ? mockMajors
                .filter(
                  (major) =>
                    major.program_id === selectedProgramId &&
                    major.status === "active"
                )
                .map((major) => (
                  <option key={major.id} value={major.id}>
                    {major.name} ({major.code})
                  </option>
                ))
            : null}
        </select>
      </div>

      {/* Start Year */}
      <div>
        <label
          className='flex items-center gap-2 text-sm font-semibold mb-2'
          style={{ color: colors.primary }}
        >
          <Hash className='w-4 h-4 text-gray-400' />
          Start Effective Year <span className='text-red-500'>*</span>
        </label>
        <input
          type='number'
          min='2000'
          max='2100'
          value={startYear}
          onChange={(e) => {
            const year = parseInt(e.target.value) || currentYear;
            onStartYearChange(year);
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

      {/* End Year */}
      <div>
        <label
          className='flex items-center gap-2 text-sm font-semibold mb-2'
          style={{ color: colors.primary }}
        >
          <Hash className='w-4 h-4 text-gray-400' />
          End Effective Year <span className='text-red-500'>*</span>
        </label>
        <input
          type='number'
          min='2000'
          max='2100'
          value={endYear}
          onChange={(e) => {
            const year = parseInt(e.target.value) || currentYear + 1;
            onEndYearChange(year);
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
          onChange={(e) => onStatusChange(e.target.value as "active" | "inactive")}
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
    </div>
  );
};

export default BasicInfoForm;

