"use client";
import React, { useEffect, useMemo, useState } from "react";
import { colors } from "@/app/colors";
import {
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  X,
  MessageSquareText,
} from "lucide-react";
import SuccessModal from "../common/SuccessModal";
import ErrorModal from "../common/ErrorModal";

type SubmissionRow = {
  id: number;
  student_number: string;
  student_name: string | null;
  academic_year: string | null;
  semester: number | null;
  payment_method_name: string | null;
  receiver_name: string | null;
  receiver_account: string | null;
  reference_no: string;
  or_number: string | null;
  amount: number | string;
  proof_path: string;
  status: "pending" | "approved" | "rejected";
  admin_remarks: string | null;
  reviewed_at: string | null;
  created_at: string;
  email_address?: string | null;
};

type Props = {
  refreshSignal?: number;
};

const STATUS_OPTIONS = ["pending", "approved", "rejected", "all"] as const;

export default function OnlinePaymentSubmissionsTabContent({ refreshSignal = 0 }: Props) {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] =
    useState<(typeof STATUS_OPTIONS)[number]>("pending");
  const [search, setSearch] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: "" });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: "",
    details: "",
  });
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    submissionId: number | null;
    action: "approve" | "reject" | null;
    remarks: string;
    studentName: string;
  }>({
    isOpen: false,
    submissionId: null,
    action: null,
    remarks: "",
    studentName: "",
  });

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/auth/online-payment-submissions?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch online submissions.");
      }
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: "Failed to load online submissions",
        details: error?.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, refreshSignal]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [
        row.student_name || "",
        row.student_number || "",
        row.reference_no || "",
        row.payment_method_name || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [rows, search]);

  const openReviewModal = (
    submissionId: number,
    action: "approve" | "reject",
    studentName: string,
  ) => {
    setReviewModal({
      isOpen: true,
      submissionId,
      action,
      remarks: "",
      studentName,
    });
  };

  const closeReviewModal = () => {
    setReviewModal({
      isOpen: false,
      submissionId: null,
      action: null,
      remarks: "",
      studentName: "",
    });
  };

  const reviewSubmission = async () => {
    if (!reviewModal.submissionId || !reviewModal.action) return;
    setActingId(reviewModal.submissionId);
    try {
      const response = await fetch("/api/auth/online-payment-submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: reviewModal.submissionId,
          action: reviewModal.action,
          remarks: reviewModal.remarks.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to review submission.");
      }

      setSuccessModal({
        isOpen: true,
        message:
          data?.message ||
          (reviewModal.action === "approve"
            ? "Payment submission approved."
            : "Payment submission rejected."),
      });
      closeReviewModal();
      await fetchRows();
    } catch (error: any) {
      setErrorModal({
        isOpen: true,
        message: "Review failed",
        details: error?.message || "Please try again.",
      });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className='bg-white rounded-xl border border-gray-100 shadow-sm'>
      <div className='p-5 border-b border-gray-100 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h2 className='text-xl font-bold' style={{ color: colors.primary }}>
            Online Payment Submissions
          </h2>
          <p className='text-sm text-black'>
            Review uploaded payment proofs from student payment links.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <div className='relative'>
            <Search className='h-4 w-4 text-black absolute left-3 top-1/2 -translate-y-1/2' />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search student/ref no...'
              className='h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-black placeholder:text-black'
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as (typeof STATUS_OPTIONS)[number])}
            className='h-10 rounded-lg border border-slate-200 px-3 text-sm text-black'
          >
            <option value='pending'>Pending</option>
            <option value='approved'>Approved</option>
            <option value='rejected'>Rejected</option>
            <option value='all'>All</option>
          </select>
          <button
            onClick={fetchRows}
            disabled={loading}
            className='h-10 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-black'
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className='overflow-x-auto'>
        <table className='min-w-full text-sm text-black'>
          <thead className='bg-slate-50 text-black'>
            <tr>
              <th className='text-left px-4 py-3 font-semibold'>Student</th>
              <th className='text-left px-4 py-3 font-semibold'>Method</th>
              <th className='text-left px-4 py-3 font-semibold'>Reference</th>
              <th className='text-left px-4 py-3 font-semibold'>Amount</th>
              <th className='text-left px-4 py-3 font-semibold'>Proof</th>
              <th className='text-left px-4 py-3 font-semibold'>Status</th>
              <th className='text-left px-4 py-3 font-semibold'>Submitted</th>
              <th className='text-left px-4 py-3 font-semibold'>Action</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td className='px-4 py-8 text-center text-black' colSpan={8}>
                  No submissions found for current filter.
                </td>
              </tr>
            )}
            {filteredRows.map((row) => {
              const amount = Number(row.amount || 0);
              return (
                <tr key={row.id} className='border-t border-slate-100 align-top'>
                  <td className='px-4 py-3'>
                    <p className='font-semibold text-slate-900'>{row.student_name || "Unknown"}</p>
                    <p className='text-black'>{row.student_number}</p>
                    <p className='text-black text-xs'>
                      {row.academic_year || "N/A"} • Sem {row.semester || "N/A"}
                    </p>
                  </td>
                  <td className='px-4 py-3'>
                    <p className='font-medium text-black'>{row.payment_method_name || "N/A"}</p>
                    <p className='text-black text-xs'>{row.receiver_name || "N/A"}</p>
                    <p className='text-black text-xs'>{row.receiver_account || "N/A"}</p>
                  </td>
                  <td className='px-4 py-3'>
                    <p className='font-medium text-black'>{row.reference_no}</p>
                    <p className='text-black text-xs'>OR: {row.or_number || "-"}</p>
                  </td>
                  <td className='px-4 py-3 font-semibold text-black'>
                    ₱{amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className='px-4 py-3'>
                    <a
                      href={row.proof_path}
                      target='_blank'
                      rel='noreferrer'
                      className='inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium'
                    >
                      Open
                      <ExternalLink className='h-3.5 w-3.5' />
                    </a>
                  </td>
                  <td className='px-4 py-3'>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        row.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : row.status === "rejected"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-black'>
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className='px-4 py-3'>
                    {row.status === "pending" ? (
                      <div className='flex gap-2'>
                        <button
                          onClick={() =>
                            openReviewModal(row.id, "reject", row.student_name || row.student_number)
                          }
                          disabled={actingId === row.id}
                          className='inline-flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-white text-xs font-semibold hover:bg-rose-600 disabled:opacity-60'
                        >
                          <XCircle className='h-3.5 w-3.5' />
                          Reject
                        </button>
                        <button
                          onClick={() =>
                            openReviewModal(row.id, "approve", row.student_name || row.student_number)
                          }
                          disabled={actingId === row.id}
                          className='inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60'
                        >
                          <CheckCircle2 className='h-3.5 w-3.5' />
                          Approve
                        </button>
                      </div>
                    ) : (
                      <span className='text-black text-xs'>Reviewed</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {reviewModal.isOpen && (
        <div className='fixed inset-0 z-[80] bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4'>
          <div className='w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden'>
            <div
              className='px-5 py-4 border-b flex items-start justify-between gap-3'
              style={{
                background:
                  reviewModal.action === "approve"
                    ? "linear-gradient(135deg, #ecfdf3 0%, #ffffff 80%)"
                    : "linear-gradient(135deg, #fff1f2 0%, #ffffff 80%)",
              }}
            >
              <div className='flex items-start gap-3'>
                <div
                  className={`h-10 w-10 rounded-xl grid place-items-center ${
                    reviewModal.action === "approve"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {reviewModal.action === "approve" ? (
                    <CheckCircle2 className='h-5 w-5' />
                  ) : (
                    <XCircle className='h-5 w-5' />
                  )}
                </div>
                <div>
                  <h3 className='text-lg font-bold' style={{ color: colors.primary }}>
                    {reviewModal.action === "approve"
                      ? "Approve Payment Submission"
                      : "Reject Payment Submission"}
                  </h3>
                  <p className='text-sm text-black'>
                    Student: <span className='font-semibold text-black'>{reviewModal.studentName}</span>
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={closeReviewModal}
                className='h-8 w-8 rounded-lg border border-slate-200 text-black hover:bg-slate-100 grid place-items-center'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <div className='p-5 space-y-3'>
              <label className='text-sm font-semibold text-black flex items-center gap-2'>
                <MessageSquareText className='h-4 w-4' />
                Optional remarks for student email
              </label>
              <textarea
                value={reviewModal.remarks}
                onChange={(e) =>
                  setReviewModal((prev) => ({ ...prev, remarks: e.target.value }))
                }
                placeholder={
                  reviewModal.action === "approve"
                    ? "Approved payment. Thank you."
                    : "Reason for rejection..."
                }
                className='w-full min-h-28 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-amber-100 focus:border-amber-400'
              />
            </div>

            <div className='px-5 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/70'>
              <button
                type='button'
                onClick={closeReviewModal}
                className='h-10 px-4 rounded-lg border border-slate-300 bg-white text-black font-medium hover:bg-slate-50'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={reviewSubmission}
                disabled={actingId === reviewModal.submissionId}
                className={`h-10 px-4 rounded-lg text-white font-semibold disabled:opacity-60 ${
                  reviewModal.action === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {actingId === reviewModal.submissionId
                  ? reviewModal.action === "approve"
                    ? "Approving..."
                    : "Rejecting..."
                  : reviewModal.action === "approve"
                    ? "Approve Submission"
                    : "Reject Submission"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: "" })}
        message={successModal.message}
        autoClose
        autoCloseDelay={2500}
      />
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: "", details: "" })}
        message={errorModal.message}
        details={errorModal.details}
      />
    </div>
  );
}
