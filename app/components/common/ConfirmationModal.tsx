"use client";
import React from "react";
import { X, AlertTriangle, AlertCircle, CheckCircle2, Info, Trash2 } from "lucide-react";
import { colors } from "../../colors";



export type ConfirmationVariant = "danger" | "warning" | "info" | "success";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationVariant;
  icon?: React.ReactNode;
  isLoading?: boolean;
  customContent?: React.ReactNode; // For injecting custom content (e.g., discount selection)
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  confirmText,
  cancelText = "Cancel",
  variant = "danger",
  icon,
  isLoading = false,
  customContent,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          iconBg: "#FEE2E2",
          iconColor: "#DC2626",
          confirmBg: "#DC2626",
          confirmHover: "#B91C1C",
          defaultIcon: <Trash2 className='w-6 h-6' />,
        };
      case "warning":
        return {
          iconBg: "#FEF3C7",
          iconColor: "#D97706",
          confirmBg: "#D97706",
          confirmHover: "#B45309",
          defaultIcon: <AlertTriangle className='w-6 h-6' />,
        };
      case "info":
        return {
          iconBg: "#DBEAFE",
          iconColor: "#2563EB",
          confirmBg: "#2563EB",
          confirmHover: "#1D4ED8",
          defaultIcon: <Info className='w-6 h-6' />,
        };
      case "success":
        return {
          iconBg: "#D1FAE5",
          iconColor: "#059669",
          confirmBg: "#059669",
          confirmHover: "#047857",
          defaultIcon: <CheckCircle2 className='w-6 h-6' />,
        };
      default:
        return {
          iconBg: "#FEE2E2",
          iconColor: "#DC2626",
          confirmBg: "#DC2626",
          confirmHover: "#B91C1C",
          defaultIcon: <AlertCircle className='w-6 h-6' />,
        };
    }
  };

  const getDefaultTitle = () => {
    switch (variant) {
      case "danger":
        return "Confirm Deletion";
      case "warning":
        return "Warning";
      case "info":
        return "Confirm Action";
      case "success":
        return "Confirm";
      default:
        return "Confirm Action";
    }
  };

  const getDefaultConfirmText = () => {
    switch (variant) {
      case "danger":
        return "Delete";
      case "warning":
        return "Continue";
      case "info":
        return "Confirm";
      case "success":
        return "Confirm";
      default:
        return "Confirm";
    }
  };

  const variantStyles = getVariantStyles();
  const displayIcon = icon || variantStyles.defaultIcon;
  const displayTitle = title || getDefaultTitle();
  const displayConfirmText = confirmText || getDefaultConfirmText();

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  return (
    <div
      className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className='rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200'
        style={{
          backgroundColor: "white",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
              style={{
                backgroundColor: variantStyles.iconBg,
              }}
            >
              <div style={{ color: variantStyles.iconColor }}>
                {displayIcon}
              </div>
            </div>
            <div>
              <h2
                className='text-xl font-bold'
                style={{ color: colors.primary }}
              >
                {displayTitle}
              </h2>
              {description && (
                <p className='text-sm text-gray-500'>{description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
            disabled={isLoading}
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Content */}
        <div className='p-6'>
          {customContent ? (
            <div className='mb-6'>{customContent}</div>
          ) : message ? (
            <div className='mb-6'>
              <div
                className='text-base font-medium whitespace-pre-line'
                style={{ color: colors.primary }}
              >
                {(() => {
                  const lines = message.split('\n');
                  const subjectLines: number[] = [];
                  const regularLines: { index: number; line: string }[] = [];
                  
                  // Separate subject lines from regular lines
                  lines.forEach((line, index) => {
                    if (line.trim().startsWith('•')) {
                      subjectLines.push(index);
                    } else {
                      regularLines.push({ index, line });
                    }
                  });
                  
                  return (
                    <>
                      {/* Regular message lines */}
                      {regularLines.map(({ index, line }) => (
                        <p key={index} className={index === 0 ? 'mb-3' : 'mb-2'}>
                          {line}
                        </p>
                      ))}
                      
                      {/* Subject list with scrollable container */}
                      {subjectLines.length > 0 && (
                        <div 
                          className='mt-3 max-h-64 overflow-y-auto pr-2 space-y-1.5'
                          style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: `${variantStyles.iconColor}40 transparent`,
                          }}
                        >
                          {subjectLines.map((lineIndex) => {
                            const line = lines[lineIndex];
                            return (
                              <div
                                key={lineIndex}
                                className='py-1.5 px-3 rounded-lg bg-blue-50 border border-blue-200'
                                style={{ 
                                  backgroundColor: `${variantStyles.iconColor}10`,
                                  borderColor: `${variantStyles.iconColor}30`,
                                }}
                              >
                                <span className='text-sm font-semibold' style={{ color: variantStyles.iconColor }}>
                                  {line.replace('•', '').trim().split(' - ')[0]}
                                </span>
                                <span className='text-sm text-gray-700 ml-2'>
                                  - {line.split(' - ').slice(1).join(' - ')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div
            className='flex justify-end gap-3 pt-4 border-t'
            style={{ borderColor: `${colors.primary}10` }}
          >
            <button
              type='button'
              onClick={onClose}
              disabled={isLoading}
              className='px-6 py-2.5 rounded-xl transition-all font-medium flex items-center gap-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
              style={{
                color: colors.primary,
                border: "1px solid #E5E7EB",
              }}
            >
              {cancelText}
            </button>
            <button
              type='button'
              onClick={handleConfirm}
              disabled={isLoading}
              className='px-6 py-2.5 text-white rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
              style={{
                backgroundColor: isLoading ? "#9CA3AF" : variantStyles.confirmBg,
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = variantStyles.confirmHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = variantStyles.confirmBg;
                }
              }}
            >
              {isLoading ? (
                <>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  Processing...
                </>
              ) : (
                displayConfirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

