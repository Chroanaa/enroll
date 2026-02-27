import React, { useState, useMemo } from "react";
import {
  Receipt,
  CreditCard,
  Wallet,
  Smartphone,
  Building2,
  DollarSign,
  Hash,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { colors } from "../../colors";

export interface PaymentLine {
  id: number;
  payment_type: "cash" | "gcash" | "bank_transfer";
  amount: string;
  reference_no: string;
}

export interface CartStudent {
  assessment_id: number;
  student_number: string;
  student_name: string;
  course_program: string | null;
  remaining_balance: number;
  amount_to_pay: number;
}

interface StudentPaymentCheckoutModalProps {
  isOpen: boolean;
  cartStudents: CartStudent[];
  onClose: () => void;
  onCheckout: (paymentLines: PaymentLine[]) => Promise<void>;
  formatAmount: (amount: number | null | undefined) => string;
  isProcessing?: boolean;
}

export const StudentPaymentCheckoutModal: React.FC<
  StudentPaymentCheckoutModalProps
> = ({
  isOpen,
  cartStudents,
  onClose,
  onCheckout,
  formatAmount,
  isProcessing = false,
}) => {
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([
    { id: 1, payment_type: "cash", amount: "", reference_no: "" },
  ]);

  const totalCartAmount = useMemo(() => {
    return cartStudents.reduce((sum, s) => sum + s.amount_to_pay, 0);
  }, [cartStudents]);

  const totalPayments = useMemo(() => {
    return paymentLines.reduce(
      (sum, line) => sum + (parseFloat(line.amount) || 0),
      0,
    );
  }, [paymentLines]);

  const remainingToPay = useMemo(() => {
    return Math.max(0, totalCartAmount - totalPayments);
  }, [totalCartAmount, totalPayments]);

  const changeAmount = useMemo(() => {
    return Math.max(0, totalPayments - totalCartAmount);
  }, [totalPayments, totalCartAmount]);

  const addPaymentLine = () => {
    const maxId = Math.max(...paymentLines.map((l) => l.id), 0);
    setPaymentLines([
      ...paymentLines,
      { id: maxId + 1, payment_type: "cash", amount: "", reference_no: "" },
    ]);
  };

  const removePaymentLine = (id: number) => {
    if (paymentLines.length <= 1) return;
    setPaymentLines(paymentLines.filter((l) => l.id !== id));
  };

  const updatePaymentLine = (
    id: number,
    field: keyof PaymentLine,
    value: string,
  ) => {
    setPaymentLines(
      paymentLines.map((line) =>
        line.id === id ? { ...line, [field]: value } : line,
      ),
    );
  };

  const isValid = useMemo(() => {
    if (paymentLines.length === 0) return false;
    if (totalPayments < totalCartAmount - 0.01) return false;

    return paymentLines.every((line) => {
      const amount = parseFloat(line.amount);
      if (!amount || amount <= 0) return false;
      if (
        (line.payment_type === "gcash" ||
          line.payment_type === "bank_transfer") &&
        !line.reference_no.trim()
      ) {
        return false;
      }
      return true;
    });
  }, [paymentLines, totalPayments, totalCartAmount]);

  const handleCheckout = async () => {
    if (!isValid) return;
    await onCheckout(paymentLines);
    // Reset
    setPaymentLines([
      { id: 1, payment_type: "cash", amount: "", reference_no: "" },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className='rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200'
        style={{ backgroundColor: "white" }}
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
              style={{ backgroundColor: `${colors.secondary}20` }}
            >
              <Receipt
                className='w-5 h-5'
                style={{ color: colors.secondary }}
              />
            </div>
            <div>
              <h2
                className='text-xl font-bold'
                style={{ color: colors.primary }}
              >
                Payment Checkout
              </h2>
              <p className='text-sm text-gray-500'>
                {cartStudents.length} student(s) selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Body */}
        <div className='p-6 overflow-y-auto space-y-6'>
          {/* Students Summary */}
          <div className='bg-gray-50 rounded-lg p-4'>
            <h3 className='font-medium text-gray-900 mb-3'>Students to Pay</h3>
            <div className='space-y-2 max-h-40 overflow-y-auto'>
              {cartStudents.map((student) => (
                <div
                  key={student.assessment_id}
                  className='flex justify-between text-sm'
                >
                  <div>
                    <span className='text-gray-600 font-medium'>
                      {student.student_number}
                    </span>
                    <span className='text-gray-500 ml-2'>
                      {student.student_name}
                    </span>
                  </div>
                  <span
                    className='font-medium'
                    style={{ color: colors.secondary }}
                  >
                    {formatAmount(student.amount_to_pay)}
                  </span>
                </div>
              ))}
            </div>
            <div className='border-t border-gray-200 mt-3 pt-3 flex justify-between'>
              <span className='font-bold' style={{ color: colors.primary }}>
                Total Amount Due
              </span>
              <span
                className='font-bold text-lg'
                style={{ color: colors.secondary }}
              >
                {formatAmount(totalCartAmount)}
              </span>
            </div>
          </div>

          {/* Payment Lines */}
          <div>
            <div className='flex items-center justify-between mb-3'>
              <label className='block text-sm font-medium text-gray-700'>
                <CreditCard className='w-4 h-4 inline mr-1' />
                Payment Method(s)
              </label>
              <button
                type='button'
                onClick={addPaymentLine}
                className='flex items-center gap-1 text-sm px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors'
                style={{ color: colors.secondary }}
              >
                <Plus className='w-3.5 h-3.5' />
                Add Payment
              </button>
            </div>

            <div className='space-y-3'>
              {paymentLines.map((line, index) => (
                <div
                  key={line.id}
                  className='border border-gray-200 rounded-lg p-4 bg-white'
                >
                  <div className='flex items-center justify-between mb-3'>
                    <span className='text-sm font-medium text-gray-500'>
                      Payment #{index + 1}
                    </span>
                    {paymentLines.length > 1 && (
                      <button
                        type='button'
                        onClick={() => removePaymentLine(line.id)}
                        className='text-red-400 hover:text-red-600 p-1'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
                    )}
                  </div>

                  {/* Payment Type Buttons */}
                  <div className='grid grid-cols-3 gap-2 mb-3'>
                    {[
                      {
                        value: "cash",
                        label: "Cash",
                        icon: Wallet,
                        color: "green",
                      },
                      {
                        value: "gcash",
                        label: "GCash",
                        icon: Smartphone,
                        color: "blue",
                      },
                      {
                        value: "bank_transfer",
                        label: "Bank",
                        icon: Building2,
                        color: "purple",
                      },
                    ].map(({ value, label, icon: Icon, color }) => (
                      <button
                        key={value}
                        type='button'
                        onClick={() =>
                          updatePaymentLine(line.id, "payment_type", value)
                        }
                        className={`p-2 rounded-lg border-2 transition-all text-center ${
                          line.payment_type === value
                            ? "border-current"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        style={
                          line.payment_type === value
                            ? {
                                borderColor:
                                  color === "green"
                                    ? "#22c55e"
                                    : color === "blue"
                                      ? "#3b82f6"
                                      : "#a855f7",
                                backgroundColor:
                                  color === "green"
                                    ? "#f0fdf4"
                                    : color === "blue"
                                      ? "#eff6ff"
                                      : "#faf5ff",
                              }
                            : {}
                        }
                      >
                        <Icon
                          className='w-4 h-4 mx-auto mb-0.5'
                          style={{
                            color:
                              line.payment_type === value
                                ? color === "green"
                                  ? "#22c55e"
                                  : color === "blue"
                                    ? "#3b82f6"
                                    : "#a855f7"
                                : "#9ca3af",
                          }}
                        />
                        <span
                          className='text-xs font-medium'
                          style={
                            line.payment_type === value
                              ? {
                                  color:
                                    color === "green"
                                      ? "#15803d"
                                      : color === "blue"
                                        ? "#1d4ed8"
                                        : "#7e22ce",
                                }
                              : { color: "#6b7280" }
                          }
                        >
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Amount & Reference */}
                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label className='block text-xs font-medium text-gray-500 mb-1'>
                        <DollarSign className='w-3 h-3 inline mr-0.5' />
                        Amount
                      </label>
                      <div className='relative'>
                        <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm'>
                          ₱
                        </span>
                        <input
                          type='number'
                          step='0.01'
                          min='0'
                          value={line.amount}
                          onChange={(e) =>
                            updatePaymentLine(line.id, "amount", e.target.value)
                          }
                          placeholder='0.00'
                          className='w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                        />
                      </div>
                    </div>
                    {(line.payment_type === "gcash" ||
                      line.payment_type === "bank_transfer") && (
                      <div>
                        <label className='block text-xs font-medium text-gray-500 mb-1'>
                          <Hash className='w-3 h-3 inline mr-0.5' />
                          Reference No.
                        </label>
                        <input
                          type='text'
                          value={line.reference_no}
                          onChange={(e) =>
                            updatePaymentLine(
                              line.id,
                              "reference_no",
                              e.target.value,
                            )
                          }
                          placeholder='Reference number'
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Summary */}
          <div className='bg-gray-50 rounded-lg p-4 space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Total Amount Due</span>
              <span className='font-medium'>
                {formatAmount(totalCartAmount)}
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Total Payments</span>
              <span className='font-medium text-green-600'>
                {formatAmount(totalPayments)}
              </span>
            </div>
            {remainingToPay > 0.01 && (
              <div className='flex justify-between text-sm'>
                <span className='text-gray-600'>Remaining to Pay</span>
                <span className='font-medium text-red-600'>
                  {formatAmount(remainingToPay)}
                </span>
              </div>
            )}
            {changeAmount > 0.01 && (
              <div className='flex justify-between text-sm border-t border-gray-200 pt-2'>
                <span className='text-gray-600 font-medium'>Change</span>
                <span className='font-bold text-green-600'>
                  {formatAmount(changeAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className='flex gap-3 pt-4 border-t border-gray-200'>
            <button
              type='button'
              onClick={onClose}
              disabled={isProcessing}
              className='flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={handleCheckout}
              disabled={!isValid || isProcessing}
              className='flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50'
              style={{
                backgroundColor:
                  isValid && !isProcessing ? colors.secondary : "#9ca3af",
              }}
            >
              {isProcessing ? "Processing..." : "Complete Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
