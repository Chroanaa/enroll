import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  FileText,
  Loader2,
  DollarSign,
  RefreshCw,
  CheckCircle,
  X,
  Plus,
  Trash2,
  Wallet,
  Smartphone,
  Building2,
  Hash,
  CreditCard,
  Settings,
  Save,
  Clock,
  CalendarCheck,
  Eye,
} from "lucide-react";
import { colors } from "../../colors";
import { FinancialDetailModal } from "./FinancialDetailModal";

export interface PendingEnrollee {
  id: number;
  student_number: string | null;
  student_name: string;
  first_name: string | null;
  middle_name: string | null;
  family_name: string | null;
  course_program: string | null;
  academic_year: string | null;
  term: string | null;
  year_level: number | null;
  status: number | null;
  total_due: number;
  total_paid: number;
  remaining_balance: number;
  assessment_id: number | null;
  payment_mode: string | null;
}

// Keep for backward compat but no longer used for cart
export interface EnrollmentCartItem {
  enrollee_id: number;
  student_number: string;
  student_name: string;
  course_program: string | null;
  total_due: number;
  amount_to_pay: number;
}

interface PayLine {
  id: number;
  payment_type: "cash" | "gcash" | "bank_transfer";
  amount: string;
  reference_no: string;
}

interface EnrollmentPaymentsTabContentProps {
  formatAmount: (amount: number | null | undefined) => string;
}

export const EnrollmentPaymentsTabContent: React.FC<
  EnrollmentPaymentsTabContentProps
> = ({ formatAmount }) => {
  const [enrollees, setEnrollees] = useState<PendingEnrollee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "4" | "5">("all");

  // Inline payment form state
  const [payingEnrollee, setPayingEnrollee] = useState<PendingEnrollee | null>(
    null,
  );
  const [payLines, setPayLines] = useState<PayLine[]>([
    { id: 1, payment_type: "cash", amount: "", reference_no: "" },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<
    "cash" | "installment"
  >("cash");

  // Detail modal state
  const [detailAssessmentId, setDetailAssessmentId] = useState<number | null>(
    null,
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [minPaymentValue, setMinPaymentValue] = useState("3000");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const fetchMinPayment = async () => {
    try {
      const res = await fetch("/api/auth/settings?key=enrollment_min_payment");
      if (res.ok) {
        const data = await res.json();
        if (data.data?.value) {
          setMinPaymentValue(data.data.value);
        }
      }
    } catch {
      // fallback to default
    }
  };

  const saveMinPayment = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/auth/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "enrollment_min_payment",
          value: minPaymentValue,
          description:
            "Default minimum payment amount for enrollment (used when no assessment exists)",
        }),
      });
      if (res.ok) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2000);
        fetchEnrollees(); // Refresh to reflect new default
      }
    } catch {
      alert("Failed to save setting");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchEnrollees = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);

      const response = await fetch(
        `/api/auth/enrollment/pending-payment?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch enrollees");
      }
      const data = await response.json();
      setEnrollees(data.data || []);
    } catch (error) {
      console.error("Error fetching enrollees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollees();
    fetchMinPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredEnrollees = useMemo(() => {
    if (statusFilter === "all") return enrollees;
    return enrollees.filter((e) => e.status === parseInt(statusFilter));
  }, [enrollees, statusFilter]);

  // Payment form helpers
  const openPayForm = (enrollee: PendingEnrollee) => {
    setPayingEnrollee(enrollee);
    // Default the payment mode based on existing assessment mode, or "cash" for new
    const mode =
      enrollee.payment_mode?.toLowerCase() === "installment"
        ? "installment"
        : "cash";
    setSelectedPaymentMode(mode as "cash" | "installment");

    const payAmount =
      mode === "installment"
        ? Math.ceil((enrollee.remaining_balance / 3) * 100) / 100
        : enrollee.remaining_balance;

    setPayLines([
      {
        id: 1,
        payment_type: "cash",
        amount: String(payAmount),
        reference_no: "",
      },
    ]);
    setSuccessMsg(null);
  };

  const closePayForm = () => {
    setPayingEnrollee(null);
    setSelectedPaymentMode("cash");
    setPayLines([
      { id: 1, payment_type: "cash", amount: "", reference_no: "" },
    ]);
    setSuccessMsg(null);
  };

  const addPayLine = () => {
    const maxId = Math.max(...payLines.map((l) => l.id), 0);
    setPayLines([
      ...payLines,
      { id: maxId + 1, payment_type: "cash", amount: "", reference_no: "" },
    ]);
  };

  const removePayLine = (id: number) => {
    if (payLines.length <= 1) return;
    setPayLines(payLines.filter((l) => l.id !== id));
  };

  const updatePayLine = (id: number, field: keyof PayLine, value: string) => {
    setPayLines(
      payLines.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    );
  };

  // Installment breakdown
  const installmentBreakdown = useMemo(() => {
    if (!payingEnrollee || selectedPaymentMode !== "installment") return null;
    const total = payingEnrollee.remaining_balance;
    const perTerm = Math.ceil((total / 3) * 100) / 100;
    // Last term absorbs rounding difference
    const lastTerm = Math.round((total - perTerm * 2) * 100) / 100;
    return [
      { label: "Prelim", amount: perTerm, isPaying: true },
      { label: "Midterm", amount: perTerm, isPaying: false },
      { label: "Final", amount: lastTerm, isPaying: false },
    ];
  }, [payingEnrollee, selectedPaymentMode]);

  const handlePaymentModeChange = (mode: "cash" | "installment") => {
    setSelectedPaymentMode(mode);
    if (!payingEnrollee) return;

    const payAmount =
      mode === "installment"
        ? Math.ceil((payingEnrollee.remaining_balance / 3) * 100) / 100
        : payingEnrollee.remaining_balance;

    setPayLines([
      {
        id: 1,
        payment_type: "cash",
        amount: String(payAmount),
        reference_no: "",
      },
    ]);
  };

  const totalPayment = useMemo(() => {
    return payLines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
  }, [payLines]);

  const changeAmount = useMemo(() => {
    if (!payingEnrollee) return 0;
    return Math.max(0, totalPayment - payingEnrollee.remaining_balance);
  }, [totalPayment, payingEnrollee]);

  const canSubmit = useMemo(() => {
    if (!payingEnrollee) return false;
    if (totalPayment <= 0) return false;
    for (const line of payLines) {
      if (!line.amount || parseFloat(line.amount) <= 0) return false;
      if (
        (line.payment_type === "gcash" ||
          line.payment_type === "bank_transfer") &&
        !line.reference_no
      )
        return false;
    }
    return true;
  }, [payingEnrollee, totalPayment, payLines]);

  const handleSubmitPayment = async () => {
    if (!payingEnrollee) return;
    setIsProcessing(true);
    try {
      const response = await fetch("/api/auth/enrollment/pending-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollee_id: payingEnrollee.id,
          assessment_id: payingEnrollee.assessment_id,
          payment_mode: selectedPaymentMode,
          payments: payLines.map((l) => ({
            payment_type: l.payment_type,
            amount: parseFloat(l.amount),
            reference_no: l.reference_no || undefined,
          })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to process payment");
      }

      const result = await response.json();
      setSuccessMsg(result.message || "Payment processed!");

      // Refresh data after short delay
      setTimeout(() => {
        closePayForm();
        fetchEnrollees();
      }, 2000);
    } catch (err: any) {
      alert(err.message || "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const paymentTypeIcon = (type: string) => {
    switch (type) {
      case "cash":
        return <Wallet className='w-4 h-4' />;
      case "gcash":
        return <Smartphone className='w-4 h-4' />;
      case "bank_transfer":
        return <Building2 className='w-4 h-4' />;
      default:
        return <CreditCard className='w-4 h-4' />;
    }
  };

  const getStatusBadge = (status: number | null) => {
    if (status === 4) {
      return (
        <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'>
          Pending
        </span>
      );
    }
    if (status === 5) {
      return (
        <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800'>
          Partially Paid
        </span>
      );
    }
    return (
      <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800'>
        {status ?? "-"}
      </span>
    );
  };

  const getPaymentModeBadge = (mode: string | null) => {
    if (!mode) return <span className='text-xs text-gray-400'>N/A</span>;
    const isInstallment = mode.toLowerCase() === "installment";
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          isInstallment
            ? "bg-blue-100 text-blue-800"
            : "bg-green-100 text-green-800"
        }`}
      >
        {isInstallment ? "Installment" : "Full Pay"}
      </span>
    );
  };

  return (
    <div className='space-y-4'>
      {/* Search & Header */}
      <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4'>
        <div className='flex items-center gap-3 mb-3'>
          <h2 className='text-lg font-bold' style={{ color: colors.primary }}>
            Enrollment Payments
          </h2>
          <span className='text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium'>
            Pending (4)
          </span>
          <span className='text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium'>
            Partially Paid (5)
          </span>
          <button
            onClick={fetchEnrollees}
            disabled={isLoading}
            className='p-1.5 rounded-lg hover:bg-gray-100 transition-colors'
            title='Refresh'
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-500 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors ${showSettings ? "bg-gray-200" : "hover:bg-gray-100"}`}
            title='Settings'
          >
            <Settings className='w-4 h-4 text-gray-500' />
          </button>
        </div>
        <div className='flex gap-3'>
          <input
            type='text'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchEnrollees();
            }}
            placeholder='Search by name, student number, or program...'
            className='flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
          />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "4" | "5")
            }
            className='px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
          >
            <option value='all'>All Status</option>
            <option value='4'>Pending (4)</option>
            <option value='5'>Partially Paid (5)</option>
          </select>
          <button
            onClick={fetchEnrollees}
            disabled={isLoading}
            className='px-4 py-2 rounded-lg text-white font-medium text-sm hover:opacity-90 transition-colors'
            style={{ backgroundColor: colors.secondary }}
          >
            <Search className='w-4 h-4' />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className='mt-3 pt-3 border-t border-gray-200'>
            <div className='flex items-center gap-3'>
              <label className='text-sm font-medium text-gray-700 whitespace-nowrap'>
                Default Minimum Payment (₱):
              </label>
              <div className='relative'>
                <span className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm'>
                  ₱
                </span>
                <input
                  type='number'
                  step='100'
                  min='0'
                  value={minPaymentValue}
                  onChange={(e) => setMinPaymentValue(e.target.value)}
                  className='w-40 pl-7 pr-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
              <button
                onClick={saveMinPayment}
                disabled={isSavingSettings}
                className='inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50'
                style={{ backgroundColor: colors.secondary }}
              >
                {isSavingSettings ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  <Save className='w-3.5 h-3.5' />
                )}
                Save
              </button>
              {settingsSaved && (
                <span className='text-xs text-green-600 font-medium flex items-center gap-1'>
                  <CheckCircle className='w-3.5 h-3.5' /> Saved!
                </span>
              )}
              <span className='text-xs text-gray-400 ml-auto'>
                Applied when no assessment exists for a Pending enrollee
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className='flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm'>
          <CheckCircle className='w-5 h-5 flex-shrink-0' />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Enrollees Table */}
      <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='w-8 h-8 animate-spin text-gray-400' />
            <span className='ml-2 text-gray-500'>Loading enrollees...</span>
          </div>
        ) : filteredEnrollees.length === 0 ? (
          <div className='text-center py-12'>
            <CheckCircle className='w-12 h-12 mx-auto mb-3 text-green-400' />
            <p className='text-gray-600 font-medium'>No enrollees found</p>
            <p className='text-gray-500 text-sm mt-1'>
              All enrollees have been fully paid or no results match your
              search.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='bg-gray-50 border-b border-gray-200'>
                  <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Student #
                  </th>
                  <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Name
                  </th>
                  <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Program
                  </th>
                  <th className='px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Mode
                  </th>
                  <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Total Due
                  </th>
                  <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Paid
                  </th>
                  <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Balance
                  </th>
                  <th className='px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200'>
                {filteredEnrollees.map((enrollee) => {
                  const isActive = payingEnrollee?.id === enrollee.id;
                  return (
                    <tr
                      key={enrollee.id}
                      className={`transition-colors ${
                        isActive
                          ? "bg-blue-50 border-l-4 border-l-blue-400"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className='px-4 py-3 text-sm font-medium text-gray-900'>
                        {enrollee.student_number || "-"}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-700'>
                        {enrollee.student_name}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600'>
                        {enrollee.course_program || "-"}
                      </td>
                      <td className='px-4 py-3 text-center'>
                        {getPaymentModeBadge(enrollee.payment_mode)}
                      </td>
                      <td
                        className='px-4 py-3 text-sm text-right font-medium'
                        style={{ color: colors.secondary }}
                      >
                        {formatAmount(enrollee.total_due)}
                      </td>
                      <td className='px-4 py-3 text-sm text-right text-green-600 font-medium'>
                        {formatAmount(enrollee.total_paid)}
                      </td>
                      <td className='px-4 py-3 text-sm text-right font-bold text-red-600'>
                        {formatAmount(enrollee.remaining_balance)}
                      </td>
                      <td className='px-4 py-3 text-center'>
                        {getStatusBadge(enrollee.status)}
                      </td>
                      <td className='px-4 py-3 text-center'>
                        <div className='inline-flex items-center gap-1.5'>
                          {enrollee.assessment_id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailAssessmentId(enrollee.assessment_id);
                                setIsDetailModalOpen(true);
                              }}
                              className='inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-white hover:opacity-90 transition-colors'
                              style={{ backgroundColor: colors.secondary }}
                              title='View financial detail'
                            >
                              <Eye className='w-3.5 h-3.5' />
                              Detail
                            </button>
                          )}
                          {enrollee.remaining_balance > 0 && (
                            <button
                              onClick={() => openPayForm(enrollee)}
                              disabled={isProcessing}
                              className='inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50'
                              style={{ backgroundColor: colors.primary }}
                            >
                              <DollarSign className='w-3.5 h-3.5' />
                              Pay
                            </button>
                          )}
                          {enrollee.remaining_balance <= 0 && (
                            <span className='text-xs text-green-600 font-medium'>
                              Paid
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filteredEnrollees.length > 0 && (
          <div className='px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500'>
            Showing {filteredEnrollees.length} of {enrollees.length} enrollee(s)
          </div>
        )}
      </div>

      {/* Inline Payment Form */}
      {payingEnrollee && !successMsg && (
        <div className='bg-white rounded-lg shadow-sm border border-blue-200 overflow-hidden'>
          <div className='px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <DollarSign className='w-5 h-5 text-blue-700' />
              <div>
                <span className='font-semibold text-blue-900 text-sm'>
                  Pay — {payingEnrollee.student_number} (
                  {payingEnrollee.student_name})
                </span>
                <div className='flex items-center gap-3 mt-1'>
                  <div className='flex items-center gap-1.5'>
                    <label className='text-xs text-gray-500'>Mode:</label>
                    <select
                      value={selectedPaymentMode}
                      onChange={(e) =>
                        handlePaymentModeChange(
                          e.target.value as "cash" | "installment",
                        )
                      }
                      disabled={!!payingEnrollee.payment_mode}
                      className='px-2 py-0.5 border border-gray-300 rounded text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500'
                    >
                      <option value='cash'>Full Pay</option>
                      <option value='installment'>Installment</option>
                    </select>
                  </div>
                  <span className='text-xs text-gray-500'>
                    Balance: {formatAmount(payingEnrollee.remaining_balance)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={closePayForm}
              className='text-blue-400 hover:text-blue-600 p-1'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          <div className='p-4 space-y-3'>
            {/* Installment Breakdown Preview */}
            {installmentBreakdown && (
              <div className='bg-blue-50 border border-blue-200 rounded-lg p-3'>
                <p className='text-xs font-semibold text-blue-800 mb-2'>
                  Installment Breakdown (3 terms)
                </p>
                <div className='grid grid-cols-3 gap-2'>
                  {installmentBreakdown.map((term) => (
                    <div
                      key={term.label}
                      className={`rounded-lg p-2 text-center border ${
                        term.isPaying
                          ? "bg-green-50 border-green-300"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className='flex items-center justify-center gap-1 mb-1'>
                        {term.isPaying ? (
                          <CalendarCheck className='w-3.5 h-3.5 text-green-600' />
                        ) : (
                          <Clock className='w-3.5 h-3.5 text-gray-400' />
                        )}
                        <span
                          className={`text-xs font-medium ${term.isPaying ? "text-green-700" : "text-gray-500"}`}
                        >
                          {term.label}
                        </span>
                      </div>
                      <p
                        className={`text-sm font-bold ${term.isPaying ? "text-green-700" : "text-gray-500"}`}
                      >
                        {formatAmount(term.amount)}
                      </p>
                      <p
                        className={`text-[10px] mt-0.5 ${
                          term.isPaying ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {term.isPaying ? "Pay now" : "Due later"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment lines */}
            {payLines.map((line, index) => (
              <div key={line.id} className='flex items-start gap-2'>
                <div className='flex-shrink-0 pt-7 text-xs text-gray-400 w-5 text-right'>
                  {index + 1}.
                </div>
                <div className='flex-1 grid grid-cols-3 gap-2'>
                  <div>
                    <label className='text-xs text-gray-500 mb-1 block'>
                      Type
                    </label>
                    <div className='relative'>
                      <div className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400'>
                        {paymentTypeIcon(line.payment_type)}
                      </div>
                      <select
                        value={line.payment_type}
                        onChange={(e) =>
                          updatePayLine(line.id, "payment_type", e.target.value)
                        }
                        className='w-full pl-9 pr-2 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      >
                        <option value='cash'>Cash</option>
                        <option value='gcash'>GCash</option>
                        <option value='bank_transfer'>Bank</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className='text-xs text-gray-500 mb-1 block'>
                      Amount
                    </label>
                    <div className='relative'>
                      <span className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm'>
                        ₱
                      </span>
                      <input
                        type='number'
                        step='0.01'
                        min='0.01'
                        value={line.amount}
                        onChange={(e) =>
                          updatePayLine(line.id, "amount", e.target.value)
                        }
                        placeholder='0.00'
                        className='w-full pl-7 pr-2 py-2 border border-gray-300 rounded-lg bg-white text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      />
                    </div>
                  </div>
                  <div>
                    <label className='text-xs text-gray-500 mb-1 block'>
                      Reference
                    </label>
                    <div className='relative'>
                      <Hash className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5' />
                      <input
                        type='text'
                        value={line.reference_no}
                        onChange={(e) =>
                          updatePayLine(line.id, "reference_no", e.target.value)
                        }
                        placeholder={
                          line.payment_type === "cash" ? "Optional" : "Required"
                        }
                        disabled={line.payment_type === "cash"}
                        className='w-full pl-7 pr-2 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50'
                      />
                    </div>
                  </div>
                </div>
                <div className='flex-shrink-0 pt-7'>
                  <button
                    onClick={() => removePayLine(line.id)}
                    disabled={payLines.length <= 1}
                    className='p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors'
                  >
                    <Trash2 className='w-4 h-4' />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={addPayLine}
              className='flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors'
            >
              <Plus className='w-3.5 h-3.5' />
              Add Payment Line
            </button>

            {/* Summary & Submit */}
            <div className='border-t border-gray-200 pt-3 flex items-end justify-between'>
              <div className='space-y-1 text-sm'>
                <div className='flex justify-between gap-8'>
                  <span className='text-gray-600'>Balance:</span>
                  <span className='font-medium'>
                    {formatAmount(payingEnrollee.remaining_balance)}
                  </span>
                </div>
                <div className='flex justify-between gap-8'>
                  <span className='text-gray-600'>Payment:</span>
                  <span
                    className={`font-semibold ${totalPayment > 0 ? "text-green-600" : "text-gray-400"}`}
                  >
                    {formatAmount(totalPayment)}
                  </span>
                </div>
                {changeAmount > 0 && (
                  <div className='flex justify-between gap-8'>
                    <span className='text-gray-600'>Change:</span>
                    <span className='font-medium text-blue-600'>
                      {formatAmount(changeAmount)}
                    </span>
                  </div>
                )}
                {totalPayment > 0 &&
                  totalPayment < payingEnrollee.remaining_balance &&
                  selectedPaymentMode !== "installment" && (
                    <p className='text-xs text-orange-600'>
                      Partial payment — status will be set to Partially Paid (5)
                    </p>
                  )}
                {selectedPaymentMode === "installment" && (
                  <p className='text-xs text-blue-600'>
                    Installment — paying Prelim only, status: Partially Paid (5)
                  </p>
                )}
                {totalPayment >= payingEnrollee.remaining_balance &&
                  totalPayment > 0 &&
                  selectedPaymentMode !== "installment" && (
                    <p className='text-xs text-green-600'>
                      Full payment — status will be set to Reserved (2)
                    </p>
                  )}
              </div>

              <div className='flex gap-2'>
                <button
                  onClick={closePayForm}
                  className='px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors'
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitPayment}
                  disabled={!canSubmit || isProcessing}
                  className='px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2'
                  style={{ backgroundColor: colors.secondary }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className='w-4 h-4 animate-spin' />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className='w-4 h-4' />
                      Confirm Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Financial Detail Modal */}
      <FinancialDetailModal
        isOpen={isDetailModalOpen}
        assessmentId={detailAssessmentId}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailAssessmentId(null);
        }}
        formatAmount={formatAmount}
      />
    </div>
  );
};
