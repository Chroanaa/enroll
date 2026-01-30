"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, ArrowLeft } from "lucide-react";
import { Subject } from "../../../types";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import ErrorModal from "../../common/ErrorModal";
import SuccessModal from "../../common/SuccessModal";

interface AddSubjectPageProps {
  onSave: (subject: Subject) => Promise<void>;
  onCancel: () => void;
}

const AddSubjectPage: React.FC<AddSubjectPageProps> = ({
  onSave,
  onCancel,
}) => {
  const router = useRouter();

  const initialFormData = useRef<Partial<Subject>>({
    code: "",
    name: "",
    description: "",
    units_lec: 3,
    units_lab: 0,
    lecture_hour: 3,
    lab_hour: 0,
    fixedAmount: undefined,
    status: "active",
  });

  const [formData, setFormData] = useState<Partial<Subject>>(
    initialFormData.current
  );
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [fixedAmountInput, setFixedAmountInput] = useState<string>("");
  const [isFixedAmountFocused, setIsFixedAmountFocused] = useState(false);

  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    details?: string;
  }>({
    isOpen: false,
    message: "",
    details: "",
  });

  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: "",
  });

  const hasChanges = () => {
    return (
      formData.code !== "" ||
      formData.name !== "" ||
      formData.description !== "" ||
      (formData.units_lec || 0) > 0 ||
      (formData.units_lab || 0) > 0 ||
      (formData.lecture_hour || 0) > 0 ||
      (formData.lab_hour || 0) > 0 ||
      (formData.fixedAmount !== undefined && formData.fixedAmount !== null)
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
      setShowSaveConfirmation(true);
    }
  };

  const performSave = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setShowSaveConfirmation(false);

    try {
      const hasCredits = (formData.units_lec || 0) > 0 || (formData.units_lab || 0) > 0;
      const hasHours = (formData.lecture_hour || 0) > 0 || (formData.lab_hour || 0) > 0;

      if (formData.code && formData.name && (hasCredits || hasHours)) {
        // Validate fixedAmount if provided
        if (formData.fixedAmount !== undefined && formData.fixedAmount !== null) {
          const amount = Number(formData.fixedAmount);
          if (isNaN(amount) || amount < 0) {
            setValidationError("Fixed Amount must be a valid non-negative decimal number.");
            setIsSubmitting(false);
            return;
          }
        }
        
        const subjectData: Subject = {
          id: Date.now(),
          code: formData.code.toUpperCase()!,
          name: formData.name!,
          description: formData.description || "",
          units_lec: formData.units_lec || 0,
          units_lab: formData.units_lab || 0,
          lecture_hour: formData.lecture_hour || 0,
          lab_hour: formData.lab_hour || 0,
          fixedAmount: formData.fixedAmount !== undefined && formData.fixedAmount !== null 
            ? Number(formData.fixedAmount) 
            : undefined,
          status: (formData.status as "active" | "inactive") || "active",
        };

        await onSave(subjectData);
        setSuccessModal({
          isOpen: true,
          message: `Subject "${subjectData.name}" has been created successfully.`,
        });

        setTimeout(() => {
          onCancel();
        }, 3500);
      }
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: `Failed to create subject: ${error.message || "Unknown error"}`,
        details: "Please check your input and try again.",
      });
    } finally {
      setIsSubmitting(false);
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
      className="min-h-screen p-6 font-sans"
      style={{ backgroundColor: colors.paper, minHeight: "100vh" }}
    >
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleCancel}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${colors.secondary}20` }}
            >
              <BookOpen
                className="w-6 h-6"
                style={{ color: colors.secondary }}
              />
            </div>
            <div>
              <h1
                className="text-3xl font-bold tracking-tight"
                style={{ color: colors.primary }}
              >
                Add New Subject
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Create a new subject record with credits and class time
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information Section */}
          <div
            className="bg-white rounded-2xl p-6 space-y-3"
            style={{
              boxShadow: "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
              border: "1px solid rgba(58, 35, 19, 0.1)"
            }}
          >
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: colors.primary }}
            >
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label
                  className="flex items-center gap-2 text-xs font-semibold mb-1.5"
                  style={{ color: colors.primary }}
                >
                  Subject Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full rounded-lg px-3 py-2 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
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
                  placeholder="e.g. MATH101"
                  required
                />
              </div>

              <div>
                <label
                  className="flex items-center gap-2 text-xs font-semibold mb-1.5"
                  style={{ color: colors.primary }}
                >
                  Subject Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-lg px-3 py-2 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
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
                  placeholder="e.g. Calculus I"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label
                  className="flex items-center gap-2 text-xs font-semibold mb-1.5"
                  style={{ color: colors.primary }}
                >
                  Description
                </label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded-lg px-3 py-2 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
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
                  placeholder="Brief description of the subject..."
                />
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <span className="text-xs text-gray-600 font-medium">Quick Setup:</span>
            <button
              type="button"
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
              className="px-3 py-1.5 text-xs rounded-md transition-all hover:shadow-sm border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50"
            >
              Lecture Only
            </button>
            <button
              type="button"
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
              className="px-3 py-1.5 text-xs rounded-md transition-all hover:shadow-sm border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50"
            >
              With Lab
            </button>
            <button
              type="button"
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
              className="px-3 py-1.5 text-xs rounded-md transition-all hover:shadow-sm border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50"
            >
              PE / Activity
            </button>
          </div>

          {/* Credits Section */}
          <div
            className="p-6 rounded-xl bg-white"
            style={{
              boxShadow: "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
              border: "1px solid rgba(58, 35, 19, 0.1)",
            }}
          >
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-0.5" style={{ color: colors.primary }}>
                Credits (Used for GPA & Graduation)
              </h3>
              <p className="text-[10px] text-gray-500">Academic credit value</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className="text-xs font-semibold mb-1.5 block"
                  style={{ color: colors.primary }}
                >
                  Lecture Credits
                </label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={formData.units_lec || ""}
                  onChange={(e) => {
                    setValidationError("");
                    setFormData({
                      ...formData,
                      units_lec: e.target.value ? parseInt(e.target.value) : undefined,
                    });
                  }}
                  className="w-full rounded-lg px-3 py-2 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
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
                  placeholder="0"
                />
              </div>

              <div>
                <label
                  className="text-xs font-semibold mb-1.5 block"
                  style={{ color: colors.primary }}
                >
                  Laboratory Credits
                </label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={formData.units_lab || ""}
                  onChange={(e) => {
                    setValidationError("");
                    setFormData({
                      ...formData,
                      units_lab: e.target.value ? parseInt(e.target.value) : undefined,
                    });
                  }}
                  className="w-full rounded-lg px-3 py-2 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
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
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Class Time Section */}
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: "#FAFAFA",
              boxShadow: "0 1px 2px 0 rgba(58, 35, 19, 0.08)",
              border: "1px solid rgba(58, 35, 19, 0.06)",
            }}
          >
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-0.5" style={{ color: colors.primary }}>
                Class Time Per Week
              </h3>
              <p className="text-[10px] text-gray-500">Actual contact time</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className="text-xs font-semibold mb-1.5 block"
                  style={{ color: colors.primary }}
                >
                  Lecture Hours
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.lecture_hour || ""}
                    onChange={(e) => {
                      setValidationError("");
                      setFormData({
                        ...formData,
                        lecture_hour: e.target.value ? parseInt(e.target.value) : undefined,
                      });
                    }}
                    className="w-full rounded-lg px-3 py-2 pr-14 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
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
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    hrs
                  </span>
                </div>
              </div>

              <div>
                <label
                  className="text-xs font-semibold mb-1.5 block"
                  style={{ color: colors.primary }}
                >
                  Laboratory Hours
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={formData.lab_hour || ""}
                    onChange={(e) => {
                      setValidationError("");
                      setFormData({
                        ...formData,
                        lab_hour: e.target.value ? parseInt(e.target.value) : undefined,
                      });
                    }}
                    className="w-full rounded-lg px-3 py-2 pr-14 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
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
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    hrs
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Status & Fixed Amount Section */}
          <div
            className="bg-white rounded-2xl p-6"
            style={{
              boxShadow: "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
              border: "1px solid rgba(58, 35, 19, 0.1)"
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status - Left Side */}
              <div>
                <label
                  className="flex items-center gap-2 text-xs font-semibold mb-1.5"
                  style={{ color: colors.primary }}
                >
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status || "active"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  className="w-full rounded-lg px-3 py-2 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white"
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Fixed Amount - Right Side */}
              <div>
                <label
                  className="flex items-center gap-2 text-xs font-semibold mb-1.5"
                  style={{ color: colors.primary }}
                >
                  Fixed Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    ₱
                  </span>
                  <input
                    type="text"
                    value={
                      isFixedAmountFocused
                        ? fixedAmountInput
                        : formData.fixedAmount !== undefined && formData.fixedAmount !== null
                        ? formData.fixedAmount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : ""
                    }
                    onChange={(e) => {
                      setValidationError("");
                      const value = e.target.value.replace(/,/g, '');
                      setFixedAmountInput(value);
                    }}
                    onFocus={(e) => {
                      setIsFixedAmountFocused(true);
                      // Set raw value when focusing
                      setFixedAmountInput(
                        formData.fixedAmount !== undefined && formData.fixedAmount !== null
                          ? formData.fixedAmount.toString()
                          : ""
                      );
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                    }}
                    onBlur={(e) => {
                      setIsFixedAmountFocused(false);
                      const value = fixedAmountInput.replace(/,/g, '').trim();
                      if (value === "" || value === ".") {
                        setFormData({
                          ...formData,
                          fixedAmount: undefined,
                        });
                        setFixedAmountInput("");
                      } else {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue) && numValue >= 0) {
                          setFormData({
                            ...formData,
                            fixedAmount: numValue,
                          });
                          setFixedAmountInput(numValue.toString());
                        } else {
                          // Invalid input, revert to previous value
                          setFixedAmountInput(
                            formData.fixedAmount !== undefined && formData.fixedAmount !== null
                              ? formData.fixedAmount.toString()
                              : ""
                          );
                        }
                      }
                      e.currentTarget.style.borderColor = "#E5E7EB";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    className="w-full rounded-lg px-3 py-2 pl-8 pr-3 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
                    style={{
                      border: "1px solid #E5E7EB",
                      outline: "none",
                      color: "#6B5B4F",
                    }}
                    placeholder="0.00"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Optional fixed monetary amount for this subject
                </p>
              </div>
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-600">{validationError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2.5 rounded-xl transition-all font-medium flex items-center gap-2 hover:bg-gray-100"
              style={{
                color: colors.primary,
                border: "1px solid #E5E7EB",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-white rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: colors.secondary }}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? "Creating..." : "Create Subject"}
            </button>
          </div>
        </form>

        {/* Save Confirmation Modal */}
        <ConfirmationModal
          isOpen={showSaveConfirmation}
          onClose={() => setShowSaveConfirmation(false)}
          onConfirm={performSave}
          title="Create Subject"
          message={`Are you sure you want to create "${formData.name || formData.code}"?`}
          description="The subject will be saved and available for use."
          confirmText="Create Subject"
          cancelText="Cancel"
          variant="info"
        />

        {/* Cancel Warning Modal */}
        <ConfirmationModal
          isOpen={showCancelWarning}
          onClose={() => setShowCancelWarning(false)}
          onConfirm={handleConfirmCancel}
          title="Unsaved Changes"
          message="You have unsaved changes. Are you sure you want to leave?"
          description="Your changes will be lost if you continue without saving."
          confirmText="Leave Without Saving"
          cancelText="Stay and Edit"
          variant="warning"
        />

        {/* Success Modal */}
        <SuccessModal
          isOpen={successModal.isOpen}
          onClose={() => setSuccessModal({ isOpen: false, message: "" })}
          message={successModal.message}
          autoClose={true}
          autoCloseDelay={3000}
        />

        {/* Error Modal */}
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() =>
            setErrorModal({ isOpen: false, message: "", details: "" })
          }
          message={errorModal.message}
          details={errorModal.details}
        />
      </div>
    </div>
  );
};

export default AddSubjectPage;

