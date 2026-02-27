import React from "react";
import { Package, Users, FileText, GraduationCap } from "lucide-react";
import { colors } from "../../colors";

type ActiveTab =
  | "products"
  | "enrollments"
  | "enrollment_payments"
  | "transactions";

interface PaymentBillingHeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const PaymentBillingHeader: React.FC<PaymentBillingHeaderProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <>
      {/* Header */}
      <div className='mb-6'>
        <h1
          className='text-2xl font-bold mb-2'
          style={{ color: colors.primary }}
        >
          Point of Sale System
        </h1>
        <p style={{ color: colors.primary }}>
          Process product sales and enrollment payments
        </p>
      </div>

      {/* Tab Navigation */}
      <div className='bg-white rounded-lg shadow-sm border border-gray-100 mb-6'>
        <div className='flex border-b border-gray-200'>
          <button
            onClick={() => onTabChange("products")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === "products"
                ? "border-b-2 text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            style={
              activeTab === "products"
                ? {
                    borderColor: colors.secondary,
                    backgroundColor: colors.secondary,
                  }
                : {}
            }
          >
            <Package className='w-5 h-5' />
            Products POS
          </button>
          <button
            onClick={() => onTabChange("enrollments")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === "enrollments"
                ? "border-b-2 text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            style={
              activeTab === "enrollments"
                ? {
                    borderColor: colors.secondary,
                    backgroundColor: colors.secondary,
                  }
                : {}
            }
          >
            <Users className='w-5 h-5' />
            Student Payments
          </button>
          <button
            onClick={() => onTabChange("enrollment_payments")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === "enrollment_payments"
                ? "border-b-2 text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            style={
              activeTab === "enrollment_payments"
                ? {
                    borderColor: colors.secondary,
                    backgroundColor: colors.secondary,
                  }
                : {}
            }
          >
            <GraduationCap className='w-5 h-5' />
            Enrollment Payments
          </button>
          <button
            onClick={() => onTabChange("transactions")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === "transactions"
                ? "border-b-2 text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            style={
              activeTab === "transactions"
                ? {
                    borderColor: colors.secondary,
                    backgroundColor: colors.secondary,
                  }
                : {}
            }
          >
            <FileText className='w-5 h-5' />
            Transactions
          </button>
        </div>
      </div>
    </>
  );
};

export default PaymentBillingHeader;
