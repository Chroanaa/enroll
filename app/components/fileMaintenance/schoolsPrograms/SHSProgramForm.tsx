"use client";
import React, { useState } from "react";
import { GraduationCap, X, CheckCircle2 } from "lucide-react";
import { colors } from "../../../colors";
import { SHSProgram } from "./index";

interface SHSProgramFormProps {
  program: SHSProgram | null;
  onSave: (program: SHSProgram) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const SHSProgramForm: React.FC<SHSProgramFormProps> = ({
  program,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    name: program?.name || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSave({
        ...program!,
        id: program?.id || 0,
        name: formData.name.trim().toUpperCase(),
        is_custom: program?.is_custom ?? true,
        created_at: program?.created_at || null,
        updated_at: program?.updated_at || null,
      } as SHSProgram);
    }
  };

  return (
    <div
      className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onCancel}
    >
      <div
        className='rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200'
        style={{ backgroundColor: "white" }}
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
              <GraduationCap
                className='w-5 h-5'
                style={{ color: colors.secondary }}
              />
            </div>
            <h2
              className='text-xl font-bold'
              style={{ color: colors.primary }}
            >
              {program ? "Edit SHS Program" : "Add SHS Program"}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className='p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
            disabled={isLoading}
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='p-6'>
          <form onSubmit={handleSubmit} className='space-y-5'>
            <div>
              <label
                className='flex items-center gap-2 text-sm font-semibold mb-2'
                style={{ color: colors.primary }}
              >
                <GraduationCap className='w-4 h-4 text-gray-400' />
                Program Name <span className='text-red-500'>*</span>
              </label>
              <input
                type='text'
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
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
                placeholder='Enter program name'
                required
                disabled={isLoading}
              />
            </div>

            <div
              className='flex justify-end gap-3 pt-6 mt-6 border-t'
              style={{ borderColor: `${colors.primary}10` }}
            >
              <button
                type='button'
                onClick={onCancel}
                className='px-6 py-2.5 rounded-xl transition-all font-medium flex items-center gap-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                style={{
                  color: colors.primary,
                  border: "1px solid #E5E7EB",
                }}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type='submit'
                className='px-6 py-2.5 text-white rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed'
                style={{ backgroundColor: isLoading ? "#9CA3AF" : colors.secondary }}
                disabled={isLoading}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = colors.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = colors.secondary;
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                    {program ? "Saving..." : "Adding..."}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className='w-4 h-4' />
                    {program ? "Save Changes" : "Add Program"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SHSProgramForm;

