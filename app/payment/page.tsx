"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { colors } from "../colors";
import {
  CreditCard,
  Upload,
  Loader2,
  CircleCheck,
  AlertTriangle,
  Wallet,
  Clock3,
} from "lucide-react";

type PaymentMethod = {
  id: number;
  name: string;
  receiver_name: string;
  receiver_account: string;
  instructions?: string | null;
  sort_order: number;
};

type PaymentLinkData = {
  token: string;
  student_number: string;
  student_name: string;
  student_email?: string | null;
  assessment_id: number;
  academic_year: string;
  semester: number;
  payment_mode: string;
  total_due: number;
  total_paid: number;
  remaining_balance: number;
  amount_due_now: number;
  min_amount_allowed: number;
  payment_history: Array<{
    id: number;
    amount_paid: number;
    payment_date: string;
    payment_type?: string | null;
    reference_no?: string | null;
  }>;
  pending_submissions: Array<{
    id: number;
    payment_method_name?: string | null;
    amount: number;
    reference_no?: string | null;
    created_at: string;
    status: string;
  }>;
  is_first_installment_payment: boolean;
  configured_downpayment: number;
  fee_breakdown: Array<{
    id: number;
    fee_name: string;
    fee_category: string;
    amount: number;
  }>;
  methods: PaymentMethod[];
};

const formatMoney = (value: number) =>
  `PHP ${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatPaymentDate = (value?: string | null) => {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function PublicPaymentPage() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [data, setData] = useState<PaymentLinkData | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<number | "">("");
  const [referenceNo, setReferenceNo] = useState("");
  const [orNumber, setOrNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState<"paid" | "pending">(
    "paid",
  );

  const fetchPaymentLink = async (options?: { keepFormAmount?: boolean }) => {
    if (!token) {
      setError("Payment link token is missing.");
      setLoading(false);
      return null;
    }

    try {
      const response = await fetch(`/api/payment-link/${encodeURIComponent(token)}`);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Unable to load payment link.");
      }

      const payload = result?.data as PaymentLinkData;
      setData(payload);
      if (!options?.keepFormAmount) {
        setAmount(String(Number(payload.amount_due_now || 0).toFixed(2)));
      }
      if (payload.methods?.length) {
        setPaymentMethodId((current) => current || payload.methods[0].id);
      }
      return payload;
    } catch (err: any) {
      setError(err?.message || "Unable to load payment details.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentLink();
  }, [token]);

  const selectedMethod = useMemo(
    () => data?.methods?.find((m) => m.id === paymentMethodId) || null,
    [data?.methods, paymentMethodId],
  );
  const hasPendingSubmission = (data?.pending_submissions?.length || 0) > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!data) return;
    if (!paymentMethodId) {
      setError("Please choose a payment method.");
      return;
    }
    if (!referenceNo.trim()) {
      setError("Reference number is required.");
      return;
    }
    if (!proof) {
      setError("Payment proof image is required.");
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("token", data.token);
      form.append("payment_method_id", String(paymentMethodId));
      form.append("reference_no", referenceNo.trim());
      form.append("or_number", orNumber.trim());
      form.append("amount", String(numericAmount));
      form.append("proof", proof);

      const response = await fetch("/api/payment-link/submit", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Failed to submit payment proof.");
      }

      setSuccess(
        result?.message ||
          "Payment proof submitted successfully. Please wait for admin verification.",
      );
      setReferenceNo("");
      setOrNumber("");
      setProof(null);
      const refreshed = await fetchPaymentLink({ keepFormAmount: false });
      if ((refreshed?.pending_submissions?.length || 0) > 0) {
        setActiveHistoryTab("pending");
      }
    } catch (err: any) {
      setError(err?.message || "Unable to submit payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className='min-h-screen px-4 py-4 sm:px-6 sm:py-5'
      style={{
        background: `radial-gradient(circle at top left, ${colors.secondary}14 0%, transparent 28%), linear-gradient(180deg, #fffaf5 0%, #f4f7fb 52%, #eef2f7 100%)`,
      }}
    >
      <div className='max-w-6xl mx-auto space-y-3'>
        <div className='rounded-2xl border bg-white/95 shadow-sm px-4 py-2.5'>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-2.5 min-w-0'>
              <img src='/logo.png' alt='School Logo' className='h-8 w-8 object-contain shrink-0' />
              <div className='min-w-0'>
                <p
                  className='text-[10px] font-semibold uppercase tracking-[0.24em] truncate'
                  style={{ color: `${colors.primary}B8` }}
                >
                  COLEGIO DE STA. TERESA DE AVILA
                </p>
                <p className='text-xs text-slate-600 truncate'>
                  Official payment portal
                </p>
              </div>
            </div>

            <div className='flex items-center gap-2 text-xs sm:text-sm'>
              <div className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700'>
                Due: <span style={{ color: colors.secondary }}>{formatMoney(data?.amount_due_now || 0)}</span>
              </div>
              <div
                className='rounded-lg border px-3 py-1.5 font-semibold'
                style={{
                  borderColor: hasPendingSubmission ? "#fcd34d" : `${colors.secondary}22`,
                  backgroundColor: hasPendingSubmission ? "#fffbeb" : "#f8fafc",
                  color: hasPendingSubmission ? "#b45309" : colors.primary,
                }}
              >
                {hasPendingSubmission ? "Pending Approval" : "Ready"}
              </div>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-5 gap-3 items-start'>
        <div
          className='lg:col-span-3 self-start bg-white rounded-[20px] border shadow-sm p-4'
          style={{ borderColor: `${colors.secondary}24` }}
        >
          <div
            className='mb-3 flex items-start justify-between gap-3 border-b border-slate-100 pb-3'
            style={{
              borderColor: `${colors.secondary}28`,
            }}
          >
            <div className='min-w-0'>
              <h1
                className='text-xl sm:text-2xl leading-tight font-black tracking-tight'
                style={{ color: colors.primary }}
              >
                Online Payment Submission
              </h1>
              <p className='text-xs sm:text-sm mt-0.5 text-slate-600'>
                Upload proof and monitor approval status.
              </p>
            </div>
            <div className='hidden sm:flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 shrink-0'>
              <CreditCard className='h-4 w-4' style={{ color: colors.secondary }} />
              Step 2 of 2
            </div>
          </div>

          {loading && (
            <div className='py-14 text-center font-medium text-slate-700'>
              <Loader2 className='h-5 w-5 animate-spin inline-block mr-2' />
              Loading payment details...
            </div>
          )}

          {!loading && error && (
            <div className='rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 flex gap-3 mb-5'>
              <AlertTriangle className='h-5 w-5 shrink-0 mt-0.5' />
              <p>{error}</p>
            </div>
          )}

          {!loading && data && (
            <form onSubmit={handleSubmit} className='space-y-4'>
              {hasPendingSubmission && (
                <div className='rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-amber-900'>
                  <div className='flex items-start gap-3'>
                    <Clock3 className='h-4 w-4 shrink-0 mt-0.5 text-amber-700' />
                    <div>
                      <p className='font-bold text-sm'>Payment proof already submitted</p>
                      <p className='text-xs mt-0.5 text-amber-800'>
                        You already have a payment submission waiting for approval. You can review it in the
                        <strong> Pending</strong> tab on the right.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {data.is_first_installment_payment && (
                <div
                  className='rounded-lg border px-3 py-2 text-xs font-medium'
                  style={{
                    borderColor: `${colors.secondary}55`,
                    backgroundColor: `${colors.secondary}14`,
                    color: colors.primary,
                  }}
                >
                  Installment downpayment required: at least{" "}
                  <strong>{formatMoney(data.configured_downpayment || 0)}</strong>
                </div>
              )}

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                <div className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5'>
                  <p className='text-[10px] uppercase tracking-[0.18em] font-semibold text-slate-500'>
                    Student
                  </p>
                  <p className='font-bold text-base leading-tight mt-1' style={{ color: colors.primary }}>
                    {data.student_name || data.student_number}
                  </p>
                  <p className='text-xs text-slate-700 mt-0.5'>{data.student_number}</p>
                </div>
                <div className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5'>
                  <p className='text-[10px] uppercase tracking-[0.18em] font-semibold text-slate-500'>
                    Term
                  </p>
                  <p className='font-bold text-base leading-tight mt-1' style={{ color: colors.primary }}>
                    {data.academic_year}
                  </p>
                  <p className='text-xs text-slate-700 mt-0.5'>
                    {data.semester === 1 ? "First Semester" : "Second Semester"}
                  </p>
                </div>
              </div>

              {!hasPendingSubmission && (
                <div className='space-y-3'>
                <div>
                  <label
                    className='block text-sm font-bold mb-2'
                    style={{ color: colors.primary }}
                  >
                    Payment Method
                  </label>
                  <select
                    value={paymentMethodId}
                    onChange={(e) => setPaymentMethodId(Number(e.target.value))}
                    className='w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white text-sm text-slate-900 font-medium focus:ring-2 focus:ring-amber-200 focus:border-amber-400'
                    required
                  >
                    {data.methods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMethod && (
                  <div
                    className='rounded-lg border p-3'
                    style={{
                      borderColor: `${colors.secondary}44`,
                      background:
                        "linear-gradient(135deg, rgba(149,90,39,0.08) 0%, rgba(255,255,255,0.96) 100%)",
                    }}
                  >
                    <div className='grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-start'>
                      <div className='space-y-1.5'>
                        <p className='text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500'>
                          Payment Instructions
                        </p>
                        <p className='text-sm font-bold text-slate-900'>
                          {selectedMethod.name}
                        </p>
                        <p className='text-xs text-slate-900'>
                          <strong style={{ color: colors.primary }}>Receiver:</strong>{" "}
                          {selectedMethod.receiver_name}
                        </p>
                        <p className='text-xs text-slate-900'>
                          <strong style={{ color: colors.primary }}>Account/Number:</strong>{" "}
                          {selectedMethod.receiver_account}
                        </p>
                        {selectedMethod.instructions && (
                          <p className='text-xs mt-1 text-slate-700 font-medium'>
                            {selectedMethod.instructions}
                          </p>
                        )}
                      </div>
                      <div className='rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs shadow-sm'>
                        <p className='text-slate-500 font-semibold uppercase tracking-[0.18em] text-[11px]'>
                          Send exactly
                        </p>
                        <p className='text-base font-black mt-0.5' style={{ color: colors.secondary }}>
                          {formatMoney(data.amount_due_now || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div>
                    <label
                      className='block text-sm font-bold mb-2'
                      style={{ color: colors.primary }}
                    >
                      Amount
                    </label>
                    <input
                      type='number'
                      step='0.01'
                      min={String(Math.max(1, Number(data.min_amount_allowed || 1)))}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className='w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-amber-200 focus:border-amber-400'
                      required
                    />
                    <p className='mt-2 text-xs font-medium text-slate-600'>
                      {data.is_first_installment_payment
                        ? `Minimum required now: ${formatMoney(data.min_amount_allowed || 0)}`
                        : `Remaining balance: ${formatMoney(data.remaining_balance || 0)}`}
                    </p>
                  </div>
                  <div>
                    <label
                      className='block text-sm font-bold mb-2'
                      style={{ color: colors.primary }}
                    >
                      Reference Number
                    </label>
                    <input
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      className='w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-amber-200 focus:border-amber-400'
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    className='block text-sm font-bold mb-2'
                    style={{ color: colors.primary }}
                  >
                    OR Number (Optional)
                  </label>
                  <input
                    value={orNumber}
                    onChange={(e) => setOrNumber(e.target.value)}
                    className='w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-amber-200 focus:border-amber-400'
                  />
                </div>

                <div>
                  <label
                    className='block text-sm font-bold mb-2'
                    style={{ color: colors.primary }}
                  >
                    Payment Proof (Image)
                  </label>
                  <label
                    className='w-full rounded-lg border border-dashed px-3 py-2.5 flex items-center gap-2.5 cursor-pointer'
                    style={{
                      borderColor: `${colors.secondary}66`,
                      backgroundColor: `${colors.secondary}10`,
                    }}
                  >
                    <div className='h-8 w-8 rounded-lg grid place-items-center bg-white border border-slate-200'>
                      <Upload className='h-4 w-4' style={{ color: colors.secondary }} />
                    </div>
                    <div>
                      <p className='text-xs font-semibold text-slate-800'>
                        {proof ? proof.name : "Choose screenshot/image file"}
                      </p>
                      <p className='text-[11px] text-slate-500 mt-0.5'>
                        Upload a clear image of your transfer or payment receipt.
                      </p>
                    </div>
                    <input
                      type='file'
                      accept='image/*'
                      className='hidden'
                      onChange={(e) => setProof(e.target.files?.[0] || null)}
                      required
                    />
                  </label>
                </div>
                </div>
              )}

              {success && (
                <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-700 flex gap-2.5'>
                  <CircleCheck className='h-4 w-4 shrink-0 mt-0.5' />
                  <p>{success}</p>
                </div>
              )}

              {!hasPendingSubmission && (
                <button
                  type='submit'
                  disabled={submitting}
                  className='w-full h-10 rounded-lg font-bold text-white disabled:opacity-60 transition-transform hover:scale-[1.01] shadow-sm'
                  style={{
                    background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)`,
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Payment Proof"}
                </button>
              )}
            </form>
          )}
        </div>

        <div
          className='lg:col-span-2 self-start bg-white rounded-[20px] border shadow-sm p-3.5 sm:p-4'
          style={{ borderColor: `${colors.secondary}24` }}
        >
          <div className='flex items-start justify-between gap-3 mb-2.5'>
            <div>
              <h2 className='text-lg sm:text-xl font-black tracking-tight' style={{ color: colors.primary }}>
                Payment Summary
              </h2>
              <p className='text-xs text-slate-500 mt-0.5'>Balance and payment activity.</p>
            </div>
            <div
              className='rounded-lg px-2.5 py-1.5 text-right'
              style={{ backgroundColor: `${colors.secondary}10` }}
            >
              <p className='text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold'>
                Balance Left
              </p>
              <p className='text-xs sm:text-sm font-black mt-0.5' style={{ color: colors.secondary }}>
                {formatMoney(data?.remaining_balance || 0)}
              </p>
            </div>
          </div>
          {!data ? (
            <p className='text-slate-600 text-sm font-medium'>
              Waiting for payment details...
            </p>
          ) : (
            <div className='space-y-2.5 text-sm'>
              <div className='grid grid-cols-1 gap-2'>
              <div className='flex justify-between items-center rounded-lg px-3 py-2 bg-slate-100 border border-slate-200'>
                <span className='text-slate-800 font-semibold'>Total Due</span>
                <span className='font-bold text-slate-900'>
                  {formatMoney(data.total_due || 0)}
                </span>
              </div>
              <div className='flex justify-between items-center rounded-lg px-3 py-2 bg-emerald-50 border border-emerald-100'>
                <span className='text-emerald-900 font-semibold'>Total Paid</span>
                <span className='font-bold text-emerald-700'>
                  {formatMoney(data.total_paid || 0)}
                </span>
              </div>
              <div className='flex justify-between items-center rounded-lg px-3 py-2 bg-rose-50 border border-rose-100'>
                <span className='text-rose-900 font-semibold'>Remaining</span>
                <span className='font-bold text-rose-700'>
                  {formatMoney(data.remaining_balance || 0)}
                </span>
              </div>
              <div
                className='flex justify-between items-center rounded-lg px-3 py-2 border'
                style={{ backgroundColor: `${colors.secondary}12`, borderColor: `${colors.secondary}22` }}
              >
                <span className='font-semibold' style={{ color: `${colors.primary}E8` }}>
                  Amount Due Now
                </span>
                <span className='font-bold' style={{ color: colors.secondary }}>
                  {formatMoney(data.amount_due_now || 0)}
                </span>
              </div>
              </div>

              <div className='pt-2.5 border-t border-slate-100'>
                <p className='font-bold mb-2' style={{ color: colors.primary }}>
                  Fee Breakdown
                </p>
                <div className='space-y-1.5 max-h-64 overflow-auto pr-1'>
                  {data.fee_breakdown?.length ? (
                    data.fee_breakdown.map((fee) => (
                      <div
                        key={fee.id}
                        className='flex justify-between items-center text-xs rounded-lg px-3 py-1.5 bg-slate-50 border border-slate-100'
                      >
                        <span className='text-slate-800 font-medium'>{fee.fee_name}</span>
                        <span className='font-bold text-slate-900'>
                          {formatMoney(fee.amount || 0)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className='text-xs text-slate-600'>No fee breakdown available.</p>
                  )}
                </div>
              </div>

              <div className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-medium flex items-center gap-2'>
                <Wallet className='h-3.5 w-3.5' />
                Payment mode:{" "}
                <strong className='uppercase'>{String(data.payment_mode || "cash")}</strong>
              </div>

              <div className='pt-2.5 border-t border-slate-100'>
                <div className='flex items-center justify-between gap-3 mb-1.5'>
                  <p className='font-bold' style={{ color: colors.primary }}>
                    Payment Activity
                  </p>
                  <div className='inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5'>
                    <button
                      type='button'
                      onClick={() => setActiveHistoryTab("paid")}
                      className='rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors'
                      style={
                        activeHistoryTab === "paid"
                          ? {
                              backgroundColor: colors.primary,
                              color: "#ffffff",
                            }
                          : { color: colors.primary }
                      }
                    >
                      Paid History
                    </button>
                    <button
                      type='button'
                      onClick={() => setActiveHistoryTab("pending")}
                      className='rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5'
                      style={
                        activeHistoryTab === "pending"
                          ? {
                              backgroundColor: colors.secondary,
                              color: "#ffffff",
                            }
                          : { color: colors.primary }
                      }
                    >
                      Pending
                      {!!data.pending_submissions?.length && (
                        <span className='rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-900'>
                          {data.pending_submissions.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className='space-y-1.5 max-h-64 overflow-auto pr-1'>
                  {activeHistoryTab === "paid" ? (
                    data.payment_history?.length ? (
                      data.payment_history.map((payment) => (
                        <div
                          key={payment.id}
                          className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5'
                        >
                          <div className='flex items-start justify-between gap-3'>
                            <div>
                              <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                                {payment.payment_type || "Payment"}
                              </p>
                              <p className='text-xs font-medium text-slate-800'>
                                {formatPaymentDate(payment.payment_date)}
                              </p>
                              {payment.reference_no && (
                                <p className='text-xs text-slate-600'>
                                  Ref #: {payment.reference_no}
                                </p>
                              )}
                            </div>
                            <p className='text-xs font-bold text-emerald-700'>
                              {formatMoney(payment.amount_paid || 0)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className='text-xs text-slate-600'>
                        No recorded payments yet.
                      </p>
                    )
                  ) : data.pending_submissions?.length ? (
                    data.pending_submissions.map((submission) => (
                      <div
                        key={submission.id}
                        className='rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5'
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div>
                            <p className='text-xs font-semibold uppercase tracking-wide text-amber-700'>
                              {submission.payment_method_name || "Pending Submission"}
                            </p>
                            <p className='text-xs font-medium text-slate-800 flex items-center gap-1.5'>
                              <Clock3 className='h-3.5 w-3.5 text-amber-700' />
                              Submitted {formatPaymentDate(submission.created_at)}
                            </p>
                            {submission.reference_no && (
                              <p className='text-xs text-slate-600'>
                                Ref #: {submission.reference_no}
                              </p>
                            )}
                            <p className='text-xs font-semibold text-amber-700 mt-1'>
                              Waiting for admin approval
                            </p>
                          </div>
                          <p className='text-xs font-bold text-amber-700'>
                            {formatMoney(submission.amount || 0)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className='text-xs text-slate-600'>
                      No pending submissions right now.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
