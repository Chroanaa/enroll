import React from "react";
import { DollarSign, CreditCard } from "lucide-react";
import { colors } from "../../colors";
import type { Fee } from "./types";

interface PaymentCalculationTabProps {
  tuitionPerUnit: string;
  setTuitionPerUnit: (value: string) => void;
  tuition: number;
  discount: number;
  setDiscount: (value: number) => void;
  netTuition: number;
  fees: Fee[];
  dynamicFees: { [key: number]: number };
  setDynamicFees: React.Dispatch<
    React.SetStateAction<{ [key: number]: number }>
  >;
  totalFees: number;
  downPayment: number;
  setDownPayment: (value: number) => void;
  net: number;
  insuranceCharge: number;
  totalInstallment: number;
}

export const PaymentCalculationTab: React.FC<PaymentCalculationTabProps> = ({
  tuitionPerUnit,
  setTuitionPerUnit,
  tuition,
  discount,
  setDiscount,
  netTuition,
  fees,
  dynamicFees,
  setDynamicFees,
  totalFees,
  downPayment,
  setDownPayment,
  net,
  insuranceCharge,
  totalInstallment,
}) => {
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
                label: "Total Fees",
                value: totalFees,
                setValue: () => {},
                key: "totalFeesInst",
                readonly: true,
              },
              {
                label: "D. Payment",
                value: downPayment,
                setValue: setDownPayment,
                key: "downPayment",
              },
              {
                label: "Net",
                value: net,
                setValue: () => {},
                key: "net",
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
        </div>
      </div>
    </div>
  );
};


