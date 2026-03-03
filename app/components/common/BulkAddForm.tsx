"use client";
import React, { useState } from "react";
import { CheckCircle2, X, Plus, Trash2, LucideIcon } from "lucide-react";
import { colors } from "../../colors";
import ConfirmationModal from "./ConfirmationModal";
import ErrorModal from "./ErrorModal";
import Pagination from "./Pagination";

export interface FieldDefinition {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  transform?: (value: any) => any;
  validation?: (value: any, row: any) => string | null;
}

export interface BulkAddFormConfig {
  title: string;
  description: string;
  icon: LucideIcon;
  itemName: string;
  fields: FieldDefinition[];
  initialRow: Record<string, any>;
  validateRow: (row: Record<string, any>, index: number) => string[];
  transformRow: (row: Record<string, any>) => any;
  hasData: (row: Record<string, any>) => boolean;
}

interface BulkAddFormProps {
  config: BulkAddFormConfig;
  onSave: (items: any[]) => void;
  onCancel: () => void;
}

interface FormRow {
  id: string;
  [key: string]: any;
}

const BulkAddForm: React.FC<BulkAddFormProps> = ({
  config,
  onSave,
  onCancel,
}) => {
  const [rows, setRows] = useState<FormRow[]>([
    {
      id: "1",
      ...config.initialRow,
    },
  ]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    details?: string;
  }>({
    isOpen: false,
    message: "",
    details: "",
  });

  const totalPages = Math.ceil(rows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRows = rows.slice(startIndex, endIndex);

  const hasData = () => {
    return rows.some((row) => config.hasData(row));
  };

  const addRow = () => {
    const newRow: FormRow = {
      id: Date.now().toString(),
      ...config.initialRow,
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

  const updateRow = (id: string, field: string, value: any) => {
    setRows(
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const validateRows = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    rows.forEach((row, index) => {
      const rowErrors = config.validateRow(row, index);
      errors.push(...rowErrors);
    });
    return { valid: errors.length === 0, errors };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateRows();
    if (!validation.valid) {
      setErrorModal({
        isOpen: true,
        message: "Validation Error",
        details: validation.errors.join("\n"),
      });
      return;
    }

    const validRows = rows.filter((row) => {
      const errors = config.validateRow(row, -1);
      return errors.length === 0;
    });

    if (validRows.length === 0) {
      setErrorModal({
        isOpen: true,
        message: "No Valid Data",
        details: `Please fill in at least one complete ${config.itemName} row.`,
      });
      return;
    }

    setShowSaveConfirmation(true);
  };

  const performSave = () => {
    const validRows = rows.filter((row) => {
      const errors = config.validateRow(row, -1);
      return errors.length === 0;
    });

    const items = validRows.map((row) => config.transformRow(row));

    onSave(items);
    setShowSaveConfirmation(false);
  };

  const handleCancel = () => {
    if (hasData()) {
      setShowCancelWarning(true);
    } else {
      onCancel();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelWarning(false);
    onCancel();
  };

  const Icon = config.icon;

  const renderField = (field: FieldDefinition, row: FormRow) => {
    const value = row[field.key] ?? "";

    const commonInputProps = {
      value: value,
      onChange: (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => {
        let newValue: any = e.target.value;

        if (field.type === "number") {
          newValue = e.target.value ? parseFloat(e.target.value) : "";
        }

        if (field.transform) {
          newValue = field.transform(newValue);
        }

        updateRow(row.id, field.key, newValue);
      },
      className:
        "w-full rounded-lg px-2 py-1.5 text-sm transition-all border-gray-200 focus:ring-2 focus:ring-offset-0",
      style: {
        border: "1px solid #E5E7EB",
        outline: "none" as const,
        color: "#6B5B4F",
      },
      onFocus: (
        e: React.FocusEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => {
        e.currentTarget.style.borderColor = colors.secondary;
        e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}20`;
      },
      onBlur: (
        e: React.FocusEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => {
        e.currentTarget.style.borderColor = "#E5E7EB";
        e.currentTarget.style.boxShadow = "none";
      },
      placeholder: field.placeholder,
    };

    switch (field.type) {
      case "text":
        return <input type='text' {...commonInputProps} />;
      case "number":
        return (
          <input
            type='number'
            min={field.min}
            max={field.max}
            step={field.step}
            {...commonInputProps}
          />
        );
      case "select":
        return (
          <select
            {...commonInputProps}
            className={`${commonInputProps.className} bg-white`}
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case "textarea":
        return (
          <textarea
            {...commonInputProps}
            rows={2}
            className={`${commonInputProps.className} resize-none`}
          />
        );
      default:
        return null;
    }
  };

  const validRowsCount = rows.filter((row) => {
    const errors = config.validateRow(row, -1);
    return errors.length === 0;
  }).length;

  return (
    <div
      className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={handleCancel}
    >
      <div
        className='rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200'
        style={{
          backgroundColor: "white",
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
              <Icon className='w-5 h-5' style={{ color: colors.secondary }} />
            </div>
            <div>
              <h2
                className='text-lg font-bold'
                style={{ color: colors.primary }}
              >
                {config.title}
              </h2>
              <p className='text-xs text-gray-500'>{config.description}</p>
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
          <form onSubmit={handleSubmit}>
            <div className='overflow-x-auto'>
              <table className='w-full border-collapse'>
                <thead>
                  <tr
                    style={{
                      backgroundColor: `${colors.primary}05`,
                      borderBottom: `1px solid ${colors.primary}10`,
                    }}
                  >
                    {config.fields.map((field) => (
                      <th
                        key={field.key}
                        className='px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-600'
                      >
                        {field.label} {field.required && "*"}
                      </th>
                    ))}
                    <th className='px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-gray-600 w-12'>
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
                        className='border-b border-gray-100 hover:bg-gray-50/50'
                      >
                        {config.fields.map((field) => (
                          <td key={field.key} className='px-3 py-1.5'>
                            {renderField(field, row)}
                          </td>
                        ))}
                        <td className='px-3 py-1.5 text-center'>
                          {rows.length > 1 && (
                            <button
                              type='button'
                              onClick={() => removeRow(row.id)}
                              className='p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors'
                              title='Remove row'
                            >
                              <Trash2 className='w-4 h-4' />
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
              <div className='mt-3'>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  totalItems={rows.length}
                  itemName={config.itemName}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(newItemsPerPage) => {
                    setItemsPerPage(newItemsPerPage);
                    setCurrentPage(1);
                  }}
                  itemsPerPageOptions={[5, 10, 15, 20]}
                />
              </div>
            )}

            <button
              type='button'
              onClick={addRow}
              className='mt-3 w-full py-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-700'
            >
              <Plus className='w-4 h-4' />
              Add another {config.itemName}
            </button>

            <div
              className='flex justify-end gap-2 pt-3 mt-3 border-t'
              style={{ borderColor: `${colors.primary}10` }}
            >
              <button
                type='button'
                onClick={handleCancel}
                className='px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2 hover:bg-gray-100'
                style={{
                  color: colors.primary,
                  border: "1px solid #E5E7EB",
                }}
              >
                Cancel
              </button>
              <button
                type='submit'
                className='px-4 py-2 text-white rounded-lg transition-all text-sm font-medium flex items-center gap-2 shadow-md'
                style={{ backgroundColor: colors.secondary }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = colors.primary)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = colors.secondary)
                }
              >
                <CheckCircle2 className='w-4 h-4' />
                Add{" "}
                {config.itemName.charAt(0).toUpperCase() +
                  config.itemName.slice(1)}
                s
              </button>
            </div>
          </form>
        </div>

        {/* Save Confirmation Modal */}
        <ConfirmationModal
          isOpen={showSaveConfirmation}
          onClose={() => setShowSaveConfirmation(false)}
          onConfirm={performSave}
          title={config.title}
          message={`Are you sure you want to add ${validRowsCount} ${config.itemName}(s)?`}
          description={`The ${config.itemName}s will be created with the provided information.`}
          confirmText={`Add ${config.itemName.charAt(0).toUpperCase() + config.itemName.slice(1)}s`}
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

        {/* Error Modal */}
        <ErrorModal
          isOpen={errorModal.isOpen}
          onClose={() =>
            setErrorModal({
              isOpen: false,
              message: "",
              details: "",
            })
          }
          title='Validation Error'
          message={errorModal.message}
          details={errorModal.details}
        />
      </div>
    </div>
  );
};

export default BulkAddForm;
