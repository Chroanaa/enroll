import React, { useState } from "react";
import { CreditCard, Calendar, CheckCircle } from "lucide-react";
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
  downPayment: number;
  setDownPayment: (value: number) => void;
  netBalance: number;
  installmentChargePercentage: number;
  insuranceCharge: number;
  totalInstallment: number;
  totalDueCash: number;
  selectedDiscount: Discount | null;
  availableDiscounts: Discount[];
  onDiscountChange: (discount: Discount | null) => void;
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
  downPayment,
  setDownPayment,
  netBalance,
  installmentChargePercentage,
  insuranceCharge,
  totalInstallment,
  totalDueCash,
  selectedDiscount,
  availableDiscounts,
  onDiscountChange,
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
  const [focusedFeeId, setFocusedFeeId] = useState<number | null>(null);
  const [focusedTerm, setFocusedTerm] = useState<string | null>(null);
  const formatNumber = (value: number): string =>
    value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
              className="p-2 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: colors.accent + "15" }}
            >
              <span
                className="w-4 h-4 text-sm font-bold leading-none flex items-center justify-center"
                style={{ color: colors.secondary }}
              >
                ₱
              </span>
            </div>
            <h3
              className="text-lg font-bold tracking-tight"
              style={{ color: colors.primary }}
            >
              Cash Basis
            </h3>
          </div>
          <div className="space-y-3">
            {/* Tuition, Discount, Discounted Price, Net Tuition */}
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
                label: "Discounted Price",
                value: discount,
                setValue: () => {},
                key: "discountedPrice",
                readonly: true,
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
                    <select
                      value={selectedDiscount?.id || ""}
                      onChange={(e) => {
                        const discountId = e.target.value;
                        if (!discountId) {
                          onDiscountChange(null);
                        } else {
                          const selected = availableDiscounts.find(d => d.id === Number(discountId));
                          onDiscountChange(selected || null);
                        }
                      }}
                      disabled={isLoadingDiscounts}
                      className="px-3 py-2 rounded-lg border text-sm bg-white min-w-[200px]"
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
                    >
                      <option value="">No Discount</option>
                      {availableDiscounts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.percentage}% - {d.code} ({d.name})
                        </option>
                      ))}
                    </select>
                    {isLoadingDiscounts && (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: colors.secondary }} />
                    )}
                  </div>
                ) : (
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-semibold pointer-events-none select-none" style={{ color: colors.tertiary }}>₱</span>
                    <input
                      type="text"
                      value={formatNumber(item.value || 0)}
                      onChange={(e) =>
                        !item.readonly &&
                        item.setValue(parseFloat(e.target.value.replace(/,/g, '')) || 0)
                      }
                      readOnly={item.readonly}
                      className="w-36 pl-7 pr-3 py-2 rounded-lg border text-right text-sm bg-white/50"
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
                  </div>
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
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-semibold pointer-events-none select-none" style={{ color: colors.tertiary }}>₱</span>
                  <input
                    type="text"
                    value={formatNumber(labFeeTotal)}
                    readOnly
                    className="w-36 pl-7 pr-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                    style={{
                      borderColor: colors.tertiary + "30",
                      color: colors.primary,
                    }}
                    placeholder="0.00"
                  />
                </div>
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
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-semibold pointer-events-none select-none" style={{ color: colors.tertiary }}>₱</span>
                  <input
                    type="text"
                    value={formatNumber(subject.fixedAmount || 0)}
                    readOnly
                    className="w-36 pl-7 pr-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                    style={{
                      borderColor: colors.tertiary + "30",
                      color: colors.primary,
                    }}
                    placeholder="0.00"
                  />
                </div>
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
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-semibold pointer-events-none select-none" style={{ color: colors.tertiary }}>₱</span>
                    <input
                      type="text"
                      value={focusedFeeId === fee.id ? (dynamicFees[fee.id]?.toString() || "") : formatNumber(dynamicFees[fee.id] || 0)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/,/g, '');
                        setDynamicFees((prev) => ({
                          ...prev,
                          [fee.id]: parseFloat(raw) || 0,
                        }));
                      }}
                      className="w-36 pl-7 pr-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                      style={{
                        borderColor: colors.tertiary + "30",
                        color: colors.primary,
                      }}
                      onFocus={(e) => {
                        setFocusedFeeId(fee.id);
                        e.currentTarget.style.borderColor = colors.secondary;
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                      }}
                      onBlur={(e) => {
                        setFocusedFeeId(null);
                        e.currentTarget.style.borderColor =
                          colors.tertiary + "30";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      placeholder="0.00"
                    />
                  </div>
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
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-semibold pointer-events-none select-none" style={{ color: colors.secondary }}>₱</span>
                <input
                  type="text"
                  value={formatNumber(baseTotal)}
                  readOnly
                  className="w-36 pl-7 pr-3 py-2 rounded-lg border text-right text-sm bg-white/50"
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
            {/* Base Total */}
            <div
              className="flex justify-between items-center py-2 px-3 rounded-lg border"
              style={{ borderColor: colors.accent + "10", backgroundColor: "transparent" }}
            >
              <span className="text-sm font-medium" style={{ color: colors.primary }}>Base Total</span>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-semibold pointer-events-none select-none" style={{ color: colors.tertiary }}>₱</span>
                <input type="text" value={formatNumber(baseTotal)} readOnly
                  className="w-36 pl-7 pr-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                  style={{ borderColor: colors.tertiary + "30", color: colors.primary }}
                  placeholder="0.00" />
              </div>
            </div>

            {/* Down Payment - editable */}
            <div
              className="flex justify-between items-center py-2 px-3 rounded-lg border"
              style={{ borderColor: colors.secondary + "30", backgroundColor: colors.accent + "05" }}
            >
              <span className="text-sm font-medium" style={{ color: colors.primary }}>Down Payment</span>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-semibold pointer-events-none select-none" style={{ color: colors.tertiary }}>₱</span>
                <input
                  type="text"
                  value={focusedFeeId === -1 ? (downPayment?.toString() || "") : formatNumber(downPayment || 0)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, '');
                    setDownPayment(parseFloat(raw) || 0);
                  }}
                  className="w-36 pl-7 pr-3 py-2 rounded-lg border text-right text-sm bg-white"
                  style={{ borderColor: colors.secondary + "50", color: colors.primary }}
                  onFocus={(e) => {
                    setFocusedFeeId(-1);
                    e.currentTarget.style.borderColor = colors.secondary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                  }}
                  onBlur={(e) => {
                    setFocusedFeeId(null);
                    e.currentTarget.style.borderColor = colors.secondary + "50";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Net Balance, Ins. C., Total Ins. */}
            {[
              {
                label: "Net Balance",
                value: netBalance,
                key: "netBalance",
              },
              {
                label: `${installmentChargePercentage}% Ins. C.`,
                value: insuranceCharge,
                key: "insurance",
              },
              {
                label: "Total Ins.",
                value: totalInstallment,
                key: "totalInstallment",
                highlight: true,
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex justify-between items-center py-2 px-3 rounded-lg border"
                style={{
                  borderColor: item.highlight ? colors.secondary + "30" : colors.accent + "10",
                  backgroundColor: item.highlight ? colors.accent + "08" : "transparent",
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{ color: item.highlight ? colors.secondary : colors.primary }}
                >
                  {item.label}
                </span>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-semibold pointer-events-none select-none" style={{ color: item.highlight ? colors.secondary : colors.tertiary }}>₱</span>
                  <input
                    type="text"
                    value={formatNumber(item.value || 0)}
                    readOnly
                    className="w-36 pl-7 pr-3 py-2 rounded-lg border text-right text-sm bg-white/50"
                    style={{
                      borderColor: item.highlight ? colors.secondary + "30" : colors.tertiary + "30",
                      color: item.highlight ? colors.secondary : colors.primary,
                      fontWeight: item.highlight ? "bold" : "normal",
                    }}
                    placeholder="0.00"
                  />
                </div>
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
                            <div className="relative flex items-center">
                              <span className="absolute left-2 text-xs font-semibold pointer-events-none select-none" style={{ color: colors.tertiary }}>₱</span>
                              <input
                                type="text"
                                value={focusedTerm === item.term ? (item.amount?.toString() || "") : formatNumber(item.amount || 0)}
                                onChange={(e) =>
                                  item.setAmount(parseFloat(e.target.value.replace(/,/g, '')) || 0)
                                }
                                className="w-full border-none outline-none bg-transparent text-right text-sm rounded-lg pl-6 pr-2 py-1 hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all"
                                style={{ color: colors.primary }}
                                onFocus={(e) => {
                                  setFocusedTerm(item.term);
                                  e.currentTarget.style.backgroundColor = "white";
                                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.secondary}10`;
                                }}
                                onBlur={(e) => {
                                  setFocusedTerm(null);
                                  e.currentTarget.style.backgroundColor =
                                    "transparent";
                                  e.currentTarget.style.boxShadow = "none";
                                }}
                                placeholder="0.00"
                              />
                            </div>
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
              <span className="text-sm font-semibold" style={{ color: colors.primary }}>₱{formatNumber(tuition)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium" style={{ color: colors.primary }}>Discount:</span>
              <span className="text-sm font-semibold" style={{ color: colors.secondary }}>-₱{formatNumber(discount)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium" style={{ color: colors.primary }}>Net Tuition:</span>
              <span className="text-sm font-semibold" style={{ color: colors.primary }}>₱{formatNumber(netTuition)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium" style={{ color: colors.primary }}>Dynamic Fees:</span>
              <span className="text-sm font-semibold" style={{ color: colors.primary }}>₱{formatNumber(totalFees)}</span>
            </div>
            {fixedAmountTotal > 0 && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium" style={{ color: colors.primary }}>Additional Fees:</span>
                <span className="text-sm font-semibold" style={{ color: colors.primary }}>₱{formatNumber(fixedAmountTotal)}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2" style={{ borderColor: colors.accent + "20" }}>
              <div className="flex justify-between items-center py-2">
                <span className="text-base font-bold" style={{ color: colors.secondary }}>
                  {paymentMode === 'cash' ? 'TOTAL DUE (Cash):' : 'TOTAL DUE (Installment):'}
                </span>
                <span className="text-lg font-bold" style={{ color: colors.secondary }}>
                  ₱{paymentMode === 'cash' ? formatNumber(totalDueCash) : formatNumber(totalInstallment)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


