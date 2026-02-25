import React from "react";
import { DollarSign, CreditCard, Plus, Calendar, CheckCircle } from "lucide-react";
import { colors } from "../../colors";
import type { Fee, EnrolledSubject } from "./types";

interface Discount {
  id: number;
  code: string;
  name: string;
  percentage: number;
  semester: string;
  status: string;
}

interface PaymentCalculationTabProps {
  tuitionPerUnit: string;
  setTuitionPerUnit: (value: string) => void;
  tuition: number;
  discount: number;
  setDiscount: (value: number) => void;
  netTuition: number;
  fixedAmountTotal: number;
  labFeeTotal: number;
  enrolledSubjects: EnrolledSubject[];
  fees: Fee[];
  dynamicFees: { [key: number]: number };
  setDynamicFees: React.Dispatch<
    React.SetStateAction<{ [key: number]: number }>
  >;
  totalFees: number;
  baseTotal: number;
  paymentMode: 'cash' | 'installment';
  onPaymentModeChange: (mode: 'cash' | 'installment') => void;
  insuranceCharge: number;
  totalInstallment: number;
  totalDueCash: number;
  selectedDiscount: Discount | null;
  onDiscountSelectClick: () => void;
  isLoadingDiscounts?: boolean;
  // Payment Schedule props
  prelimDate: string;
  setPrelimDate: (value: string) => void;
  prelimAmount: number;
  setPrelimAmount: (value: number) => void;
  midtermDate: string;
  setMidtermDate: (value: string) => void;
  midtermAmount: number;
  setMidtermAmount: (value: number) => void;
  finalsDate: string;
  setFinalsDate: (value: string) => void;
  finalsAmount: number;
  setFinalsAmount: (value: number) => void;
  paymentSchedules: Array<{
    id?: number;
    label: string;
    dueDate: string;
    amount: number;
    isPaid?: boolean;
  }>;
  showSummary?: boolean;
}

export const PaymentCalculationTab: React.FC<PaymentCalculationTabProps> = ({
  tuitionPerUnit,
  setTuitionPerUnit,
  tuition,
  discount,
  setDiscount,
  netTuition,
  fixedAmountTotal,
  labFeeTotal,
  enrolledSubjects,
  fees,
  dynamicFees,
  setDynamicFees,
  totalFees,
  baseTotal,
  paymentMode,
  onPaymentModeChange,
  insuranceCharge,
  totalInstallment,
  totalDueCash,
  selectedDiscount,
  onDiscountSelectClick,
  isLoadingDiscounts = false,
  prelimDate,
  setPrelimDate,
  prelimAmount,
  setPrelimAmount,
  midtermDate,
  setMidtermDate,
  midtermAmount,
  setMidtermAmount,
  finalsDate,
  setFinalsDate,
  finalsAmount,
  setFinalsAmount,
  paymentSchedules,
  showSummary = false,
}) => {
  // Filter subjects with fixed amounts
  const fixedAmountSubjects = enrolledSubjects.filter(
    (subject) =>
      subject.fixedAmount !== undefined &&
      subject.fixedAmount !== null &&
      subject.fixedAmount > 0
  );
  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3
            className="text-xl font-bold tracking-tight"
            style={{ color: colors.primary }}
          >
            Payment Calculation
          </h3>
          <p
            className="text-sm mt-1 font-medium"
            style={{ color: colors.tertiary }}
          >
            Calculate and manage student fees
          </p>
        </div>
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-xl border"
          style={{
            backgroundColor: colors.accent + "05",
            borderColor: colors.accent + "10",
          }}
        >
          <span
            className="text-sm font-semibold"
            style={{ color: colors.primary }}
          >
            Tuition Fee Per Unit:
          </span>
          <input
            type="text"
            value={tuitionPerUnit}
            onChange={(e) => setTuitionPerUnit(e.target.value)}
            className="px-3 py-1 rounded-lg border text-center w-24 bg-white"
            style={{
              borderColor: colors.tertiary + "30",
              color: colors.primary,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.secondary;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.tertiary + "30";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      {/* Payment Mode Selection */}
      <div className="mb-6 p-4 rounded-xl border" style={{ borderColor: colors.accent + "20", backgroundColor: "white" }}>
        <label className="block text-sm font-semibold mb-3" style={{ color: colors.primary }}>
          Payment Mode
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="paymentMode"
              value="cash"
              checked={paymentMode === 'cash'}
              onChange={() => onPaymentModeChange('cash')}
              className="w-4 h-4"
              style={{ accentColor: colors.secondary }}
            />
            <span className="text-sm font-medium" style={{ color: colors.primary }}>Cash Basis</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="paymentMode"
              value="installment"
              checked={paymentMode === 'installment'}
              onChange={() => onPaymentModeChange('installment')}
              className="w-4 h-4"
              style={{ accentColor: colors.secondary }}
            />
            <span className="text-sm font-medium" style={{ color: colors.primary }}>Installment Basis</span>
          </label>
        </div>
      </div>

      {/* Payment Breakdown - Two Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cash Basis */}
        <div
          className="p-5 rounded-xl border shadow-sm"
          style={{
            borderColor: colors.accent + "20",
            backgroundColor: "white",
          }}
        >
          <div
            className="flex items-center gap-3 mb-5 pb-3 border-b"
            style={{ borderColor: colors.accent + "10" }}
          >
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.accent + "15" }}
            >
              <DollarSign
                className="w-4 h-4"
                style={{ color: colors.secondary }}
              />
            </div>
            <h3
              className="text-lg font-bold tracking-tight"
              style={{ color: colors.primary }}
            >
              Cash Basis
            </h3>
          </div>
          <div className="space-y-3">
            {/* Tuition, Discount, Net Tuition */}
            {[
              {
                label: "Tuition",
                value: tuition,
                setValue: () => {},
                key: "tuition",
                readonly: true,
              },
              {
                label: "Discount",
                value: discount,
                setValue: setDiscount,
                key: "discount",
                isDiscount: true,
              },
              {
                label: "Net Tuition",
                value: netTuition,
                setValue: () => {},
                key: "netTuition",
                readonly: true,
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex justify-between items-center py-2 px-3 rounded-lg border"
                style={{
                  borderColor: colors.accent + "10",
                  backgroundColor: "transparent",
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{ color: colors.primary }}
                >
                  {item.label}
                </span>
                {item.isDiscount ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="px-3 py-2 rounded-lg border text-right text-sm bg-white/50 min-w-[128px]"
                      style={{
                        borderColor: colors.tertiary + "30",
                        color: colors.primary,
                      }}
                    >
                      {selectedDiscount
                        ? `${selectedDiscount.percentage}% - ${selectedDiscount.code} (${selectedDiscount.name})`
                        : "None Selected"}
                    </div>
                    <button
                      onClick={onDiscountSelectClick}
                      disabled={isLoadingDiscounts}
                      className="p-2 rounded-lg border hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative"
                      style={{
                        borderColor: colors.secondary + "30",
                        color: colors.secondary,
                      }}
                      title="Select Discount"
                    >
                      {isLoadingDiscounts ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ) : (
                  <input
                    type="number"
                    value={item.value || ""}
                    onChange={(e) =>
                      !item.readonly &&
                      item.setValue(parseFloat(e.target.value) || 0)
                    }
                    readOnly={item.readonly}
                    className="w-32 px-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                    style={{
                      borderColor: colors.tertiary + "30",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      if (!item.readonly) {
                        e.currentTarget.style.borderColor = colors.secondary;
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                      }
                    }}
                    onBlur={(e) => {
                      if (!item.readonly) {
                        e.currentTarget.style.borderColor =
                          colors.tertiary + "30";
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                    placeholder="0.00"
                  />
                )}
              </div>
            ))}

            {/* LAB Fee Row - units_lab * 1000, separate from tuition */}
            {labFeeTotal > 0 && (
              <div
                className="flex justify-between items-center py-2 px-3 rounded-lg border"
                style={{
                  borderColor: colors.accent + "10",
                  backgroundColor: "transparent",
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{ color: colors.primary }}
                >
                  LAB
                </span>
                <input
                  type="number"
                  value={labFeeTotal || ""}
                  readOnly
                  className="w-32 px-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                  style={{
                    borderColor: colors.tertiary + "30",
                    color: colors.primary,
                  }}
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Fixed Amount Subjects - Individual List */}
            {fixedAmountSubjects.map((subject) => (              <div
                key={subject.id}
                className="flex justify-between items-center py-2 px-3 rounded-lg border"
                style={{
                  borderColor: colors.accent + "10",
                  backgroundColor: colors.accent + "05",
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{ color: colors.primary }}
                >
                  {subject.course_code || subject.descriptive_title}
                </span>
                <input
                  type="number"
                  value={subject.fixedAmount || ""}
                  readOnly
                  className="w-32 px-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                  style={{
                    borderColor: colors.tertiary + "30",
                    color: colors.primary,
                  }}
                  placeholder="0.00"
                />
              </div>
            ))}

            {/* Dynamic Fees from Database */}
            {fees
              .filter(
                (fee) =>
                  fee.status?.toLowerCase() === "active"
              )
              .map((fee) => (
                <div
                  key={fee.id}
                  className="flex justify-between items-center py-2 px-3 rounded-lg border"
                  style={{
                    borderColor: colors.accent + "10",
                    backgroundColor: "transparent",
                  }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: colors.primary }}
                  >
                    {fee.name}
                  </span>
                  <input
                    type="number"
                    value={dynamicFees[fee.id] || ""}
                    onChange={(e) => {
                      setDynamicFees((prev) => ({
                        ...prev,
                        [fee.id]: parseFloat(e.target.value) || 0,
                      }));
                    }}
                    className="w-32 px-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                    style={{
                      borderColor: colors.tertiary + "30",
                      color: colors.primary,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor =
                        colors.tertiary + "30";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    placeholder="0.00"
                  />
                </div>
              ))}

            {/* Total Fees */}
            <div
              className="flex justify-between items-center py-2 px-3 rounded-lg border"
              style={{
                borderColor: colors.secondary + "30",
                backgroundColor: colors.accent + "08",
              }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: colors.secondary }}
              >
                Total Fees
              </span>
              <input
                type="number"
                value={totalFees || ""}
                readOnly
                className="w-32 px-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                style={{
                  borderColor: colors.secondary + "30",
                  color: colors.secondary,
                  fontWeight: "bold",
                }}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Installment Basis */}
        <div
          className="p-5 rounded-xl border shadow-sm"
          style={{
            borderColor: colors.accent + "20",
            backgroundColor: "white",
          }}
        >
          <div
            className="flex items-center gap-3 mb-5 pb-3 border-b"
            style={{ borderColor: colors.accent + "10" }}
          >
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.accent + "15" }}
            >
              <CreditCard
                className="w-4 h-4"
                style={{ color: colors.secondary }}
              />
            </div>
            <h3
              className="text-lg font-bold tracking-tight"
              style={{ color: colors.primary }}
            >
              Installment Basis
            </h3>
          </div>
          <div className="space-y-3">
            {[
              {
                label: "Base Total",
                value: baseTotal,
                setValue: () => {},
                key: "baseTotal",
                readonly: true,
              },
              {
                label: "5% Ins. C.",
                value: insuranceCharge,
                setValue: () => {},
                key: "insurance",
                readonly: true,
              },
              {
                label: "Total Ins.",
                value: totalInstallment,
                setValue: () => {},
                key: "totalInstallment",
                readonly: true,
                highlight: true,
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex justify-between items-center py-2 px-3 rounded-lg border"
                style={{
                  borderColor: item.highlight
                    ? colors.secondary + "30"
                    : colors.accent + "10",
                  backgroundColor: item.highlight
                    ? colors.accent + "08"
                    : "transparent",
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{
                    color: item.highlight ? colors.secondary : colors.primary,
                  }}
                >
                  {item.label}
                </span>
                <input
                  type="number"
                  value={item.value || ""}
                  onChange={(e) =>
                    !item.readonly &&
                    item.setValue(parseFloat(e.target.value) || 0)
                  }
                  readOnly={item.readonly}
                  className="w-32 px-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                  style={{
                    borderColor: item.highlight
                      ? colors.secondary + "30"
                      : colors.tertiary + "30",
                    color: item.highlight ? colors.secondary : colors.primary,
                    fontWeight: item.highlight ? "bold" : "normal",
                  }}
                  onFocus={(e) => {
                    if (!item.readonly) {
                      e.currentTarget.style.borderColor = colors.secondary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                    }
                  }}
                  onBlur={(e) => {
                    if (!item.readonly) {
                      e.currentTarget.style.borderColor =
                        colors.tertiary + "30";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>

          {/* Payment Schedule - Inside Installment Basis section */}
          {paymentMode === 'installment' && (
            <div className="mt-6">
              <div
                className="flex items-center gap-3 mb-4 pb-3 border-b"
                style={{ borderColor: colors.accent + "10" }}
              >
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: colors.accent + "15" }}
                >
                  <Calendar
                    className="w-4 h-4"
                    style={{ color: colors.secondary }}
                  />
                </div>
                <h4
                  className="text-base font-bold tracking-tight"
                  style={{ color: colors.primary }}
                >
                  Payment Schedule
                </h4>
              </div>
              <div
                className="border rounded-xl overflow-hidden"
                style={{ borderColor: colors.accent + "20" }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: colors.accent + "08" }}>
                      <th
                        className="px-4 py-3 text-left border-r font-semibold"
                        style={{
                          borderColor: colors.accent + "20",
                          color: colors.primary,
                        }}
                      >
                        Term
                      </th>
                      <th
                        className="px-4 py-3 text-left border-r font-semibold"
                        style={{
                          borderColor: colors.accent + "20",
                          color: colors.primary,
                        }}
                      >
                        Date
                      </th>
                      <th
                        className="px-4 py-3 text-left border-r font-semibold"
                        style={{
                          borderColor: colors.accent + "20",
                          color: colors.primary,
                        }}
                      >
                        Amount
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold"
                        style={{ color: colors.primary }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        term: "PRELIM",
                        date: prelimDate,
                        setDate: setPrelimDate,
                        amount: prelimAmount,
                        setAmount: setPrelimAmount,
                      },
                      {
                        term: "MIDTERM",
                        date: midtermDate,
                        setDate: setMidtermDate,
                        amount: midtermAmount,
                        setAmount: setMidtermAmount,
                      },
                      {
                        term: "FINALS",
                        date: finalsDate,
                        setDate: setFinalsDate,
                        amount: finalsAmount,
                        setAmount: setFinalsAmount,
                      },
                    ].map((item) => {
                      // Find if this schedule item is paid from paymentSchedules
                      const scheduleItem = paymentSchedules.find(
                        (s) => s.label === item.term
                      );
                      const isPaid = scheduleItem?.isPaid || false;

                      return (
                        <tr
                          key={item.term}
                          className="border-b hover:bg-white/50 transition-colors"
                          style={{ borderColor: colors.accent + "10" }}
                        >
                          <td
                            className="px-4 py-3 border-r font-semibold"
                            style={{
                              borderColor: colors.accent + "20",
                              color: colors.secondary,
                            }}
                          >
                            {item.term}
                          </td>
                          <td
                            className="px-4 py-3 border-r"
                            style={{ borderColor: colors.accent + "20" }}
                          >
                            <input
                              type="date"
                              value={item.date}
                              onChange={(e) => item.setDate(e.target.value)}
                              className="w-full border-none outline-none bg-transparent text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                              style={{ color: colors.primary }}
                              onFocus={(e) => {
                                e.currentTarget.style.backgroundColor = "white";
                                e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            />
                          </td>
                          <td
                            className="px-4 py-3 border-r"
                            style={{ borderColor: colors.accent + "20" }}
                          >
                            <input
                              type="number"
                              value={item.amount || ""}
                              onChange={(e) =>
                                item.setAmount(parseFloat(e.target.value) || 0)
                              }
                              className="w-full border-none outline-none bg-transparent text-right text-sm rounded-lg px-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                              style={{ color: colors.primary }}
                              onFocus={(e) => {
                                e.currentTarget.style.backgroundColor = "white";
                                e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-4 py-3">
                            {isPaid ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle
                                  className="w-4 h-4"
                                  style={{ color: "#10b981" }}
                                />
                                <span
                                  className="text-xs font-semibold"
                                  style={{ color: "#10b981" }}
                                >
                                  Paid
                                </span>
                              </div>
                            ) : (
                              <span
                                className="text-xs font-medium"
                                style={{ color: colors.tertiary }}
                              >
                                Unpaid
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Card - Only show after save */}
      {showSummary && (
        <div className="mt-6 p-5 rounded-xl border shadow-sm" style={{ borderColor: colors.secondary + "30", backgroundColor: colors.accent + "05" }}>
          <h4 className="text-lg font-bold mb-4" style={{ color: colors.primary }}>Summary</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium" style={{ color: colors.primary }}>Gross Tuition:</span>
              <span className="text-sm font-semibold" style={{ color: colors.primary }}>₱{tuition.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium" style={{ color: colors.primary }}>Discount:</span>
              <span className="text-sm font-semibold" style={{ color: colors.secondary }}>-₱{discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium" style={{ color: colors.primary }}>Net Tuition:</span>
              <span className="text-sm font-semibold" style={{ color: colors.primary }}>₱{netTuition.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium" style={{ color: colors.primary }}>Dynamic Fees:</span>
              <span className="text-sm font-semibold" style={{ color: colors.primary }}>₱{totalFees.toFixed(2)}</span>
            </div>
            {fixedAmountTotal > 0 && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium" style={{ color: colors.primary }}>Additional Fees:</span>
                <span className="text-sm font-semibold" style={{ color: colors.primary }}>₱{fixedAmountTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2" style={{ borderColor: colors.accent + "20" }}>
              <div className="flex justify-between items-center py-2">
                <span className="text-base font-bold" style={{ color: colors.secondary }}>
                  {paymentMode === 'cash' ? 'TOTAL DUE (Cash):' : 'TOTAL DUE (Installment):'}
                </span>
                <span className="text-lg font-bold" style={{ color: colors.secondary }}>
                  ₱{paymentMode === 'cash' ? totalDueCash.toFixed(2) : totalInstallment.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


