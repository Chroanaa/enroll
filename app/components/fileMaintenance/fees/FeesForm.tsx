"use client";
import React, { useState, useRef } from "react";
import {
  DollarSign,
  Hash,
  FileText,
  Tag,
  Calendar,
  GraduationCap,
  CheckCircle2,
  X,
} from "lucide-react";
import { Fee } from "../../../types";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";

interface FeesFormProps {
  fee: Fee | null;
  onSave: (fee: Fee) => void;
  onCancel: () => void;
}

const FeesForm: React.FC<FeesFormProps> = ({ fee, onSave, onCancel }) => {
  const initialFormData = useRef<Partial<Fee>>(
    fee || {
      code: "",
      name: "",
      description: "",
      amount: 0,
      category: "miscellaneous",
      academic_year: "2024-2025",
      semester: "1st",
      status: "active",
    }
  );

  const [formData, setFormData] = useState<Partial<Fee>>(
    initialFormData.current
  );
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showCancelWarning, setShowCancelWarning] = useState(false);

  const hasChanges = () => {
    if (!fee) return false;
    return (
      formData.code !== initialFormData.current.code ||
      formData.name !== initialFormData.current.name ||
      formData.description !== initialFormData.current.description ||
      formData.amount !== initialFormData.current.amount ||
      formData.category !== initialFormData.current.category ||
      formData.academic_year !== initialFormData.current.academic_year ||
      formData.semester !== initialFormData.current.semester ||
      formData.status !== initialFormData.current.status
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.code && formData.name && formData.amount !== undefined) {
      if (fee && hasChanges()) {
        setShowSaveConfirmation(true);
      } else {
        performSave();
      }
    }
  };

  const performSave = () => {
    if (formData.code && formData.name && formData.amount !== undefined) {
      const feeData: Partial<Fee> = {
        ...formData,
        code: formData.code.toUpperCase()!,
        name: formData.name!,
        description: formData.description || "",
        amount: formData.amount!,
        category: (formData.category as Fee["category"]) || "miscellaneous",
        academic_year: formData.academic_year || "2024-2025",
        semester: formData.semester || "1st",
        status: (formData.status as "active" | "inactive") || "active",
      };
      onSave({
        ...feeData,
        id: fee?.id || Math.random(),
      } as Fee);
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
              <DollarSign
                className='w-5 h-5'
                style={{ color: colors.secondary }}
              />
            </div>
            <div>
              <h2
                className='text-xl font-bold'
                style={{ color: colors.primary }}
              >
                {fee ? "Edit Fee" : "Add New Fee"}
              </h2>
              <p className='text-sm text-gray-500'>
                {fee ? "Update fee details" : "Create a new fee record"}
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
                  Fee Code <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={formData.code || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
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
                  placeholder="e.g. TUI001"
                  required
                />
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <DollarSign className='w-4 h-4 text-gray-400' />
                  Fee Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={formData.name || ""}
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
                  placeholder="e.g. Tuition Fee"
                  required
                />
              </div>

              <div className='md:col-span-2'>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <FileText className='w-4 h-4 text-gray-400' />
                  Description
                </label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
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
                  rows={3}
                  placeholder="Brief description of the fee..."
                />
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <DollarSign className='w-4 h-4 text-gray-400' />
                  Amount (PHP) <span className='text-red-500'>*</span>
                </label>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  value={formData.amount || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amount: parseFloat(e.target.value) || 0,
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
                  required
                />
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <Tag className='w-4 h-4 text-gray-400' />
                  Category <span className='text-red-500'>*</span>
                </label>
                <select
                  value={formData.category || "miscellaneous"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as Fee["category"],
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
                  <option value='tuition'>Tuition</option>
                  <option value='miscellaneous'>Miscellaneous</option>
                  <option value='laboratory'>Laboratory</option>
                  <option value='library'>Library</option>
                  <option value='other'>Other</option>
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
                <input
                  type='text'
                  value={formData.academic_year || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      academic_year: e.target.value,
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
                  placeholder='e.g., 2024-2025'
                  required
                />
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <GraduationCap className='w-4 h-4 text-gray-400' />
                  Semester
                </label>
                <select
                  value={formData.semester || "1st"}
                  onChange={(e) =>
                    setFormData({ ...formData, semester: e.target.value })
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
                  <option value='1st'>1st Semester</option>
                  <option value='2nd'>2nd Semester</option>
                  <option value='Summer'>Summer</option>
                </select>
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
                  value={formData.status || "active"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "active" | "inactive",
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
                  <option value='active'>Active</option>
                  <option value='inactive'>Inactive</option>
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
                {fee ? "Save Changes" : "Add Fee"}
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
          message={`Are you sure you want to save changes to "${formData.name || fee?.name}"?`}
          description='The fee information will be updated with the new details.'
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

export default FeesForm;



