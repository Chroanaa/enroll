import React from "react";
import { Package, Users, FileText, RefreshCw, BadgeCheck } from "lucide-react";
import { colors } from "../../colors";

type ActiveTab =
  | "products"
  | "enrollments"
  | "transactions"
  | "online-submissions";

interface PaymentBillingHeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const PaymentBillingHeader: React.FC<PaymentBillingHeaderProps> = ({
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <>
      {/* Header */}
      <div className='mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
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
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className='inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60'
          title='Refresh current payment table'
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
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
          <button
            onClick={() => onTabChange("online-submissions")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === "online-submissions"
                ? "border-b-2 text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            style={
              activeTab === "online-submissions"
                ? {
                    borderColor: colors.secondary,
                    backgroundColor: colors.secondary,
                  }
                : {}
            }
          >
            <BadgeCheck className='w-5 h-5' />
            Online Submissions
          </button>
        </div>
      </div>
    </>
  );
};

export default PaymentBillingHeader;
