"use client";
import React, { useState, useRef } from "react";
import {
  BookOpen,
  Hash,
  FileText,
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
      units_lec: 3,
      units_lab: 0,
      lecture_hour: 3,
      lab_hour: 0,
      status: "active",
    }
  );

  const [formData, setFormData] = useState<Partial<Subject>>(
    initialFormData.current
  );
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [validationError, setValidationError] = useState<string>("");


  const hasChanges = () => {
    if (!subject) return false;
    return (
      formData.code !== initialFormData.current.code ||
      formData.name !== initialFormData.current.name ||
      formData.description !== initialFormData.current.description ||
      formData.units_lec !== initialFormData.current.units_lec ||
      formData.units_lab !== initialFormData.current.units_lab ||
      formData.lecture_hour !== initialFormData.current.lecture_hour ||
      formData.lab_hour !== initialFormData.current.lab_hour ||
      formData.status !== initialFormData.current.status
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    // Validation: At least one credit or class hour is required
    const hasCredits = (formData.units_lec || 0) > 0 || (formData.units_lab || 0) > 0;
    const hasHours = (formData.lecture_hour || 0) > 0 || (formData.lab_hour || 0) > 0;

    if (!formData.code || !formData.name) {
      return;
    }

    if (!hasCredits && !hasHours) {
      setValidationError("At least one credit or class hour is required.");
      return;
    }

    if (formData.code && formData.name && (hasCredits || hasHours)) {
      if (subject && hasChanges()) {
        setShowSaveConfirmation(true);
      } else {
        performSave();
      }
    }
  };

  const performSave = () => {
    const hasCredits = (formData.units_lec || 0) > 0 || (formData.units_lab || 0) > 0;
    const hasHours = (formData.lecture_hour || 0) > 0 || (formData.lab_hour || 0) > 0;

    if (formData.code && formData.name && (hasCredits || hasHours)) {
      // Only send fields that exist in the database schema
      const subjectData: Partial<Subject> = {
        code: formData.code.toUpperCase()!,
        name: formData.name!,
        description: formData.description || "",
        units_lec: formData.units_lec || 0,
        units_lab: formData.units_lab || 0,
        lecture_hour: formData.lecture_hour || 0,
        lab_hour: formData.lab_hour || 0,
        status: (formData.status as "active" | "inactive") || "active",
      };
      onSave({
        ...subjectData,
        id: subject?.id || Date.now(),
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
        className='rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200'
        style={{
          backgroundColor: "white",
          border: "1px solid rgba(58, 35, 19, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className='px-5 py-2.5 flex items-center justify-between border-b'
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
                className='text-lg font-bold'
                style={{ color: colors.primary }}
              >
                {subject ? "Edit Subject" : "Add New Subject"}
              </h2>
              <p className='text-xs text-gray-500'>
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

        <div className='p-4'>
          <form onSubmit={handleSubmit} className='space-y-4'>
            {/* Basic Information Section */}
            <div
              className='bg-white rounded-2xl p-6 space-y-3'
              style={{
                boxShadow: "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
                border: "1px solid rgba(58, 35, 19, 0.1)"
              }}
            >
              <h2
                className='text-xl font-semibold mb-4'
                style={{ color: colors.primary }}
              >
                Basic Information
              </h2>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                <div>
                  <label
                    className='flex items-center gap-2 text-xs font-semibold mb-1.5'
                    style={{ color: colors.primary }}
                  >
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
                    className='w-full rounded-lg px-3 py-2 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
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
                    className='flex items-center gap-2 text-xs font-semibold mb-1.5'
                    style={{ color: colors.primary }}
                  >
                    Subject Name <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className='w-full rounded-lg px-3 py-2 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
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
                    className='flex items-center gap-2 text-xs font-semibold mb-1.5'
                    style={{ color: colors.primary }}
                  >
                    Description
                  </label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className='w-full rounded-lg px-3 py-2 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
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
                    rows={2}
                    placeholder='Brief description of the subject...'
                  />
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className='flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200'>
              <span className='text-xs text-gray-600 font-medium'>Quick Setup:</span>
              <button
                type='button'
                onClick={() => {
                  setValidationError("");
                  setFormData({
                    ...formData,
                    units_lec: 3,
                    units_lab: 0,
                    lecture_hour: 3,
                    lab_hour: 0,
                  });
                }}
                className='px-3 py-1.5 text-xs rounded-md transition-all hover:shadow-sm border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
              >
                Lecture Only
              </button>
              <button
                type='button'
                onClick={() => {
                  setValidationError("");
                  setFormData({
                    ...formData,
                    units_lec: 2,
                    units_lab: 1,
                    lecture_hour: 2,
                    lab_hour: 3,
                  });
                }}
                className='px-3 py-1.5 text-xs rounded-md transition-all hover:shadow-sm border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
              >
                With Lab
              </button>
              <button
                type='button'
                onClick={() => {
                  setValidationError("");
                  setFormData({
                    ...formData,
                    units_lec: 2,
                    units_lab: 0,
                    lecture_hour: 3,
                    lab_hour: 0,
                  });
                }}
                className='px-3 py-1.5 text-xs rounded-md transition-all hover:shadow-sm border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'
              >
                PE / Activity
              </button>
            </div>

            {/* Credits Section */}
            <div
              className='p-6 rounded-xl bg-white'
              style={{
                boxShadow: "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
                border: "1px solid rgba(58, 35, 19, 0.1)",
              }}
            >
              <div className='mb-4'>
                <h3 className='text-sm font-semibold mb-0.5' style={{ color: colors.primary }}>
                  Credits (Used for GPA & Graduation)
                </h3>
                <p className='text-[10px] text-gray-500'>Academic credit value</p>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label
                    className='text-xs font-semibold mb-1.5 block'
                    style={{ color: colors.primary }}
                  >
                    Lecture Credits
                  </label>
                  <input
                    type='number'
                    min='0'
                    max='6'
                    value={formData.units_lec || ""}
                    onChange={(e) => {
                      setValidationError("");
                      setFormData({
                        ...formData,
                        units_lec: e.target.value ? parseInt(e.target.value) : undefined,
                      });
                    }}
                    className='w-full rounded-lg px-3 py-2 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
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
                    placeholder='0'
                  />
                </div>

                <div>
                  <label
                    className='text-xs font-semibold mb-1.5 block'
                    style={{ color: colors.primary }}
                  >
                    Laboratory Credits
                  </label>
                  <input
                    type='number'
                    min='0'
                    max='6'
                    value={formData.units_lab || ""}
                    onChange={(e) => {
                      setValidationError("");
                      setFormData({
                        ...formData,
                        units_lab: e.target.value ? parseInt(e.target.value) : undefined,
                      });
                    }}
                    className='w-full rounded-lg px-3 py-2 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
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
                    placeholder='0'
                  />
                </div>
              </div>
            </div>

            {/* Class Time Section */}
            <div
              className='p-6 rounded-xl'
              style={{
                backgroundColor: "#FAFAFA",
                boxShadow: "0 1px 2px 0 rgba(58, 35, 19, 0.08)",
                border: "1px solid rgba(58, 35, 19, 0.06)",
              }}
            >
              <div className='mb-4'>
                <h3 className='text-sm font-semibold mb-0.5' style={{ color: colors.primary }}>
                  Class Time Per Week
                </h3>
                <p className='text-[10px] text-gray-500'>Actual contact time</p>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label
                    className='text-xs font-semibold mb-1.5 block'
                    style={{ color: colors.primary }}
                  >
                    Lecture Hours
                  </label>
                  <div className='relative'>
                    <input
                      type='number'
                      min='0'
                      value={formData.lecture_hour || ""}
                      onChange={(e) => {
                        setValidationError("");
                        setFormData({
                          ...formData,
                          lecture_hour: e.target.value ? parseInt(e.target.value) : undefined,
                        });
                      }}
                      className='w-full rounded-lg px-3 py-2 pr-14 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                      style={{
                        border: "1px solid #E5E7EB",
                        outline: "none",
                        color: "#6B5B4F",
                        backgroundColor: "white",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.secondary;
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#E5E7EB";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      placeholder='0'
                    />
                    <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400'>
                      hrs
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    className='text-xs font-semibold mb-1.5 block'
                    style={{ color: colors.primary }}
                  >
                    Laboratory Hours
                  </label>
                  <div className='relative'>
                    <input
                      type='number'
                      min='0'
                      value={formData.lab_hour || ""}
                      onChange={(e) => {
                        setValidationError("");
                        setFormData({
                          ...formData,
                          lab_hour: e.target.value ? parseInt(e.target.value) : undefined,
                        });
                      }}
                      className='w-full rounded-lg px-3 py-2 pr-14 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0'
                      style={{
                        border: "1px solid #E5E7EB",
                        outline: "none",
                        color: "#6B5B4F",
                        backgroundColor: "white",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.secondary;
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#E5E7EB";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      placeholder='0'
                    />
                    <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400'>
                      hrs
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div
              className='bg-white rounded-2xl p-6'
              style={{
                boxShadow: "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
                border: "1px solid rgba(58, 35, 19, 0.1)"
              }}
            >
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label
                    className='flex items-center gap-2 text-xs font-semibold mb-1.5'
                    style={{ color: colors.primary }}
                  >
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
                  className='w-full rounded-lg px-3 py-2 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white'
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
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className='p-3 rounded-lg bg-red-50 border border-red-200'>
              <p className='text-xs text-red-600'>{validationError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className='flex justify-end gap-3 pt-6 border-t border-gray-200'>
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
          message={`Are you sure you want to save changes to "${formData.name || subject?.name
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
