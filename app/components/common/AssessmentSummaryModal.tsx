"use client";
import React, { useState, useRef } from "react";
import { X, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { colors } from "../../colors";

export interface SummaryFee {
  id: number;
  name: string;
  category: string;
  amount: number;
}

export interface Discount {
  id: number;
  code: string;
  name: string;
  percentage: number;
}

export interface AssessmentSummaryData {
  // Student Info
  studentName: string;
  studentNumber: string;
  academicYear: string;
  semester: string;
  
  // Tuition Breakdown
  totalUnits: number;
  tuitionPerUnit: number;
  grossTuition: number;
  discount: Discount | null;
  discountAmount: number;
  netTuition: number;
  
  // Fees
  fees: SummaryFee[];
  totalFees: number;
  fixedAmountTotal: number;
  
  // Payment
  paymentMode: 'cash' | 'installment';
  totalDueCash: number;
  insuranceAmount: number;
  totalInstallment: number;
  baseTotal: number;
}

interface AssessmentSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AssessmentSummaryData | null;
  isLoading?: boolean;
  onConfirm: () => Promise<void>;
  canSave?: boolean;
  isSaved?: boolean; // New prop to show saved state
}

const AssessmentSummaryModal: React.FC<AssessmentSummaryModalProps> = ({
  isOpen,
  onClose,
  data,
  isLoading = false,
  onConfirm,
  canSave = true,
  isSaved = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    // Prevent multiple clicks
    if (isProcessing || isLoading || !canSave || isSaved) {
      return;
    }

    setIsProcessing(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error("Error in handleConfirm:", error);
    } finally {
      // Don't reset isProcessing if save was successful (isSaved will be true)
      if (!isSaved) {
        setIsProcessing(false);
      }
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (!data) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      >
        <div
          className="rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
          style={{ backgroundColor: "white" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 text-center">
            <p className="text-gray-600">No assessment data available</p>
          </div>
        </div>
      </div>
    );
  }

  const isDisabled = isLoading || isProcessing || !canSave || isSaved;
  const additionalFeesTotal = data.totalFees + data.fixedAmountTotal;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-2xl my-4 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
        style={{ backgroundColor: "white" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-3 flex items-center justify-between border-b"
          style={{
            backgroundColor: colors.accent + "05",
            borderColor: colors.accent + "20",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-lg"
              style={{ backgroundColor: colors.accent + "15" }}
            >
              <FileText className="w-5 h-5" style={{ color: colors.secondary }} />
            </div>
            <div>
              <h2
                className="text-lg font-bold"
                style={{ color: colors.primary }}
              >
                Assessment Summary
              </h2>
              <p className="text-xs" style={{ color: colors.tertiary }}>
                Review assessment details before saving
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDisabled}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content - Compact Layout */}
        <div className="p-5 overflow-y-auto" style={{ maxHeight: "calc(80vh - 140px)" }}>
          {/* Student & Academic Info - Single Row */}
          <div className="mb-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-semibold" style={{ color: colors.primary }}>
                Student:
              </span>
              <span style={{ color: colors.primary }}>{data.studentName || "N/A"}</span>
              <span className="text-gray-400">|</span>
              <span className="font-semibold" style={{ color: colors.primary }}>
                AY:
              </span>
              <span style={{ color: colors.primary }}>{data.academicYear || "N/A"}</span>
              <span className="text-gray-400">|</span>
              <span className="font-semibold" style={{ color: colors.primary }}>
                Sem:
              </span>
              <span style={{ color: colors.primary }}>{data.semester || "N/A"}</span>
              <span className="text-gray-400">|</span>
              <span className="font-semibold" style={{ color: colors.primary }}>
                Units:
              </span>
              <span style={{ color: colors.primary }}>{data.totalUnits}</span>
            </div>
          </div>

          {/* Financial Breakdown - Combined Table */}
          <div className="mb-4">
            <h3 className="text-sm font-bold mb-2" style={{ color: colors.primary }}>
              Financial Breakdown
            </h3>
            <div
              className="p-3 rounded-lg border"
              style={{
                borderColor: colors.accent + "20",
                backgroundColor: "white",
              }}
            >
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span style={{ color: colors.primary }}>Gross Tuition</span>
                  <span className="font-semibold" style={{ color: colors.primary }}>
                    {formatCurrency(data.grossTuition)}
                  </span>
                </div>
                {data.discount && (
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.primary }}>
                      Discount ({data.discount.percentage}% - {data.discount.code})
                    </span>
                    <span className="font-semibold" style={{ color: colors.secondary }}>
                      -{formatCurrency(data.discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span style={{ color: colors.primary }}>Net Tuition</span>
                  <span className="font-semibold" style={{ color: colors.primary }}>
                    {formatCurrency(data.netTuition)}
                  </span>
                </div>
                {data.fees.length > 0 && (
                  <>
                    {data.fees.map((fee) => (
                      <div key={fee.id} className="flex justify-between items-center">
                        <span style={{ color: colors.primary }}>{fee.name}</span>
                        <span className="font-semibold" style={{ color: colors.primary }}>
                          {formatCurrency(fee.amount)}
                        </span>
                      </div>
                    ))}
                  </>
                )}
                {data.fixedAmountTotal > 0 && (
                  <div className="flex justify-between items-center">
                    <span style={{ color: colors.primary }}>Additional Fees</span>
                    <span className="font-semibold" style={{ color: colors.primary }}>
                      {formatCurrency(data.fixedAmountTotal)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-1.5 mt-1.5" style={{ borderColor: colors.accent + "20" }}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold" style={{ color: colors.primary }}>Base Total</span>
                    <span className="font-bold" style={{ color: colors.secondary }}>
                      {formatCurrency(data.baseTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary - Compact */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-semibold" style={{ color: colors.primary }}>
                Payment Mode:
              </span>
              <span className="text-sm px-2 py-0.5 rounded" style={{ 
                backgroundColor: colors.accent + "15",
                color: colors.secondary 
              }}>
                {data.paymentMode === 'cash' ? 'Cash' : 'Installment'}
              </span>
            </div>
            {data.paymentMode === 'cash' ? (
              <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: colors.secondary + "30" }}>
                <span className="text-base font-bold" style={{ color: colors.secondary }}>
                  TOTAL AMOUNT DUE
                </span>
                <span className="text-lg font-bold" style={{ color: colors.secondary }}>
                  {formatCurrency(data.totalDueCash)}
                </span>
              </div>
            ) : (
              <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: colors.accent + "20" }}>
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: colors.primary }}>Insurance (5%)</span>
                  <span className="font-semibold" style={{ color: colors.primary }}>
                    {formatCurrency(data.insuranceAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t" style={{ borderColor: colors.secondary + "30" }}>
                  <span className="text-base font-bold" style={{ color: colors.secondary }}>
                    TOTAL INSTALLMENT
                  </span>
                  <span className="text-lg font-bold" style={{ color: colors.secondary }}>
                    {formatCurrency(data.totalInstallment)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Saved State Indicator */}
          {isSaved && (
            <div className="mt-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: "#D1FAE5" }}>
              <CheckCircle2 className="w-5 h-5" style={{ color: "#059669" }} />
              <span className="text-sm font-semibold" style={{ color: "#047857" }}>
                Assessment saved successfully!
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="px-5 py-3 border-t flex justify-end gap-3"
          style={{ borderColor: colors.accent + "20" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isDisabled}
            className="px-5 py-2 rounded-lg border text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: colors.tertiary + "30",
              color: colors.primary,
              backgroundColor: "white",
            }}
            onMouseEnter={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.backgroundColor = colors.accent + "05";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
            }}
          >
            {isSaved ? "Close" : "Cancel"}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={handleConfirm}
            disabled={isDisabled}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: colors.secondary }}
            onMouseEnter={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.opacity = "0.9";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {isLoading || isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Saved
              </>
            ) : (
              "Confirm & Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentSummaryModal;
