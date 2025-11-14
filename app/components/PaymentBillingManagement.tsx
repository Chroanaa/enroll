"use client";
import React from "react";
import { CreditCard } from "lucide-react";
import { colors } from "../colors";

const PaymentBillingManagement: React.FC = () => {
  return (
    <div className='p-4 sm:p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-6xl mx-auto w-full'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold mb-2' style={{ color: colors.primary }}>
            Payment & Billing Management
          </h1>
          <p style={{ color: colors.primary }}>
            Review and verify payments, update payment statuses, and display student balances
          </p>
        </div>

        <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center'>
          <CreditCard className='mx-auto h-16 w-16 text-gray-400 mb-4' />
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            Payment & Billing Module
          </h3>
          <p className='text-gray-600'>
            This module allows the Cashier to review and verify payments, update payment statuses, and display student balances. 
            The system supports manual payment review with flexible modes such as GCash, bank deposit, or cash, ensuring accurate financial tracking.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentBillingManagement;


