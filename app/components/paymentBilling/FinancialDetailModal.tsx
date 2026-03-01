import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Loader2,
  BookOpen,
  Receipt,
  CreditCard,
  Calendar,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Plus,
  Trash2,
  Wallet,
  Smartphone,
  Building2,
  Hash,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { colors } from "../../colors";
import { useSession } from "next-auth/react";

interface SubjectDetail {
  id: number;
  curriculum_course_id: number;
  course_code: string;
  descriptive_title: string;
  units_lec: number;
  units_lab: number;
  units_total: number;
  fixed_amount: number | null;
  year_level: number | null;
  status: string | null;
}

interface PaymentRecord {
  id: number;
  amount_paid: number;
  payment_type: string;
  payment_date: string;
  reference_no: string | null;
}

interface ScheduleRecord {
  id: number;
  label: string;
  due_date: string;
  amount: number;
  is_paid: boolean;
}

interface AssessmentDetail {
  assessment_id: number;
  student_number: string;
  student_name: string;
  course_program: string | null;
  year_level: number | null;
  academic_year: string;
  semester: number;
  payment_mode: string;
  status: string | null;
  created_at: string;
  finalized_at: string | null;
  tuition: {
    gross_tuition: number;
    discount_name: string | null;
    discount_percent: number | null;
    discount_amount: number;
    net_tuition: number;
  };
  fees: Record<string, { fee_name: string; amount: number }[]>;
  total_fees: number;
  fixed_amount_total: number;
  base_total: number;
  insurance_amount: number | null;
  down_payment: number | null;
  total_due_cash: number | null;
  total_due_installment: number | null;
  total_due: number;
  subjects: SubjectDetail[];
  total_units: number;
  payment_schedule: ScheduleRecord[];
  payments: PaymentRecord[];
  total_paid: number;
  remaining_balance: number;
  payment_status: "Unpaid" | "Partial" | "Fully Paid";
}

interface InstallmentPayLine {
  id: number;
  payment_type: "cash" | "gcash" | "bank_transfer";
  amount: string;
  reference_no: string;
}

interface FinancialDetailModalProps {
  isOpen: boolean;
  assessmentId: number | null;
  onClose: () => void;
  formatAmount: (amount: number | null | undefined) => string;
  onPaymentSuccess?: () => void;
}

type DetailTab = "subjects" | "fees" | "payments" | "schedule";

export const FinancialDetailModal: React.FC<FinancialDetailModalProps> = ({
  isOpen,
  assessmentId,
  onClose,
  formatAmount,
  onPaymentSuccess,
}) => {
  const { data: session } = useSession();
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("subjects");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Low downpayment confirmation modal state
  const [showLowDpConfirm, setShowLowDpConfirm] = useState(false);
  const [lowDpPendingPayment, setLowDpPendingPayment] = useState(false);

  // Installment payment state
  const [payingSchedule, setPayingSchedule] = useState<ScheduleRecord | null>(
    null,
  );
  const [installPayLines, setInstallPayLines] = useState<InstallmentPayLine[]>([
    { id: 1, payment_type: "cash", amount: "", reference_no: "" },
  ]);
  const [isProcessingInstallment, setIsProcessingInstallment] = useState(false);
  const [installmentSuccess, setInstallmentSuccess] = useState<string | null>(
    null,
  );

  // Settings state for downpayment and installment charge
  const [minDownpayment, setMinDownpayment] = useState<number>(3000);
  const [installmentChargePercent, setInstallmentChargePercent] =
    useState<number>(5);

  // Full pay payment state
  const [isPayingFullPay, setIsPayingFullPay] = useState(false);
  const [fullPayLines, setFullPayLines] = useState<InstallmentPayLine[]>([
    { id: 1, payment_type: "cash", amount: "", reference_no: "" },
  ]);
  const [isProcessingFullPay, setIsProcessingFullPay] = useState(false);
  const [fullPaySuccess, setFullPaySuccess] = useState<string | null>(null);

  // Downpayment state
  const [isPayingDownpayment, setIsPayingDownpayment] = useState(false);
  const [downpaymentLines, setDownpaymentLines] = useState<
    InstallmentPayLine[]
  >([{ id: 1, payment_type: "cash", amount: "", reference_no: "" }]);
  const [isProcessingDownpayment, setIsProcessingDownpayment] = useState(false);
  const [downpaymentSuccess, setDownpaymentSuccess] = useState<string | null>(
    null,
  );

  // Fetch payment settings
  const fetchPaymentSettings = async () => {
    try {
      const [dpRes, icRes] = await Promise.all([
        fetch("/api/auth/settings?key=min_downpayment"),
        fetch("/api/auth/settings?key=installment_charge_percentage"),
      ]);
      if (dpRes.ok) {
        const dpData = await dpRes.json();
        if (dpData.data?.value)
          setMinDownpayment(parseFloat(dpData.data.value));
      }
      if (icRes.ok) {
        const icData = await icRes.json();
        if (icData.data?.value)
          setInstallmentChargePercent(parseFloat(icData.data.value));
      }
    } catch {
      // use defaults
    }
  };

  useEffect(() => {
    if (isOpen && assessmentId) {
      fetchDetail(assessmentId);
      fetchPaymentSettings();
    }
    if (!isOpen) {
      setDetail(null);
      setError(null);
      setActiveTab("subjects");
      setExpandedCategories(new Set());
      resetInstallmentPayment();
      resetFullPayPayment();
      resetDownpaymentPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, assessmentId]);

  const fetchDetail = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/assessment/${id}/detail`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch assessment detail");
      }
      const result = await response.json();
      setDetail(result.data);
      // Expand all fee categories by default
      if (result.data?.fees) {
        setExpandedCategories(new Set(Object.keys(result.data.fees)));
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  // Installment payment helpers
  const resetInstallmentPayment = () => {
    setPayingSchedule(null);
    setInstallPayLines([
      { id: 1, payment_type: "cash", amount: "", reference_no: "" },
    ]);
    setIsProcessingInstallment(false);
    setInstallmentSuccess(null);
  };

  const openInstallmentPay = (sched: ScheduleRecord) => {
    setPayingSchedule(sched);
    setInstallPayLines([
      {
        id: 1,
        payment_type: "cash",
        amount: String(sched.amount),
        reference_no: "",
      },
    ]);
    setInstallmentSuccess(null);
  };

  // Full pay helpers
  const resetFullPayPayment = () => {
    setIsPayingFullPay(false);
    setFullPayLines([
      { id: 1, payment_type: "cash", amount: "", reference_no: "" },
    ]);
    setIsProcessingFullPay(false);
    setFullPaySuccess(null);
  };

  const openFullPay = () => {
    if (!detail) return;
    setIsPayingFullPay(true);
    setFullPayLines([
      {
        id: 1,
        payment_type: "cash",
        amount: String(detail.remaining_balance),
        reference_no: "",
      },
    ]);
    setFullPaySuccess(null);
  };

  const addFullPayLine = () => {
    const maxId = Math.max(...fullPayLines.map((l) => l.id), 0);
    setFullPayLines([
      ...fullPayLines,
      { id: maxId + 1, payment_type: "cash", amount: "", reference_no: "" },
    ]);
  };

  const removeFullPayLine = (id: number) => {
    if (fullPayLines.length <= 1) return;
    setFullPayLines(fullPayLines.filter((l) => l.id !== id));
  };

  const updateFullPayLine = (
    id: number,
    field: keyof InstallmentPayLine,
    value: string,
  ) => {
    setFullPayLines(
      fullPayLines.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    );
  };

  const fullPayTotalPayment = useMemo(() => {
    return fullPayLines.reduce(
      (sum, l) => sum + (parseFloat(l.amount) || 0),
      0,
    );
  }, [fullPayLines]);

  const fullPayChangeAmount = useMemo(() => {
    if (!detail) return 0;
    return Math.max(0, fullPayTotalPayment - detail.remaining_balance);
  }, [fullPayTotalPayment, detail]);

  const canSubmitFullPay = useMemo(() => {
    if (!detail) return false;
    if (fullPayTotalPayment < detail.remaining_balance) return false;
    for (const line of fullPayLines) {
      if (!line.amount || parseFloat(line.amount) <= 0) return false;
      if (
        (line.payment_type === "gcash" ||
          line.payment_type === "bank_transfer") &&
        !line.reference_no
      )
        return false;
    }
    return true;
  }, [detail, fullPayTotalPayment, fullPayLines]);

  const handleFullPayPayment = async () => {
    if (!detail) return;
    setIsProcessingFullPay(true);
    try {
      const response = await fetch("/api/auth/payment/multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: detail.assessment_id,
          payments: fullPayLines.map((l) => ({
            payment_type: l.payment_type,
            amount: parseFloat(l.amount),
            reference_no: l.reference_no || undefined,
          })),
          student_number: detail.student_number,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to process payment");
      }

      const result = await response.json();
      setFullPaySuccess(
        result.message || "Full payment recorded successfully!",
      );

      if (assessmentId) await fetchDetail(assessmentId);
      onPaymentSuccess?.();
      setTimeout(() => {
        resetFullPayPayment();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Payment failed");
    } finally {
      setIsProcessingFullPay(false);
    }
  };

  // Downpayment helpers
  const resetDownpaymentPayment = () => {
    setIsPayingDownpayment(false);
    setDownpaymentLines([
      { id: 1, payment_type: "cash", amount: "", reference_no: "" },
    ]);
    setIsProcessingDownpayment(false);
    setDownpaymentSuccess(null);
    setShowLowDpConfirm(false);
    setLowDpPendingPayment(false);
  };

  // Editable downpayment amount (user can override)
  const [customDownpaymentAmount, setCustomDownpaymentAmount] =
    useState<number>(3000);

  const openDownpayment = () => {
    if (!detail) return;
    setIsPayingDownpayment(true);
    setCustomDownpaymentAmount(minDownpayment);
    setDownpaymentLines([
      {
        id: 1,
        payment_type: "cash",
        amount: String(minDownpayment),
        reference_no: "",
      },
    ]);
    setDownpaymentSuccess(null);
    setShowLowDpConfirm(false);
  };

  const addDownpaymentLine = () => {
    const maxId = Math.max(...downpaymentLines.map((l) => l.id), 0);
    setDownpaymentLines([
      ...downpaymentLines,
      { id: maxId + 1, payment_type: "cash", amount: "", reference_no: "" },
    ]);
  };

  const removeDownpaymentLine = (id: number) => {
    if (downpaymentLines.length <= 1) return;
    setDownpaymentLines(downpaymentLines.filter((l) => l.id !== id));
  };

  const updateDownpaymentLine = (
    id: number,
    field: keyof InstallmentPayLine,
    value: string,
  ) => {
    setDownpaymentLines(
      downpaymentLines.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    );
  };

  const downpaymentTotalPayment = useMemo(() => {
    return downpaymentLines.reduce(
      (sum, l) => sum + (parseFloat(l.amount) || 0),
      0,
    );
  }, [downpaymentLines]);

  const downpaymentChangeAmount = useMemo(() => {
    return Math.max(0, downpaymentTotalPayment - customDownpaymentAmount);
  }, [downpaymentTotalPayment, customDownpaymentAmount]);

  const canSubmitDownpayment = useMemo(() => {
    if (downpaymentTotalPayment < customDownpaymentAmount) return false;
    for (const line of downpaymentLines) {
      if (!line.amount || parseFloat(line.amount) <= 0) return false;
      if (
        (line.payment_type === "gcash" ||
          line.payment_type === "bank_transfer") &&
        !line.reference_no
      )
        return false;
    }
    return true;
  }, [downpaymentTotalPayment, downpaymentLines, customDownpaymentAmount]);

  // Attempt to submit downpayment - check if below minimum first
  const attemptDownpaymentPayment = () => {
    if (customDownpaymentAmount < minDownpayment) {
      // Show confirmation modal with authorizer info
      setShowLowDpConfirm(true);
    } else {
      handleDownpaymentPayment();
    }
  };

  // Confirm low downpayment after authorization
  const confirmLowDownpayment = () => {
    setShowLowDpConfirm(false);
    setLowDpPendingPayment(true);
    handleDownpaymentPayment();
  };

  const handleDownpaymentPayment = async () => {
    if (!detail) return;
    setIsProcessingDownpayment(true);
    try {
      const response = await fetch("/api/auth/payment/multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: detail.assessment_id,
          payments: downpaymentLines.map((l) => ({
            payment_type: l.payment_type,
            amount: parseFloat(l.amount),
            reference_no: l.reference_no || undefined,
          })),
          student_number: detail.student_number,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to process downpayment");
      }

      const result = await response.json();
      setDownpaymentSuccess(
        result.message || "Downpayment recorded successfully!",
      );

      if (assessmentId) await fetchDetail(assessmentId);
      onPaymentSuccess?.();
      setTimeout(() => {
        resetDownpaymentPayment();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Payment failed");
    } finally {
      setIsProcessingDownpayment(false);
    }
  };

  // Computed installment breakdown
  const installmentBreakdown = useMemo(() => {
    if (!detail) return null;
    const totalMatriculation =
      detail.payment_mode?.toLowerCase() === "installment"
        ? detail.total_due_installment || detail.total_due
        : detail.total_due;
    // Use the FIXED down_payment stored in the DB (set on first payment).
    // If not yet stored, use the editable customDownpaymentAmount during the downpayment form,
    // or fall back to the minDownpayment default.
    const downpayment =
      detail.down_payment != null
        ? detail.down_payment
        : isPayingDownpayment
          ? customDownpaymentAmount
          : minDownpayment;
    const balance = Math.max(0, totalMatriculation - downpayment);
    const installmentCharge =
      Math.round(balance * (installmentChargePercent / 100) * 100) / 100;
    const netBalance = Math.round((balance + installmentCharge) * 100) / 100;
    const perTerm = Math.round((netBalance / 3) * 100) / 100;
    const finalsTerm = Math.round((netBalance - perTerm * 2) * 100) / 100;
    return {
      totalMatriculation,
      downpayment,
      balance,
      installmentCharge,
      netBalance,
      prelim: perTerm,
      midterm: perTerm,
      finals: finalsTerm,
    };
  }, [
    detail,
    minDownpayment,
    installmentChargePercent,
    customDownpaymentAmount,
    isPayingDownpayment,
  ]);

  const addInstallPayLine = () => {
    const maxId = Math.max(...installPayLines.map((l) => l.id), 0);
    setInstallPayLines([
      ...installPayLines,
      { id: maxId + 1, payment_type: "cash", amount: "", reference_no: "" },
    ]);
  };

  const removeInstallPayLine = (id: number) => {
    if (installPayLines.length <= 1) return;
    setInstallPayLines(installPayLines.filter((l) => l.id !== id));
  };

  const updateInstallPayLine = (
    id: number,
    field: keyof InstallmentPayLine,
    value: string,
  ) => {
    setInstallPayLines(
      installPayLines.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    );
  };

  const installTotalPayment = useMemo(() => {
    return installPayLines.reduce(
      (sum, l) => sum + (parseFloat(l.amount) || 0),
      0,
    );
  }, [installPayLines]);

  const installChangeAmount = useMemo(() => {
    if (!payingSchedule) return 0;
    return Math.max(0, installTotalPayment - payingSchedule.amount);
  }, [installTotalPayment, payingSchedule]);

  const canSubmitInstallment = useMemo(() => {
    if (!payingSchedule) return false;
    if (installTotalPayment < payingSchedule.amount) return false;
    for (const line of installPayLines) {
      if (!line.amount || parseFloat(line.amount) <= 0) return false;
      if (
        (line.payment_type === "gcash" ||
          line.payment_type === "bank_transfer") &&
        !line.reference_no
      )
        return false;
    }
    return true;
  }, [payingSchedule, installTotalPayment, installPayLines]);

  const handleInstallmentPayment = async () => {
    if (!payingSchedule || !detail) return;
    setIsProcessingInstallment(true);
    try {
      const response = await fetch("/api/auth/payment/multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: detail.assessment_id,
          payments: installPayLines.map((l) => ({
            payment_type: l.payment_type,
            amount: parseFloat(l.amount),
            reference_no: l.reference_no || undefined,
          })),
          scheduleLabel: payingSchedule.label,
          student_number: detail.student_number,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to process payment");
      }

      const result = await response.json();
      setInstallmentSuccess(
        result.message ||
          `Payment for ${payingSchedule.label} recorded successfully!`,
      );

      // Refresh the detail data
      if (assessmentId) await fetchDetail(assessmentId);
      // Notify parent to refresh its list
      onPaymentSuccess?.();

      // Reset payment form after a short delay
      setTimeout(() => {
        resetInstallmentPayment();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Payment failed");
    } finally {
      setIsProcessingInstallment(false);
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

  if (!isOpen) return null;

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "Fully Paid": "bg-green-100 text-green-800",
      Partial: "bg-orange-100 text-orange-800",
      Unpaid: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || "bg-gray-100 text-gray-800"}`}
      >
        {status}
      </span>
    );
  };

  const tabs: { key: DetailTab; label: string; icon: React.ReactNode }[] = [
    {
      key: "subjects",
      label: "Subjects",
      icon: <BookOpen className='w-4 h-4' />,
    },
    {
      key: "fees",
      label: "Fees Breakdown",
      icon: <Receipt className='w-4 h-4' />,
    },
    {
      key: "payments",
      label: "Payments",
      icon: <CreditCard className='w-4 h-4' />,
    },
    {
      key: "schedule",
      label: "Schedule",
      icon: <Calendar className='w-4 h-4' />,
    },
  ];

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
      <div className='bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden'>
        {/* Header */}
        <div
          className='px-6 py-4 flex items-center justify-between border-b'
          style={{
            backgroundColor: colors.primary,
            borderColor: colors.primary,
          }}
        >
          <div className='flex items-center gap-3'>
            <GraduationCap className='w-6 h-6 text-white' />
            <h2 className='text-lg font-bold text-white'>
              Financial Summary Detail
            </h2>
          </div>
          <button
            onClick={onClose}
            className='text-white/80 hover:text-white transition-colors p-1'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto'>
          {isLoading ? (
            <div className='flex items-center justify-center py-16'>
              <Loader2 className='w-8 h-8 animate-spin text-gray-400' />
              <span className='ml-3 text-gray-500'>Loading details...</span>
            </div>
          ) : error ? (
            <div className='text-center py-16'>
              <p className='text-red-500 font-medium'>{error}</p>
              <button
                onClick={() => assessmentId && fetchDetail(assessmentId)}
                className='mt-3 text-sm text-blue-600 hover:underline'
              >
                Retry
              </button>
            </div>
          ) : detail ? (
            <>
              {/* Student Info Bar */}
              <div className='px-6 py-4 bg-gray-50 border-b border-gray-200'>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <div>
                    <p className='text-xs text-gray-500 uppercase tracking-wider'>
                      Student
                    </p>
                    <p className='font-semibold text-gray-900 text-sm'>
                      {detail.student_number}
                    </p>
                    <p className='text-xs text-gray-600'>
                      {detail.student_name}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500 uppercase tracking-wider'>
                      Program
                    </p>
                    <p className='font-semibold text-gray-900 text-sm'>
                      {detail.course_program || "-"}
                    </p>
                    <p className='text-xs text-gray-600'>
                      Year {detail.year_level || "-"}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500 uppercase tracking-wider'>
                      Term
                    </p>
                    <p className='font-semibold text-gray-900 text-sm'>
                      {detail.academic_year}
                    </p>
                    <p className='text-xs text-gray-600'>
                      Semester {detail.semester}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500 uppercase tracking-wider'>
                      Payment Mode
                    </p>
                    <p className='font-semibold text-gray-900 text-sm capitalize'>
                      {detail.payment_mode}
                    </p>
                    {statusBadge(detail.payment_status)}
                  </div>
                </div>

                {/* Summary numbers */}
                <div className='mt-4 grid grid-cols-3 gap-4'>
                  <div
                    className='rounded-lg p-3 text-center'
                    style={{ backgroundColor: `${colors.secondary}10` }}
                  >
                    <p className='text-xs text-gray-500'>Total Due</p>
                    <p
                      className='text-lg font-bold'
                      style={{ color: colors.secondary }}
                    >
                      {formatAmount(detail.total_due)}
                    </p>
                  </div>
                  <div className='bg-green-50 rounded-lg p-3 text-center'>
                    <p className='text-xs text-gray-500'>Total Paid</p>
                    <p className='text-lg font-bold text-green-600'>
                      {formatAmount(detail.total_paid)}
                    </p>
                  </div>
                  <div className='bg-red-50 rounded-lg p-3 text-center'>
                    <p className='text-xs text-gray-500'>Balance</p>
                    <p className='text-lg font-bold text-red-600'>
                      {formatAmount(detail.remaining_balance)}
                    </p>
                  </div>
                </div>

                {/* Payment Action Buttons */}
                {detail.remaining_balance > 0 &&
                  detail.payment_status !== "Fully Paid" && (
                    <div className='mt-4 flex gap-3'>
                      {detail.payment_mode?.toLowerCase() !== "installment" ? (
                        /* FULL PAY mode - show pay full amount button */
                        <button
                          onClick={openFullPay}
                          disabled={isPayingFullPay}
                          className='flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium text-sm hover:opacity-90 transition-colors disabled:opacity-50'
                          style={{ backgroundColor: colors.secondary }}
                        >
                          <DollarSign className='w-4 h-4' />
                          Pay Full Amount (
                          {formatAmount(detail.remaining_balance)})
                        </button>
                      ) : (
                        /* INSTALLMENT mode */
                        <>
                          {detail.total_paid === 0 ? (
                            /* First payment - show downpayment button */
                            <button
                              onClick={openDownpayment}
                              disabled={isPayingDownpayment}
                              className='flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium text-sm hover:opacity-90 transition-colors disabled:opacity-50'
                              style={{ backgroundColor: colors.secondary }}
                            >
                              <DollarSign className='w-4 h-4' />
                              Pay Downpayment (Min.{" "}
                              {formatAmount(minDownpayment)})
                            </button>
                          ) : (
                            /* After downpayment - guide to schedule tab */
                            <div
                              className='flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border'
                              style={{
                                borderColor: colors.secondary + "40",
                                color: colors.secondary,
                                backgroundColor: colors.secondary + "08",
                              }}
                            >
                              <Calendar className='w-4 h-4' />
                              Downpayment paid. Go to Schedule tab to pay
                              installments.
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                {/* Full Pay Payment Form */}
                {isPayingFullPay && detail && (
                  <div className='mt-4 border border-green-200 rounded-lg overflow-hidden bg-green-50/30'>
                    <div className='px-4 py-3 bg-green-100/50 border-b border-green-200 flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <DollarSign className='w-5 h-5 text-green-700' />
                        <span className='font-semibold text-green-900 text-sm'>
                          Full Payment —{" "}
                          {formatAmount(detail.remaining_balance)}
                        </span>
                      </div>
                      <button
                        onClick={resetFullPayPayment}
                        className='text-green-400 hover:text-green-600 p-1'
                      >
                        <X className='w-4 h-4' />
                      </button>
                    </div>
                    {fullPaySuccess ? (
                      <div className='p-4'>
                        <div className='flex items-center gap-2 text-green-800 text-sm'>
                          <CheckCircle className='w-5 h-5' />
                          <span>{fullPaySuccess}</span>
                        </div>
                      </div>
                    ) : (
                      <div className='p-4 space-y-3'>
                        {fullPayLines.map((line, index) => (
                          <div key={line.id} className='flex items-start gap-2'>
                            <div className='flex-shrink-0 pt-2 text-xs text-gray-400 w-5 text-right'>
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
                                      updateFullPayLine(
                                        line.id,
                                        "payment_type",
                                        e.target.value,
                                      )
                                    }
                                    className='w-full pl-9 pr-2 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent'
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
                                      updateFullPayLine(
                                        line.id,
                                        "amount",
                                        e.target.value,
                                      )
                                    }
                                    placeholder='0.00'
                                    className='w-full pl-7 pr-2 py-2 border border-gray-300 rounded-lg bg-white text-sm text-right focus:ring-2 focus:ring-green-500 focus:border-transparent'
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
                                      updateFullPayLine(
                                        line.id,
                                        "reference_no",
                                        e.target.value,
                                      )
                                    }
                                    placeholder={
                                      line.payment_type === "cash"
                                        ? "Optional"
                                        : "Required"
                                    }
                                    className='w-full pl-7 pr-2 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent'
                                    disabled={line.payment_type === "cash"}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className='flex-shrink-0 pt-7'>
                              <button
                                onClick={() => removeFullPayLine(line.id)}
                                disabled={fullPayLines.length <= 1}
                                className='p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors'
                              >
                                <Trash2 className='w-4 h-4' />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={addFullPayLine}
                          className='flex items-center gap-1.5 text-xs font-medium text-green-600 hover:text-green-800 transition-colors mt-1'
                        >
                          <Plus className='w-3.5 h-3.5' />
                          Add Payment Line
                        </button>
                        <div className='border-t border-green-200 pt-3 space-y-1.5'>
                          <div className='flex justify-between text-sm'>
                            <span className='text-gray-600'>
                              Required Amount
                            </span>
                            <span className='font-medium'>
                              {formatAmount(detail.remaining_balance)}
                            </span>
                          </div>
                          <div className='flex justify-between text-sm'>
                            <span className='text-gray-600'>Total Payment</span>
                            <span
                              className={`font-semibold ${fullPayTotalPayment >= detail.remaining_balance ? "text-green-600" : "text-red-600"}`}
                            >
                              {formatAmount(fullPayTotalPayment)}
                            </span>
                          </div>
                          {fullPayChangeAmount > 0 && (
                            <div className='flex justify-between text-sm'>
                              <span className='text-gray-600'>Change</span>
                              <span className='font-medium text-green-600'>
                                {formatAmount(fullPayChangeAmount)}
                              </span>
                            </div>
                          )}
                          {fullPayTotalPayment < detail.remaining_balance && (
                            <p className='text-xs text-red-500'>
                              Insufficient amount. Need{" "}
                              {formatAmount(
                                detail.remaining_balance - fullPayTotalPayment,
                              )}{" "}
                              more.
                            </p>
                          )}
                        </div>
                        <div className='flex justify-end gap-2 pt-2'>
                          <button
                            onClick={resetFullPayPayment}
                            className='px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors'
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleFullPayPayment}
                            disabled={!canSubmitFullPay || isProcessingFullPay}
                            className='px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2'
                            style={{ backgroundColor: colors.secondary }}
                          >
                            {isProcessingFullPay ? (
                              <>
                                <Loader2 className='w-4 h-4 animate-spin' />
                                Processing...
                              </>
                            ) : (
                              <>
                                <DollarSign className='w-4 h-4' />
                                Confirm Full Payment
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Downpayment Payment Form */}
                {isPayingDownpayment && detail && (
                  <div className='mt-4 border border-blue-200 rounded-lg overflow-hidden bg-blue-50/30'>
                    <div className='px-4 py-3 bg-blue-100/50 border-b border-blue-200 flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <DollarSign className='w-5 h-5 text-blue-700' />
                        <span className='font-semibold text-blue-900 text-sm'>
                          Downpayment — Min. {formatAmount(minDownpayment)}
                        </span>
                      </div>
                      <button
                        onClick={resetDownpaymentPayment}
                        className='text-blue-400 hover:text-blue-600 p-1'
                      >
                        <X className='w-4 h-4' />
                      </button>
                    </div>
                    {downpaymentSuccess ? (
                      <div className='p-4'>
                        <div className='flex items-center gap-2 text-green-800 text-sm'>
                          <CheckCircle className='w-5 h-5' />
                          <span>{downpaymentSuccess}</span>
                        </div>
                      </div>
                    ) : (
                      <div className='p-4 space-y-3'>
                        {/* Editable downpayment amount */}
                        <div className='p-3 rounded-lg border border-blue-200 bg-blue-50'>
                          <label className='text-xs font-medium text-blue-800 mb-1.5 block'>
                            Downpayment Amount (editable)
                          </label>
                          <div className='relative'>
                            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-medium'>
                              ₱
                            </span>
                            <input
                              type='number'
                              step='0.01'
                              min='0.01'
                              value={customDownpaymentAmount}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setCustomDownpaymentAmount(val);
                                // Auto-update the first payment line amount to match
                                if (downpaymentLines.length === 1) {
                                  setDownpaymentLines([
                                    {
                                      ...downpaymentLines[0],
                                      amount: String(val),
                                    },
                                  ]);
                                }
                              }}
                              className='w-full pl-8 pr-3 py-2.5 border border-blue-300 rounded-lg bg-white text-sm text-right font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                            />
                          </div>
                          {customDownpaymentAmount < minDownpayment && (
                            <div className='flex items-center gap-1.5 mt-2 text-xs text-amber-600'>
                              <AlertTriangle className='w-3.5 h-3.5 flex-shrink-0' />
                              <span>
                                Below minimum ({formatAmount(minDownpayment)}).
                                Will require authorization.
                              </span>
                            </div>
                          )}
                        </div>

                        {downpaymentLines.map((line, index) => (
                          <div key={line.id} className='flex items-start gap-2'>
                            <div className='flex-shrink-0 pt-2 text-xs text-gray-400 w-5 text-right'>
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
                                      updateDownpaymentLine(
                                        line.id,
                                        "payment_type",
                                        e.target.value,
                                      )
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
                                      updateDownpaymentLine(
                                        line.id,
                                        "amount",
                                        e.target.value,
                                      )
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
                                      updateDownpaymentLine(
                                        line.id,
                                        "reference_no",
                                        e.target.value,
                                      )
                                    }
                                    placeholder={
                                      line.payment_type === "cash"
                                        ? "Optional"
                                        : "Required"
                                    }
                                    className='w-full pl-7 pr-2 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                                    disabled={line.payment_type === "cash"}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className='flex-shrink-0 pt-7'>
                              <button
                                onClick={() => removeDownpaymentLine(line.id)}
                                disabled={downpaymentLines.length <= 1}
                                className='p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors'
                              >
                                <Trash2 className='w-4 h-4' />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={addDownpaymentLine}
                          className='flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors mt-1'
                        >
                          <Plus className='w-3.5 h-3.5' />
                          Add Payment Line
                        </button>
                        <div className='border-t border-blue-200 pt-3 space-y-1.5'>
                          <div className='flex justify-between text-sm'>
                            <span className='text-gray-600'>
                              Downpayment Amount
                            </span>
                            <span className='font-medium'>
                              {formatAmount(customDownpaymentAmount)}
                            </span>
                          </div>
                          {customDownpaymentAmount < minDownpayment && (
                            <div className='flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1.5 rounded'>
                              <AlertTriangle className='w-3.5 h-3.5 flex-shrink-0' />
                              <span>
                                Below minimum downpayment of{" "}
                                {formatAmount(minDownpayment)}
                              </span>
                            </div>
                          )}
                          <div className='flex justify-between text-sm'>
                            <span className='text-gray-600'>Total Payment</span>
                            <span
                              className={`font-semibold ${downpaymentTotalPayment >= customDownpaymentAmount ? "text-green-600" : "text-red-600"}`}
                            >
                              {formatAmount(downpaymentTotalPayment)}
                            </span>
                          </div>
                          {downpaymentChangeAmount > 0 && (
                            <div className='flex justify-between text-sm'>
                              <span className='text-gray-600'>Change</span>
                              <span className='font-medium text-blue-600'>
                                {formatAmount(downpaymentChangeAmount)}
                              </span>
                            </div>
                          )}
                          {downpaymentTotalPayment <
                            customDownpaymentAmount && (
                            <p className='text-xs text-red-500'>
                              Insufficient amount. Need{" "}
                              {formatAmount(
                                customDownpaymentAmount -
                                  downpaymentTotalPayment,
                              )}{" "}
                              more.
                            </p>
                          )}
                        </div>
                        <div className='flex justify-end gap-2 pt-2'>
                          <button
                            onClick={resetDownpaymentPayment}
                            className='px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors'
                          >
                            Cancel
                          </button>
                          <button
                            onClick={attemptDownpaymentPayment}
                            disabled={
                              !canSubmitDownpayment || isProcessingDownpayment
                            }
                            className='px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2'
                            style={{
                              backgroundColor:
                                customDownpaymentAmount < minDownpayment
                                  ? "#d97706"
                                  : colors.secondary,
                            }}
                          >
                            {isProcessingDownpayment ? (
                              <>
                                <Loader2 className='w-4 h-4 animate-spin' />
                                Processing...
                              </>
                            ) : (
                              <>
                                <DollarSign className='w-4 h-4' />
                                Confirm Downpayment
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tab Navigation */}
              <div className='px-6 border-b border-gray-200'>
                <div className='flex gap-1 -mb-px'>
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.key
                          ? "border-current text-gray-900"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                      style={
                        activeTab === tab.key
                          ? {
                              color: colors.secondary,
                              borderColor: colors.secondary,
                            }
                          : {}
                      }
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.key === "subjects" && (
                        <span className='text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full'>
                          {detail.subjects.length}
                        </span>
                      )}
                      {tab.key === "payments" && detail.payments.length > 0 && (
                        <span className='text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full'>
                          {detail.payments.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className='px-6 py-4'>
                {/* Subjects Tab */}
                {activeTab === "subjects" && (
                  <div>
                    {detail.subjects.length === 0 ? (
                      <div className='text-center py-8 text-gray-500'>
                        <BookOpen className='w-10 h-10 mx-auto mb-2 text-gray-300' />
                        <p>No enrolled subjects found for this term.</p>
                      </div>
                    ) : (
                      <>
                        <div className='overflow-x-auto'>
                          <table className='w-full'>
                            <thead>
                              <tr className='bg-gray-50 border-b border-gray-200'>
                                <th className='px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                  Code
                                </th>
                                <th className='px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                  Descriptive Title
                                </th>
                                <th className='px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                  Lec
                                </th>
                                <th className='px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                  Lab
                                </th>
                                <th className='px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                  Units
                                </th>
                                <th className='px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                  Fixed Amt
                                </th>
                                <th className='px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className='divide-y divide-gray-100'>
                              {detail.subjects.map((subj) => (
                                <tr
                                  key={subj.id}
                                  className='hover:bg-gray-50 transition-colors'
                                >
                                  <td className='px-4 py-2.5 text-sm font-medium text-gray-900'>
                                    {subj.course_code}
                                  </td>
                                  <td className='px-4 py-2.5 text-sm text-gray-700'>
                                    {subj.descriptive_title}
                                  </td>
                                  <td className='px-4 py-2.5 text-sm text-center text-gray-600'>
                                    {subj.units_lec}
                                  </td>
                                  <td className='px-4 py-2.5 text-sm text-center text-gray-600'>
                                    {subj.units_lab}
                                  </td>
                                  <td className='px-4 py-2.5 text-sm text-center font-semibold text-gray-900'>
                                    {subj.units_total}
                                  </td>
                                  <td className='px-4 py-2.5 text-sm text-right text-gray-600'>
                                    {subj.fixed_amount
                                      ? formatAmount(subj.fixed_amount)
                                      : "-"}
                                  </td>
                                  <td className='px-4 py-2.5 text-center'>
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                        subj.status === "enrolled"
                                          ? "bg-green-100 text-green-800"
                                          : subj.status === "dropped"
                                            ? "bg-red-100 text-red-800"
                                            : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {subj.status || "N/A"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className='mt-3 flex justify-between items-center px-4 py-2 bg-gray-50 rounded-lg text-sm'>
                          <span className='text-gray-600'>
                            {detail.subjects.length} subject(s)
                          </span>
                          <span className='font-semibold text-gray-900'>
                            Total Units: {detail.total_units}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Fees Breakdown Tab */}
                {activeTab === "fees" && (
                  <div className='space-y-3'>
                    {/* Tuition */}
                    <div className='border border-gray-200 rounded-lg overflow-hidden'>
                      <div
                        className='px-4 py-2.5 font-medium text-sm flex justify-between items-center'
                        style={{
                          backgroundColor: `${colors.primary}08`,
                          color: colors.primary,
                        }}
                      >
                        <span>Tuition</span>
                      </div>
                      <div className='px-4 py-2 space-y-1 text-sm'>
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>Gross Tuition</span>
                          <span className='font-medium'>
                            {formatAmount(detail.tuition.gross_tuition)}
                          </span>
                        </div>
                        {detail.tuition.discount_amount > 0 && (
                          <div className='flex justify-between text-green-600'>
                            <span>
                              Discount
                              {detail.tuition.discount_name
                                ? ` (${detail.tuition.discount_name})`
                                : ""}
                              {detail.tuition.discount_percent
                                ? ` ${detail.tuition.discount_percent}%`
                                : ""}
                            </span>
                            <span>
                              -{formatAmount(detail.tuition.discount_amount)}
                            </span>
                          </div>
                        )}
                        <div className='flex justify-between font-semibold border-t border-gray-100 pt-1'>
                          <span>Net Tuition</span>
                          <span style={{ color: colors.secondary }}>
                            {formatAmount(detail.tuition.net_tuition)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Fee Categories */}
                    {Object.entries(detail.fees).map(([category, feeItems]) => {
                      const catTotal = feeItems.reduce(
                        (sum, f) => sum + f.amount,
                        0,
                      );
                      const isExpanded = expandedCategories.has(category);
                      return (
                        <div
                          key={category}
                          className='border border-gray-200 rounded-lg overflow-hidden'
                        >
                          <button
                            onClick={() => toggleCategory(category)}
                            className='w-full px-4 py-2.5 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors'
                          >
                            <div className='flex items-center gap-2'>
                              {isExpanded ? (
                                <ChevronDown className='w-4 h-4 text-gray-400' />
                              ) : (
                                <ChevronRight className='w-4 h-4 text-gray-400' />
                              )}
                              <span className='text-sm font-medium text-gray-700 capitalize'>
                                {category} Fees
                              </span>
                              <span className='text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full'>
                                {feeItems.length}
                              </span>
                            </div>
                            <span className='text-sm font-semibold text-gray-900'>
                              {formatAmount(catTotal)}
                            </span>
                          </button>
                          {isExpanded && (
                            <div className='px-4 py-2 space-y-1 text-sm border-t border-gray-100'>
                              {feeItems.map((fee, idx) => (
                                <div key={idx} className='flex justify-between'>
                                  <span className='text-gray-600'>
                                    {fee.fee_name}
                                  </span>
                                  <span className='text-gray-900'>
                                    {formatAmount(fee.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Totals */}
                    <div className='border border-gray-200 rounded-lg overflow-hidden'>
                      <div className='px-4 py-3 space-y-1.5 text-sm'>
                        <div className='flex justify-between'>
                          <span className='text-gray-600'>Total Fees</span>
                          <span className='font-medium'>
                            {formatAmount(detail.total_fees)}
                          </span>
                        </div>
                        {detail.fixed_amount_total > 0 && (
                          <div className='flex justify-between'>
                            <span className='text-gray-600'>
                              Fixed Amount Total
                            </span>
                            <span className='font-medium'>
                              {formatAmount(detail.fixed_amount_total)}
                            </span>
                          </div>
                        )}
                        <div className='flex justify-between border-t border-gray-100 pt-1.5'>
                          <span className='text-gray-600'>Base Total</span>
                          <span className='font-semibold'>
                            {formatAmount(detail.base_total)}
                          </span>
                        </div>

                        {/* Payment Mode Specific Breakdown */}
                        {detail.payment_mode?.toLowerCase() === "installment" &&
                        installmentBreakdown ? (
                          <>
                            <div
                              className='flex justify-between border-t border-gray-200 pt-2 mt-1'
                              style={{ color: colors.primary }}
                            >
                              <span className='font-bold'>
                                TOTAL MATRICULATION
                              </span>
                              <span className='font-bold text-lg'>
                                {formatAmount(
                                  installmentBreakdown.totalMatriculation,
                                )}
                              </span>
                            </div>
                            <div className='flex justify-between'>
                              <span className='text-gray-600'>Downpayment</span>
                              <span className='font-medium'>
                                {formatAmount(installmentBreakdown.downpayment)}
                              </span>
                            </div>
                            <div className='flex justify-between border-t border-gray-100 pt-1.5'>
                              <span className='text-gray-600'>Balance</span>
                              <span className='font-semibold'>
                                {formatAmount(installmentBreakdown.balance)}
                              </span>
                            </div>
                            <div className='flex justify-between'>
                              <span className='text-gray-600'>
                                Installment Charge ({installmentChargePercent}%)
                              </span>
                              <span className='font-medium'>
                                {formatAmount(
                                  installmentBreakdown.installmentCharge,
                                )}
                              </span>
                            </div>
                            <div
                              className='flex justify-between border-t border-gray-200 pt-2 mt-1'
                              style={{ color: colors.secondary }}
                            >
                              <span className='font-bold'>NET BALANCE</span>
                              <span className='font-bold text-lg'>
                                {formatAmount(installmentBreakdown.netBalance)}
                              </span>
                            </div>
                            <div className='border-t border-gray-100 pt-1.5 space-y-1'>
                              <div className='flex justify-between'>
                                <span className='text-gray-600'>Prelim</span>
                                <span className='font-medium'>
                                  {formatAmount(installmentBreakdown.prelim)}
                                </span>
                              </div>
                              <div className='flex justify-between'>
                                <span className='text-gray-600'>Midterm</span>
                                <span className='font-medium'>
                                  {formatAmount(installmentBreakdown.midterm)}
                                </span>
                              </div>
                              <div className='flex justify-between'>
                                <span className='text-gray-600'>Finals</span>
                                <span className='font-medium'>
                                  {formatAmount(installmentBreakdown.finals)}
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {detail.insurance_amount != null &&
                              detail.insurance_amount > 0 && (
                                <div className='flex justify-between'>
                                  <span className='text-gray-600'>
                                    Insurance
                                  </span>
                                  <span className='font-medium'>
                                    {formatAmount(detail.insurance_amount)}
                                  </span>
                                </div>
                              )}
                            <div
                              className='flex justify-between border-t border-gray-200 pt-2 mt-1'
                              style={{ color: colors.primary }}
                            >
                              <span className='font-bold'>
                                TOTAL DUE (Full Pay)
                              </span>
                              <span className='font-bold text-lg'>
                                {formatAmount(detail.total_due)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Payments Tab */}
                {activeTab === "payments" && (
                  <div>
                    {detail.payments.length === 0 ? (
                      <div className='text-center py-8 text-gray-500'>
                        <CreditCard className='w-10 h-10 mx-auto mb-2 text-gray-300' />
                        <p>No payments recorded yet.</p>
                      </div>
                    ) : (
                      <div className='overflow-x-auto'>
                        <table className='w-full'>
                          <thead>
                            <tr className='bg-gray-50 border-b border-gray-200'>
                              <th className='px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Date
                              </th>
                              <th className='px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Type
                              </th>
                              <th className='px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Reference
                              </th>
                              <th className='px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody className='divide-y divide-gray-100'>
                            {detail.payments.map((payment) => (
                              <tr key={payment.id} className='hover:bg-gray-50'>
                                <td className='px-4 py-2.5 text-sm text-gray-700'>
                                  {new Date(
                                    payment.payment_date,
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </td>
                                <td className='px-4 py-2.5 text-sm'>
                                  <span className='capitalize font-medium text-gray-900'>
                                    {payment.payment_type.replace("_", " ")}
                                  </span>
                                </td>
                                <td className='px-4 py-2.5 text-sm text-gray-600'>
                                  {payment.reference_no || "-"}
                                </td>
                                <td className='px-4 py-2.5 text-sm text-right font-semibold text-green-600'>
                                  {formatAmount(payment.amount_paid)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className='bg-gray-50 font-semibold'>
                              <td
                                colSpan={3}
                                className='px-4 py-2.5 text-sm text-gray-700'
                              >
                                Total Paid
                              </td>
                              <td className='px-4 py-2.5 text-sm text-right text-green-600'>
                                {formatAmount(detail.total_paid)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Schedule Tab */}
                {activeTab === "schedule" && (
                  <div>
                    {detail.payment_mode.toLowerCase() !== "installment" ? (
                      <div className='text-center py-8 text-gray-500'>
                        <Calendar className='w-10 h-10 mx-auto mb-2 text-gray-300' />
                        <p>
                          Payment mode is <strong>{detail.payment_mode}</strong>
                          . No installment schedule available.
                        </p>
                      </div>
                    ) : (
                      <div className='space-y-4'>
                        {/* Installment Breakdown Summary */}
                        {installmentBreakdown &&
                          (() => {
                            const paidScheduleAmount = detail.payment_schedule
                              .filter((s) => s.is_paid)
                              .reduce((sum, s) => {
                                const computed = s.label
                                  .toLowerCase()
                                  .includes("prelim")
                                  ? installmentBreakdown.prelim
                                  : s.label.toLowerCase().includes("midterm")
                                    ? installmentBreakdown.midterm
                                    : s.label.toLowerCase().includes("final")
                                      ? installmentBreakdown.finals
                                      : s.amount;
                                return sum + computed;
                              }, 0);
                            const remainingInstallment = Math.max(
                              0,
                              installmentBreakdown.netBalance -
                                paidScheduleAmount,
                            );
                            return (
                              <div className='border border-gray-200 rounded-lg overflow-hidden'>
                                <div
                                  className='px-4 py-2.5 font-medium text-sm flex justify-between items-center'
                                  style={{
                                    backgroundColor: `${colors.primary}08`,
                                    color: colors.primary,
                                  }}
                                >
                                  <span>Installment Breakdown</span>
                                </div>
                                <div className='px-4 py-3 space-y-1.5 text-sm'>
                                  <div className='flex justify-between'>
                                    <span className='text-gray-600'>
                                      Total Matriculation
                                    </span>
                                    <span className='font-medium'>
                                      {formatAmount(
                                        installmentBreakdown.totalMatriculation,
                                      )}
                                    </span>
                                  </div>
                                  <div className='flex justify-between'>
                                    <span className='text-gray-600'>
                                      Downpayment{" "}
                                      {detail.down_payment != null
                                        ? "(Paid)"
                                        : ""}
                                    </span>
                                    <span className='font-medium text-green-600'>
                                      {formatAmount(
                                        installmentBreakdown.downpayment,
                                      )}
                                    </span>
                                  </div>
                                  <div className='flex justify-between border-t border-gray-100 pt-1.5'>
                                    <span className='text-gray-600'>
                                      Balance
                                    </span>
                                    <span className='font-semibold'>
                                      {formatAmount(
                                        installmentBreakdown.balance,
                                      )}
                                    </span>
                                  </div>
                                  <div className='flex justify-between'>
                                    <span className='text-gray-600'>
                                      Installment Charge (
                                      {installmentChargePercent}%)
                                    </span>
                                    <span className='font-medium'>
                                      {formatAmount(
                                        installmentBreakdown.installmentCharge,
                                      )}
                                    </span>
                                  </div>
                                  <div
                                    className='flex justify-between border-t border-gray-200 pt-2 mt-1'
                                    style={{ color: colors.secondary }}
                                  >
                                    <span className='font-bold'>
                                      NET BALANCE
                                    </span>
                                    <span className='font-bold text-lg'>
                                      {formatAmount(
                                        installmentBreakdown.netBalance,
                                      )}
                                    </span>
                                  </div>
                                  {paidScheduleAmount > 0 && (
                                    <>
                                      <div className='flex justify-between pt-1'>
                                        <span className='text-green-600 font-medium'>
                                          Installments Paid
                                        </span>
                                        <span className='font-medium text-green-600'>
                                          -{formatAmount(paidScheduleAmount)}
                                        </span>
                                      </div>
                                      <div className='flex justify-between border-t border-gray-200 pt-2 mt-1'>
                                        <span className='font-bold text-red-600'>
                                          REMAINING
                                        </span>
                                        <span className='font-bold text-lg text-red-600'>
                                          {formatAmount(remainingInstallment)}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                        {/* Success message */}
                        {installmentSuccess && (
                          <div className='flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm'>
                            <CheckCircle className='w-5 h-5 flex-shrink-0' />
                            <span>{installmentSuccess}</span>
                          </div>
                        )}

                        {detail.total_paid === 0 ? (
                          <div className='text-center py-6 text-gray-500 bg-amber-50 border border-amber-200 rounded-lg'>
                            <AlertTriangle className='w-8 h-8 mx-auto mb-2 text-amber-400' />
                            <p className='font-medium text-amber-800'>
                              Downpayment Required
                            </p>
                            <p className='text-sm text-amber-600 mt-1'>
                              Please pay the downpayment first before paying
                              installments.
                            </p>
                          </div>
                        ) : detail.payment_schedule.length === 0 ? (
                          <div className='text-center py-8 text-gray-500'>
                            <Calendar className='w-10 h-10 mx-auto mb-2 text-gray-300' />
                            <p>No installment schedule found.</p>
                          </div>
                        ) : (
                          <>
                            <div className='overflow-x-auto'>
                              <table className='w-full'>
                                <thead>
                                  <tr className='bg-gray-50 border-b border-gray-200'>
                                    <th className='px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                      Period
                                    </th>
                                    <th className='px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                      Due Date
                                    </th>
                                    <th className='px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                      Amount
                                    </th>
                                    <th className='px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                      Status
                                    </th>
                                    <th className='px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                      Action
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className='divide-y divide-gray-100'>
                                  {detail.payment_schedule.map((sched) => {
                                    // Use computed amounts from installmentBreakdown
                                    const computedAmount = installmentBreakdown
                                      ? sched.label
                                          .toLowerCase()
                                          .includes("prelim")
                                        ? installmentBreakdown.prelim
                                        : sched.label
                                              .toLowerCase()
                                              .includes("midterm")
                                          ? installmentBreakdown.midterm
                                          : sched.label
                                                .toLowerCase()
                                                .includes("final")
                                            ? installmentBreakdown.finals
                                            : sched.amount
                                      : sched.amount;
                                    return (
                                      <tr
                                        key={sched.id}
                                        className={`hover:bg-gray-50 ${sched.is_paid ? "bg-green-50/50" : ""} ${payingSchedule?.id === sched.id ? "bg-blue-50 border-l-4 border-l-blue-400" : ""}`}
                                      >
                                        <td className='px-4 py-2.5 text-sm font-medium text-gray-900'>
                                          {sched.label}
                                        </td>
                                        <td className='px-4 py-2.5 text-sm text-gray-600'>
                                          {new Date(
                                            sched.due_date,
                                          ).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                          })}
                                        </td>
                                        <td className='px-4 py-2.5 text-sm text-right font-medium'>
                                          {formatAmount(computedAmount)}
                                        </td>
                                        <td className='px-4 py-2.5 text-center'>
                                          {sched.is_paid ? (
                                            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                                              Paid
                                            </span>
                                          ) : (
                                            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'>
                                              Pending
                                            </span>
                                          )}
                                        </td>
                                        <td className='px-4 py-2.5 text-center'>
                                          {!sched.is_paid && (
                                            <button
                                              onClick={() => {
                                                // Override the schedule amount with computedAmount
                                                const overriddenSched = {
                                                  ...sched,
                                                  amount: computedAmount,
                                                };
                                                openInstallmentPay(
                                                  overriddenSched,
                                                );
                                              }}
                                              disabled={isProcessingInstallment}
                                              className='inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50'
                                              style={{
                                                backgroundColor:
                                                  colors.secondary,
                                              }}
                                            >
                                              <DollarSign className='w-3.5 h-3.5' />
                                              Pay
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className='bg-gray-50 font-semibold'>
                                    <td
                                      colSpan={2}
                                      className='px-4 py-2.5 text-sm text-gray-700'
                                    >
                                      Total
                                    </td>
                                    <td className='px-4 py-2.5 text-sm text-right'>
                                      {formatAmount(
                                        installmentBreakdown?.netBalance ??
                                          detail.payment_schedule.reduce(
                                            (sum, s) => sum + s.amount,
                                            0,
                                          ),
                                      )}
                                    </td>
                                    <td className='px-4 py-2.5 text-center text-xs text-gray-500'>
                                      {
                                        detail.payment_schedule.filter(
                                          (s) => s.is_paid,
                                        ).length
                                      }
                                      /{detail.payment_schedule.length} paid
                                    </td>
                                    <td></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>

                            {/* Installment Payment Form */}
                            {payingSchedule && (
                              <div className='border border-blue-200 rounded-lg overflow-hidden bg-blue-50/30'>
                                <div className='px-4 py-3 bg-blue-100/50 border-b border-blue-200 flex items-center justify-between'>
                                  <div className='flex items-center gap-2'>
                                    <DollarSign className='w-5 h-5 text-blue-700' />
                                    <span className='font-semibold text-blue-900 text-sm'>
                                      Pay {payingSchedule.label} —{" "}
                                      {formatAmount(payingSchedule.amount)}
                                    </span>
                                  </div>
                                  <button
                                    onClick={resetInstallmentPayment}
                                    className='text-blue-400 hover:text-blue-600 p-1'
                                  >
                                    <X className='w-4 h-4' />
                                  </button>
                                </div>

                                <div className='p-4 space-y-3'>
                                  {/* Payment lines */}
                                  {installPayLines.map((line, index) => (
                                    <div
                                      key={line.id}
                                      className='flex items-start gap-2'
                                    >
                                      <div className='flex-shrink-0 pt-2 text-xs text-gray-400 w-5 text-right'>
                                        {index + 1}.
                                      </div>
                                      <div className='flex-1 grid grid-cols-3 gap-2'>
                                        {/* Payment Type */}
                                        <div>
                                          <label className='text-xs text-gray-500 mb-1 block'>
                                            Type
                                          </label>
                                          <div className='relative'>
                                            <div className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400'>
                                              {paymentTypeIcon(
                                                line.payment_type,
                                              )}
                                            </div>
                                            <select
                                              value={line.payment_type}
                                              onChange={(e) =>
                                                updateInstallPayLine(
                                                  line.id,
                                                  "payment_type",
                                                  e.target.value,
                                                )
                                              }
                                              className='w-full pl-9 pr-2 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                                            >
                                              <option value='cash'>Cash</option>
                                              <option value='gcash'>
                                                GCash
                                              </option>
                                              <option value='bank_transfer'>
                                                Bank
                                              </option>
                                            </select>
                                          </div>
                                        </div>

                                        {/* Amount */}
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
                                                updateInstallPayLine(
                                                  line.id,
                                                  "amount",
                                                  e.target.value,
                                                )
                                              }
                                              placeholder='0.00'
                                              className='w-full pl-7 pr-2 py-2 border border-gray-300 rounded-lg bg-white text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                                            />
                                          </div>
                                        </div>

                                        {/* Reference */}
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
                                                updateInstallPayLine(
                                                  line.id,
                                                  "reference_no",
                                                  e.target.value,
                                                )
                                              }
                                              placeholder={
                                                line.payment_type === "cash"
                                                  ? "Optional"
                                                  : "Required"
                                              }
                                              className='w-full pl-7 pr-2 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                                              disabled={
                                                line.payment_type === "cash"
                                              }
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Remove button */}
                                      <div className='flex-shrink-0 pt-7'>
                                        <button
                                          onClick={() =>
                                            removeInstallPayLine(line.id)
                                          }
                                          disabled={installPayLines.length <= 1}
                                          className='p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors'
                                        >
                                          <Trash2 className='w-4 h-4' />
                                        </button>
                                      </div>
                                    </div>
                                  ))}

                                  {/* Add line button */}
                                  <button
                                    onClick={addInstallPayLine}
                                    className='flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors mt-1'
                                  >
                                    <Plus className='w-3.5 h-3.5' />
                                    Add Payment Line
                                  </button>

                                  {/* Payment summary */}
                                  <div className='border-t border-blue-200 pt-3 space-y-1.5'>
                                    <div className='flex justify-between text-sm'>
                                      <span className='text-gray-600'>
                                        Required Amount
                                      </span>
                                      <span className='font-medium'>
                                        {formatAmount(payingSchedule.amount)}
                                      </span>
                                    </div>
                                    <div className='flex justify-between text-sm'>
                                      <span className='text-gray-600'>
                                        Total Payment
                                      </span>
                                      <span
                                        className={`font-semibold ${installTotalPayment >= payingSchedule.amount ? "text-green-600" : "text-red-600"}`}
                                      >
                                        {formatAmount(installTotalPayment)}
                                      </span>
                                    </div>
                                    {installChangeAmount > 0 && (
                                      <div className='flex justify-between text-sm'>
                                        <span className='text-gray-600'>
                                          Change
                                        </span>
                                        <span className='font-medium text-blue-600'>
                                          {formatAmount(installChangeAmount)}
                                        </span>
                                      </div>
                                    )}
                                    {installTotalPayment <
                                      payingSchedule.amount && (
                                      <p className='text-xs text-red-500'>
                                        Insufficient amount. Need{" "}
                                        {formatAmount(
                                          payingSchedule.amount -
                                            installTotalPayment,
                                        )}{" "}
                                        more.
                                      </p>
                                    )}
                                  </div>

                                  {/* Submit buttons */}
                                  <div className='flex justify-end gap-2 pt-2'>
                                    <button
                                      onClick={resetInstallmentPayment}
                                      className='px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors'
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={handleInstallmentPayment}
                                      disabled={
                                        !canSubmitInstallment ||
                                        isProcessingInstallment
                                      }
                                      className='px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2'
                                      style={{
                                        backgroundColor: colors.secondary,
                                      }}
                                    >
                                      {isProcessingInstallment ? (
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
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className='px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end'>
          <button
            onClick={onClose}
            className='px-5 py-2 rounded-lg text-white font-medium text-sm hover:opacity-90 transition-colors'
            style={{ backgroundColor: colors.primary }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Low Downpayment Confirmation Modal */}
      {showLowDpConfirm && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4'>
          <div className='bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden'>
            {/* Header */}
            <div className='px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center gap-3'>
              <div className='p-2 rounded-full bg-amber-100'>
                <ShieldAlert className='w-6 h-6 text-amber-600' />
              </div>
              <div>
                <h3 className='text-lg font-bold text-amber-900'>
                  Below Minimum Downpayment
                </h3>
                <p className='text-sm text-amber-700'>Authorization required</p>
              </div>
            </div>

            {/* Content */}
            <div className='px-6 py-5 space-y-4'>
              <div className='bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-600'>Minimum Required</span>
                  <span className='font-bold text-gray-900'>
                    {formatAmount(minDownpayment)}
                  </span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-600'>Entered Amount</span>
                  <span className='font-bold text-amber-600'>
                    {formatAmount(customDownpaymentAmount)}
                  </span>
                </div>
                <div className='flex justify-between text-sm border-t border-amber-200 pt-2'>
                  <span className='text-gray-600'>Difference</span>
                  <span className='font-bold text-red-600'>
                    -{formatAmount(minDownpayment - customDownpaymentAmount)}
                  </span>
                </div>
              </div>

              <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
                <p className='text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5'>
                  Authorized By
                </p>
                <p
                  className='text-lg font-bold'
                  style={{ color: colors.primary }}
                >
                  {session?.user?.name || "Unknown User"}
                </p>
                <p className='text-sm text-gray-500'>
                  {session?.user?.email || ""}
                </p>
              </div>

              <p className='text-sm text-gray-600'>
                The downpayment of{" "}
                <strong>{formatAmount(customDownpaymentAmount)}</strong> is
                below the minimum of{" "}
                <strong>{formatAmount(minDownpayment)}</strong>. This action
                will be recorded. Do you wish to proceed?
              </p>
            </div>

            {/* Actions */}
            <div className='px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3'>
              <button
                onClick={() => setShowLowDpConfirm(false)}
                className='px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={confirmLowDownpayment}
                className='px-5 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-colors flex items-center gap-2'
                style={{ backgroundColor: "#d97706" }}
              >
                <ShieldAlert className='w-4 h-4' />
                Authorize & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
