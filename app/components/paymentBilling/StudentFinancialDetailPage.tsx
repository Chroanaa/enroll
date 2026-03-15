"use client";
import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { colors } from "../../colors";
import { FinancialDetailModal } from "./FinancialDetailModal";
import { formatAmount } from "./utils";

const STUDENT_PAYMENT_UPDATED_KEY = "student-payment-updated";

const StudentFinancialDetailPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentIdParam = searchParams.get("assessmentId");
  const assessmentId = assessmentIdParam ? Number(assessmentIdParam) : null;

  const handlePaymentCompleted = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STUDENT_PAYMENT_UPDATED_KEY, String(Date.now()));
      sessionStorage.setItem("payment-billing-tab", "enrollments");
    }
    router.push(
      "/dashboard?view=student-financial-detail&assessmentId=" + assessmentId,
    );
  };

  if (!assessmentId || Number.isNaN(assessmentId)) {
    return (
      <div
        className='p-4 sm:p-6 min-h-screen flex items-center justify-center'
        style={{ backgroundColor: colors.paper }}
      >
        <div className='bg-white border border-gray-100 rounded-xl shadow-sm p-6 max-w-md w-full text-center space-y-3'>
          <h1 className='text-xl font-bold' style={{ color: colors.primary }}>
            Financial Detail
          </h1>
          <p className='text-sm text-gray-600'>
            Invalid or missing assessment id.
          </p>
          <button
            onClick={() => router.push("/dashboard?view=payment-billing")}
            className='inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50'
          >
            <ArrowLeft className='w-4 h-4' />
            Back to Billing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className='p-4 sm:p-6 min-h-screen'
      style={{ backgroundColor: colors.paper }}
    >
      <FinancialDetailModal
        isOpen={true}
        assessmentId={assessmentId}
        onClose={() => router.push("/dashboard?view=payment-billing")}
        formatAmount={formatAmount}
        onPaymentCompleted={handlePaymentCompleted}
        mode='page'
      />
    </div>
  );
};

export default StudentFinancialDetailPage;
