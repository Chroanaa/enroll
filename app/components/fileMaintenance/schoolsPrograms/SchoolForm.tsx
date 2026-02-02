"use client";
import React, { useState, useRef } from "react";
import { School, X, CheckCircle2 } from "lucide-react";
import { colors } from "../../../colors";
import { School as SchoolType } from "./index";

interface SchoolFormProps {
  school: SchoolType | null;
  onSave: (school: SchoolType) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const SchoolForm: React.FC<SchoolFormProps> = ({
  school,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    name: school?.name || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSave({
        ...school!,
        id: school?.id || 0,
        name: formData.name.trim().toUpperCase(),
        is_custom: school?.is_custom ?? true,
        created_at: school?.created_at || null,
        updated_at: school?.updated_at || null,
      } as SchoolType);
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
              <School
                className='w-5 h-5'
                style={{ color: colors.secondary }}
              />
            </div>
            <h2
              className='text-xl font-bold'
              style={{ color: colors.primary }}
            >
              {school ? "Edit School" : "Add School"}
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
                <School className='w-4 h-4 text-gray-400' />
                School Name <span className='text-red-500'>*</span>
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
                placeholder='Enter school name'
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
                    {school ? "Saving..." : "Adding..."}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className='w-4 h-4' />
                    {school ? "Save Changes" : "Add School"}
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

export default SchoolForm;

