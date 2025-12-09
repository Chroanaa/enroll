"use client";
import React, { useState, useRef } from "react";
import {
  BookOpen,
  Hash,
  FileText,
  GraduationCap,
  CheckCircle2,
  X,
} from "lucide-react";
import { Subject } from "../../../types";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";

interface SubjectFormProps {
  subject: Subject | null;
  onSave: (subject: Subject) => void;
  onCancel: () => void;
}

const SubjectForm: React.FC<SubjectFormProps> = ({
  subject,
  onSave,
  onCancel,
}) => {
  const initialFormData = useRef<Partial<Subject>>(
    subject || {
      code: "",
      name: "",
      description: "",
      units: 3,
      status: "active",
    }
  );

  const [formData, setFormData] = useState<Partial<Subject>>(
    initialFormData.current
  );
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showCancelWarning, setShowCancelWarning] = useState(false);


  const hasChanges = () => {
    if (!subject) return false;
    return (
      formData.code !== initialFormData.current.code ||
      formData.name !== initialFormData.current.name ||
      formData.description !== initialFormData.current.description ||
      formData.units !== initialFormData.current.units ||
      formData.status !== initialFormData.current.status
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.code && formData.name && formData.units) {
      if (subject && hasChanges()) {
        setShowSaveConfirmation(true);
      } else {
        performSave();
      }
    }
  };

  const performSave = () => {
    if (formData.code && formData.name && formData.units) {
      // Only send fields that exist in the database schema
      const subjectData: Partial<Subject> = {
        code: formData.code.toUpperCase()!,
        name: formData.name!,
        description: formData.description || "",
        units: formData.units!,
        status: (formData.status as "active" | "inactive") || "active",
      };
      onSave({
        ...subjectData,
        id: subject?.id || Math.random(),
      } as Subject);
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
              <BookOpen
                className='w-5 h-5'
                style={{ color: colors.secondary }}
              />
            </div>
            <div>
              <h2
                className='text-xl font-bold'
                style={{ color: colors.primary }}
              >
                {subject ? "Edit Subject" : "Add New Subject"}
              </h2>
              <p className='text-sm text-gray-500'>
                {subject
                  ? "Update subject details"
                  : "Create a new subject record"}
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
                  Subject Code <span className='text-red-500'>*</span>
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
                  placeholder='e.g. MATH101'
                  required
                />
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <BookOpen className='w-4 h-4 text-gray-400' />
                  Subject Name <span className='text-red-500'>*</span>
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
                  placeholder='e.g. Calculus I'
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
                  placeholder='Brief description of the subject...'
                />
              </div>

              <div>
                <label
                  className='flex items-center gap-2 text-sm font-semibold mb-2'
                  style={{ color: colors.primary }}
                >
                  <GraduationCap className='w-4 h-4 text-gray-400' />
                  Units <span className='text-red-500'>*</span>
                </label>
                <input
                  type='number'
                  min='1'
                  max='6'
                  value={formData.units || 3}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      units: parseInt(e.target.value) || 3,
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
                {subject ? "Save Changes" : "Add Subject"}
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
          message={`Are you sure you want to save changes to "${
            formData.name || subject?.name
          }"?`}
          description='The subject information will be updated with the new details.'
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

export default SubjectForm;
