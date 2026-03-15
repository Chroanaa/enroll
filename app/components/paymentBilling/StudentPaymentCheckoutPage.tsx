"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Receipt,
  CreditCard,
  Wallet,
  Smartphone,
  Building2,
  DollarSign,
  Hash,
  Plus,
  Trash2,
} from "lucide-react";
import { colors } from "../../colors";
import SuccessModal from "../common/SuccessModal";
import ErrorModal from "../common/ErrorModal";
import { formatAmount } from "./utils";
import { insertIntoReports } from "../../utils/reportsUtils";
import type { CartStudent, PaymentLine } from "./StudentPaymentCheckoutModal";

const STUDENT_PAYMENT_CART_KEY = "student-payment-cart";

const StudentPaymentCheckoutPage: React.FC = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const [cartStudents, setCartStudents] = useState<CartStudent[]>([]);
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([
    { id: 1, payment_type: "cash", amount: "", reference_no: "" },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    message: "",
  });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
    details: "",
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STUDENT_PAYMENT_CART_KEY);
      if (!raw) {
        router.replace("/dashboard?view=payment-billing");
        return;
      }

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        router.replace("/dashboard?view=payment-billing");
        return;
      }

      setCartStudents(parsed as CartStudent[]);
    } catch {
      router.replace("/dashboard?view=payment-billing");
    }
  }, [router]);

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

  const handleBack = () => {
    sessionStorage.setItem("payment-billing-tab", "enrollments");
    router.push("/dashboard?view=payment-billing");
  };

  const handleCheckout = async () => {
    if (!isValid) return;

    setIsProcessing(true);
    try {
      for (const student of cartStudents) {
        const totalAmountToPay = cartStudents.reduce(
          (sum, s) => sum + s.amount_to_pay,
          0,
        );
        const studentProportion = student.amount_to_pay / totalAmountToPay;

        const studentPayments = paymentLines.map((line) => ({
          payment_type: line.payment_type,
          amount:
            Math.round(parseFloat(line.amount) * studentProportion * 100) / 100,
          reference_no: line.reference_no || undefined,
        }));

        const response = await fetch("/api/auth/payment/multi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId: student.assessment_id,
            payments: studentPayments,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              `Failed to process payment for ${student.student_number}`,
          );
        }
      }

      const paymentSummary = paymentLines
        .map((l) => `${l.payment_type}: ${formatAmount(parseFloat(l.amount))}`)
        .join(", ");

      setSuccessModal({
        isOpen: true,
        message: `Payment processed successfully for ${cartStudents.length} student(s)! (${paymentSummary})`,
      });

      insertIntoReports({
        action: `User ${session?.user?.name} processed student payment of ${formatAmount(cartStudents.reduce((sum, s) => sum + s.amount_to_pay, 0))} for ${cartStudents.length} student(s)`,
        user_id: Number(session?.user?.id),
        created_at: new Date(),
      });

      sessionStorage.removeItem(STUDENT_PAYMENT_CART_KEY);
      if (typeof window !== "undefined") {
        localStorage.setItem("student-payment-updated", String(Date.now()));
        sessionStorage.setItem("payment-billing-tab", "enrollments");
      }
      setTimeout(() => {
        router.push("/dashboard?view=payment-billing");
      }, 600);
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: "Payment Failed",
        details: error.message || "Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className='p-4 sm:p-6 min-h-screen'
      style={{ backgroundColor: colors.paper }}
    >
      <div className='max-w-5xl mx-auto w-full space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1
              className='text-2xl font-bold'
              style={{ color: colors.primary }}
            >
              Student Payment Checkout
            </h1>
            <p className='text-sm text-gray-500'>
              Complete financial assessment payments for selected students
            </p>
          </div>
          <button
            onClick={handleBack}
            className='inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50'
          >
            <ArrowLeft className='w-4 h-4' />
            Back to Billing
          </button>
        </div>

        <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6'>
          <div className='bg-gray-50 rounded-lg p-4'>
            <h3 className='font-medium text-gray-900 mb-3'>Students to Pay</h3>
            <div className='space-y-2 max-h-48 overflow-y-auto'>
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
                          style={{
                            color:
                              line.payment_type === value
                                ? color === "green"
                                  ? "#166534"
                                  : color === "blue"
                                    ? "#1d4ed8"
                                    : "#7e22ce"
                                : "#6b7280",
                          }}
                        >
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                    <div>
                      <label className='block text-xs font-medium text-gray-600 mb-1'>
                        <DollarSign className='w-3 h-3 inline mr-1' />
                        Amount
                      </label>
                      <input
                        type='number'
                        step='0.01'
                        min='0.01'
                        value={line.amount}
                        onChange={(e) =>
                          updatePaymentLine(line.id, "amount", e.target.value)
                        }
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        placeholder='0.00'
                      />
                    </div>

                    {(line.payment_type === "gcash" ||
                      line.payment_type === "bank_transfer") && (
                      <div>
                        <label className='block text-xs font-medium text-gray-600 mb-1'>
                          <Hash className='w-3 h-3 inline mr-1' />
                          Reference Number
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
                          className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                          placeholder='Enter reference number'
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className='bg-gray-50 rounded-lg p-4 space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Total Payments</span>
              <span className='font-medium'>{formatAmount(totalPayments)}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600'>Remaining</span>
              <span
                className={`font-medium ${remainingToPay > 0 ? "text-red-600" : "text-green-600"}`}
              >
                {formatAmount(remainingToPay)}
              </span>
            </div>
            {changeAmount > 0 && (
              <div className='flex justify-between text-sm'>
                <span className='text-gray-600'>Change</span>
                <span className='font-medium text-blue-600'>
                  {formatAmount(changeAmount)}
                </span>
              </div>
            )}
          </div>

          <div className='flex gap-3 pt-2'>
            <button
              type='button'
              onClick={handleBack}
              className='flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={handleCheckout}
              disabled={!isValid || isProcessing}
              className='flex-1 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
              style={{ backgroundColor: colors.secondary }}
            >
              <Receipt className='w-4 h-4' />
              {isProcessing ? "Processing..." : "Process Payment"}
            </button>
          </div>
        </div>
      </div>

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: "" })}
        message={successModal.message}
      />

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() =>
          setErrorModal({ isOpen: false, message: "", details: "" })
        }
        message={errorModal.message}
        details={errorModal.details}
      />
    </div>
  );
};

export default StudentPaymentCheckoutPage;
