"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, ArrowLeft, Plus, Trash2, Zap, ChevronDown } from "lucide-react";
import { Subject } from "../../../types";
import { colors } from "../../../colors";
import ConfirmationModal from "../../common/ConfirmationModal";
import ErrorModal from "../../common/ErrorModal";
import SuccessModal from "../../common/SuccessModal";
import Pagination from "../../common/Pagination";

interface AddMultipleSubjectsPageProps {
  onSave: (subjects: Omit<Subject, "id">[]) => Promise<void>;
  onCancel: () => void;
}

interface FormRow {
  id: string;
  code: string;
  name: string;
  description: string;
  units_lec: number | "";
  units_lab: number | "";
  lecture_hour: number | "";
  lab_hour: number | "";
  fixedAmount: number | "" | string;
  status: "active" | "inactive";
  activePreset?: "lecture" | "lab" | "pe" | null;
}

const AddMultipleSubjectsPage: React.FC<AddMultipleSubjectsPageProps> = ({
  onSave,
  onCancel,
}) => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const initialRow: FormRow = {
    id: "",
    code: "",
    name: "",
    description: "",
    units_lec: "",
    units_lab: "",
    lecture_hour: "",
    lab_hour: "",
    fixedAmount: "",
    status: "active",
    activePreset: null,
  };

  const presets = {
    lecture: {
      label: "Lecture Only",
      shortLabel: "Lecture",
      units_lec: 3,
      units_lab: 0,
      lecture_hour: 3,
      lab_hour: 0,
      description: "3 lec credits, 3 lec hours",
    },
    lab: {
      label: "With Lab",
      shortLabel: "With Lab",
      units_lec: 2,
      units_lab: 1,
      lecture_hour: 2,
      lab_hour: 3,
      description: "2 lec + 1 lab credits, 2 lec + 3 lab hours",
    },
    pe: {
      label: "PE / Activity",
      shortLabel: "PE",
      units_lec: 2,
      units_lab: 0,
      lecture_hour: 3,
      lab_hour: 0,
      description: "2 lec credits, 3 lec hours",
    },
  };

  const [rows, setRows] = useState<FormRow[]>([
    {
      ...initialRow,
      id: "1",
    },
  ]);
  const [focusedFixedAmountRowId, setFocusedFixedAmountRowId] = useState<string | null>(null);

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

  const totalPages = Math.ceil(rows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRows = rows.slice(startIndex, endIndex);

  const hasChanges = () => {
    return rows.some((row) => {
      return (
        row.code !== "" ||
        row.name !== "" ||
        row.description !== "" ||
        row.units_lec !== "" ||
        row.units_lab !== "" ||
        row.lecture_hour !== "" ||
        row.lab_hour !== "" ||
        row.fixedAmount !== ""
      );
    });
  };

  const addRow = () => {
    const newRow: FormRow = {
      ...initialRow,
      id: Date.now().toString(),
    };
    const updatedRows = [...rows, newRow];
    setRows(updatedRows);
    const newTotalPages = Math.ceil(updatedRows.length / itemsPerPage);
    if (newTotalPages > totalPages) {
      setCurrentPage(newTotalPages);
    }
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      const newRows = rows.filter((row) => row.id !== id);
      setRows(newRows);
      const newTotalPages = Math.ceil(newRows.length / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    }
  };

  const updateRow = (id: string, field: keyof FormRow, value: any) => {
    setRows(
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const applyQuickSetup = (rowId: string, preset: "lecture" | "lab" | "pe" | null) => {
    setValidationErrors([]);
    
    if (!preset) {
      // Clear preset
      setRows(
        rows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                activePreset: null,
              }
            : row
        )
      );
      return;
    }

    const presetData = presets[preset];
    const updates: Partial<FormRow> = {
      units_lec: presetData.units_lec,
      units_lab: presetData.units_lab,
      lecture_hour: presetData.lecture_hour,
      lab_hour: presetData.lab_hour,
      activePreset: preset,
    };

    setRows(
      rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              ...updates,
            }
          : row
      )
    );
  };

  const getActivePreset = (row: FormRow): "lecture" | "lab" | "pe" | null => {
    if (row.activePreset) return row.activePreset;
    
    // Check if current values match any preset
    const lec = Number(row.units_lec) || 0;
    const lab = Number(row.units_lab) || 0;
    const lecHr = Number(row.lecture_hour) || 0;
    const labHr = Number(row.lab_hour) || 0;

    if (lec === 3 && lab === 0 && lecHr === 3 && labHr === 0) return "lecture";
    if (lec === 2 && lab === 1 && lecHr === 2 && labHr === 3) return "lab";
    if (lec === 2 && lab === 0 && lecHr === 3 && labHr === 0) return "pe";
    
    return null;
  };

  const validateRows = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    rows.forEach((row, index) => {
      const rowNum = index + 1;
      const hasData =
        row.code?.trim() ||
        row.name?.trim() ||
        row.units_lec ||
        row.units_lab ||
        row.lecture_hour ||
        row.lab_hour ||
        row.fixedAmount;

      if (!hasData) {
        return; // Skip empty rows
      }

      if (!row.code?.trim()) {
        errors.push(`Row ${rowNum}: Subject Code is required`);
      }
      if (!row.name?.trim()) {
        errors.push(`Row ${rowNum}: Subject Name is required`);
      }

      if (row.code?.trim() && row.name?.trim()) {
        const hasCredits = (Number(row.units_lec) || 0) > 0 || (Number(row.units_lab) || 0) > 0;
        const hasHours = (Number(row.lecture_hour) || 0) > 0 || (Number(row.lab_hour) || 0) > 0;

        if (!hasCredits && !hasHours) {
          errors.push(
            `Row ${rowNum}: At least one credit or class hour is required.`
          );
        }
      }
      
      // Validate fixedAmount if provided
      if (row.fixedAmount !== undefined && row.fixedAmount !== null && row.fixedAmount !== "") {
        const amount = Number(row.fixedAmount);
        if (isNaN(amount) || amount < 0) {
          errors.push(`Row ${rowNum}: Fixed Amount must be a valid non-negative decimal number`);
        }
      }
    });

    return { valid: errors.length === 0, errors };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);

    const validation = validateRows();
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setErrorModal({
        isOpen: true,
        message: "Validation Error",
        details: validation.errors.join("\n"),
      });
      return;
    }

    const validRows = rows.filter((row) => {
      const hasData =
        row.code?.trim() ||
        row.name?.trim() ||
        row.units_lec ||
        row.units_lab ||
        row.lecture_hour ||
        row.lab_hour ||
        row.fixedAmount;
      if (!hasData) return false;

      if (!row.code?.trim() || !row.name?.trim()) return false;

      const hasCredits = (Number(row.units_lec) || 0) > 0 || (Number(row.units_lab) || 0) > 0;
      const hasHours = (Number(row.lecture_hour) || 0) > 0 || (Number(row.lab_hour) || 0) > 0;

      return hasCredits || hasHours;
    });

    if (validRows.length === 0) {
      setErrorModal({
        isOpen: true,
        message: "No Valid Data",
        details: "Please fill in at least one complete subject row.",
      });
      return;
    }

    setShowSaveConfirmation(true);
  };

  const performSave = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setShowSaveConfirmation(false);

    try {
      const validRows = rows.filter((row) => {
        const hasData =
          row.code?.trim() ||
          row.name?.trim() ||
          row.units_lec ||
          row.units_lab ||
          row.lecture_hour ||
          row.lab_hour ||
          row.fixedAmount;
        if (!hasData) return false;

        if (!row.code?.trim() || !row.name?.trim()) return false;

        const hasCredits = (Number(row.units_lec) || 0) > 0 || (Number(row.units_lab) || 0) > 0;
        const hasHours = (Number(row.lecture_hour) || 0) > 0 || (Number(row.lab_hour) || 0) > 0;

        return hasCredits || hasHours;
      });

      const subjectsData: Omit<Subject, "id">[] = validRows.map((row) => ({
        code: row.code.trim().toUpperCase(),
        name: row.name.trim(),
        description: row.description?.trim() || "",
        units_lec: row.units_lec ? Number(row.units_lec) : 0,
        units_lab: row.units_lab ? Number(row.units_lab) : 0,
        lecture_hour: row.lecture_hour ? Number(row.lecture_hour) : 0,
        lab_hour: row.lab_hour ? Number(row.lab_hour) : 0,
        fixedAmount: row.fixedAmount && row.fixedAmount !== "" ? Number(row.fixedAmount) : undefined,
        status: row.status || "active",
      }));

      await onSave(subjectsData);
      setSuccessModal({
        isOpen: true,
        message: `${subjectsData.length} subject(s) have been created successfully.`,
      });

      setTimeout(() => {
        onCancel();
      }, 3500);
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: `Failed to create subjects: ${error.message || "Unknown error"}`,
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

  const validRowsCount = rows.filter((row) => {
    const hasData =
      row.code?.trim() ||
      row.name?.trim() ||
      row.units_lec ||
      row.units_lab ||
      row.lecture_hour ||
      row.lab_hour ||
      row.fixedAmount;
    if (!hasData) return false;

    if (!row.code?.trim() || !row.name?.trim()) return false;

    const hasCredits = (Number(row.units_lec) || 0) > 0 || (Number(row.units_lab) || 0) > 0;
    const hasHours = (Number(row.lecture_hour) || 0) > 0 || (Number(row.lab_hour) || 0) > 0;

    return hasCredits || hasHours;
  }).length;

  return (
    <div
      className="min-h-screen p-6 font-sans"
      style={{ backgroundColor: colors.paper, minHeight: "100vh" }}
    >
      <div className="max-w-7xl mx-auto w-full space-y-6">
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
                Add Multiple Subjects
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Create multiple subject records in bulk
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className="bg-white rounded-2xl p-6"
            style={{
              boxShadow:
                "0 1px 3px 0 rgba(58, 35, 19, 0.12), 0 1px 2px 0 rgba(58, 35, 19, 0.08)",
              border: "1px solid rgba(58, 35, 19, 0.1)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr
                    style={{
                      backgroundColor: `${colors.primary}05`,
                      borderBottom: `1px solid ${colors.primary}10`,
                    }}
                  >
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                      Code <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                      Name <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                      Description
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                      Quick Setup
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                      Lec Credits
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                      Lab Credits
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                      Lec Hours
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                      Lab Hours
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                      Fixed Amount
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                      Status
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-gray-600 w-12">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((row, index) => {
                    const actualIndex = startIndex + index;
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-gray-100 hover:bg-gray-50/50"
                      >
                        {/* Code */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.code}
                            onChange={(e) =>
                              updateRow(
                                row.id,
                                "code",
                                e.target.value.toUpperCase()
                              )
                            }
                            className="w-full rounded-lg px-2 py-1.5 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
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
                          />
                        </td>

                        {/* Name */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) =>
                              updateRow(row.id, "name", e.target.value)
                            }
                            className="w-full rounded-lg px-2 py-1.5 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
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
                          />
                        </td>

                        {/* Description */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) =>
                              updateRow(row.id, "description", e.target.value)
                            }
                            className="w-full rounded-lg px-2 py-1.5 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
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
                            placeholder="Optional"
                          />
                        </td>

                        {/* Quick Setup */}
                        <td className="px-3 py-2">
                          <div className="relative">
                            <select
                              value={getActivePreset(row) || ""}
                              onChange={(e) =>
                                applyQuickSetup(
                                  row.id,
                                  (e.target.value || null) as "lecture" | "lab" | "pe" | null
                                )
                              }
                              className="w-full rounded-lg px-2 py-1.5 pr-7 text-xs transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white appearance-none cursor-pointer"
                              style={{
                                border: getActivePreset(row)
                                  ? `1px solid ${colors.secondary}`
                                  : "1px solid #E5E7EB",
                                outline: "none",
                                color: getActivePreset(row) ? colors.secondary : "#6B5B4F",
                                backgroundColor: getActivePreset(row)
                                  ? `${colors.secondary}10`
                                  : "white",
                                fontWeight: getActivePreset(row) ? "600" : "400",
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = colors.secondary;
                                e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                              }}
                              onBlur={(e) => {
                                const preset = getActivePreset(row);
                                e.currentTarget.style.borderColor = preset
                                  ? colors.secondary
                                  : "#E5E7EB";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              <option value="">Quick Setup</option>
                              <option value="lecture">
                                {presets.lecture.label} ({presets.lecture.description})
                              </option>
                              <option value="lab">
                                {presets.lab.label} ({presets.lab.description})
                              </option>
                              <option value="pe">
                                {presets.pe.label} ({presets.pe.description})
                              </option>
                            </select>
                            <div
                              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1"
                              style={{ color: getActivePreset(row) ? colors.secondary : "#9CA3AF" }}
                            >
                              {getActivePreset(row) && (
                                <Zap className="w-3 h-3" style={{ color: colors.secondary }} />
                              )}
                              <ChevronDown className="w-3 h-3" />
                            </div>
                          </div>
                        </td>

                        {/* Lecture Credits */}
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max="6"
                            value={row.units_lec}
                            onChange={(e) =>
                              updateRow(
                                row.id,
                                "units_lec",
                                e.target.value ? parseInt(e.target.value) : ""
                              )
                            }
                            className="w-full rounded-lg px-2 py-1.5 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
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
                        </td>

                        {/* Lab Credits */}
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max="6"
                            value={row.units_lab}
                            onChange={(e) =>
                              updateRow(
                                row.id,
                                "units_lab",
                                e.target.value ? parseInt(e.target.value) : ""
                              )
                            }
                            className="w-full rounded-lg px-2 py-1.5 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
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
                        </td>

                        {/* Lecture Hours */}
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={row.lecture_hour}
                            onChange={(e) =>
                              updateRow(
                                row.id,
                                "lecture_hour",
                                e.target.value ? parseInt(e.target.value) : ""
                              )
                            }
                            className="w-full rounded-lg px-2 py-1.5 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
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
                        </td>

                        {/* Lab Hours */}
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={row.lab_hour}
                            onChange={(e) =>
                              updateRow(
                                row.id,
                                "lab_hour",
                                e.target.value ? parseInt(e.target.value) : ""
                              )
                            }
                            className="w-full rounded-lg px-2 py-1.5 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
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
                        </td>

                        {/* Fixed Amount */}
                        <td className="px-3 py-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              ₱
                            </span>
                            <input
                              type="text"
                              value={
                                focusedFixedAmountRowId === row.id
                                  ? (typeof row.fixedAmount === 'string' 
                                      ? row.fixedAmount 
                                      : row.fixedAmount !== "" && row.fixedAmount !== undefined && row.fixedAmount !== null
                                      ? row.fixedAmount.toString()
                                      : "")
                                  : row.fixedAmount !== "" && row.fixedAmount !== undefined && row.fixedAmount !== null
                                  ? Number(row.fixedAmount).toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })
                                  : ""
                              }
                              onChange={(e) => {
                                const value = e.target.value.replace(/,/g, '');
                                // Store as string during typing for natural editing
                                updateRow(row.id, "fixedAmount", value === "" ? "" : value);
                              }}
                              onFocus={(e) => {
                                setFocusedFixedAmountRowId(row.id);
                                // Show raw value when focusing
                                const currentValue = typeof row.fixedAmount === 'string'
                                  ? row.fixedAmount
                                  : row.fixedAmount !== "" && row.fixedAmount !== undefined && row.fixedAmount !== null
                                  ? row.fixedAmount.toString()
                                  : "";
                                updateRow(row.id, "fixedAmount", currentValue);
                                e.currentTarget.style.borderColor = colors.secondary;
                                e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
                              }}
                              onBlur={(e) => {
                                setFocusedFixedAmountRowId(null);
                                const rawValue = typeof row.fixedAmount === 'string' 
                                  ? row.fixedAmount 
                                  : row.fixedAmount?.toString() || "";
                                const value = rawValue.replace(/,/g, '').trim();
                                if (value === "" || value === ".") {
                                  updateRow(row.id, "fixedAmount", "");
                                } else {
                                  const numValue = parseFloat(value);
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    updateRow(row.id, "fixedAmount", numValue);
                                  } else {
                                    // Invalid input, revert to empty
                                    updateRow(row.id, "fixedAmount", "");
                                  }
                                }
                                e.currentTarget.style.borderColor = "#E5E7EB";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                              className="w-full rounded-lg px-2 py-1.5 pl-6 pr-2 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0"
                              style={{
                                border: "1px solid #E5E7EB",
                                outline: "none",
                                color: "#6B5B4F",
                              }}
                              placeholder="0.00"
                            />
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2">
                          <select
                            value={row.status}
                            onChange={(e) =>
                              updateRow(
                                row.id,
                                "status",
                                e.target.value as "active" | "inactive"
                              )
                            }
                            className="w-full rounded-lg px-2 py-1.5 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0 bg-white"
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
                        </td>

                        {/* Action */}
                        <td className="px-3 py-2 text-center">
                          {rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(row.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                              title="Remove row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {rows.length > itemsPerPage && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  totalItems={rows.length}
                  itemName="rows"
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(newItemsPerPage) => {
                    setItemsPerPage(newItemsPerPage);
                    setCurrentPage(1);
                  }}
                  itemsPerPageOptions={[5, 10, 15, 20]}
                />
              </div>
            )}

            {/* Add Row Button */}
            <button
              type="button"
              onClick={addRow}
              className="mt-4 w-full py-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-700"
            >
              <Plus className="w-4 h-4" />
              Add another subject
            </button>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs font-semibold text-red-600 mb-1">
                Validation Errors:
              </p>
              <ul className="text-xs text-red-600 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
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
              {isSubmitting
                ? "Creating..."
                : `Create ${validRowsCount} Subject(s)`}
            </button>
          </div>
        </form>

        {/* Save Confirmation Modal */}
        <ConfirmationModal
          isOpen={showSaveConfirmation}
          onClose={() => setShowSaveConfirmation(false)}
          onConfirm={performSave}
          title="Create Multiple Subjects"
          message={`Are you sure you want to create ${validRowsCount} subject(s)?`}
          description="The subjects will be saved and available for use."
          confirmText="Create Subjects"
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

export default AddMultipleSubjectsPage;

