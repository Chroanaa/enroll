import React from "react";
import { Ban } from "lucide-react";
import { colors } from "../../colors";
import { OrderWithDetails } from "../../utils/billingUtils";

interface VoidTransactionModalProps {
  isOpen: boolean;
  order: OrderWithDetails | null;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  isLoading: boolean;
  formatAmount: (amount: number | null | undefined) => string;
}

export const VoidTransactionModal: React.FC<VoidTransactionModalProps> = ({
  isOpen,
  order,
  onCancel,
  onConfirm,
  isLoading,
  formatAmount,
}) => {
  if (!isOpen || !order) return null;

  return (
    <div
      className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onCancel}
    >
      <div
        className='rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200'
        style={{ backgroundColor: "white" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='p-6'>
          <div className='w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4'>
            <Ban className='w-6 h-6 text-red-600' />
          </div>
          <h3 className='text-lg font-bold text-gray-900 text-center mb-2'>
            Void Transaction?
          </h3>
          <p className='text-sm text-gray-600 text-center mb-6'>
            Are you sure you want to void Order #
            {order.id.toString().padStart(6, "0")}? This action will mark the
            transaction as voided and cannot be undone.
          </p>
          <p
            className='text-center font-bold text-xl mb-6'
            style={{ color: colors.secondary }}
          >
            Amount: {formatAmount(order.order_amount || 0)}
          </p>
          <div className='flex gap-3'>
            <button
              onClick={onCancel}
              className='flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors'
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm()}
              className='flex-1 px-4 py-2 rounded-lg text-white font-medium bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50'
              disabled={isLoading}
            >
              {isLoading ? "Voiding..." : "Void Transaction"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



