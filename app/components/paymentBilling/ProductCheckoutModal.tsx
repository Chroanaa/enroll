import React from "react";
import {
  Receipt,
  CreditCard,
  Wallet,
  Smartphone,
  Building2,
  DollarSign,
  Hash,
  X,
} from "lucide-react";
import { colors } from "../../colors";
import { CartItem } from "../../utils/billingUtils";

type PaymentType = "cash" | "gcash" | "bank_transfer";

interface ProductCheckoutModalProps {
  isOpen: boolean;
  cart: CartItem[];
  cartTotal: number;
  paymentType: PaymentType;
  setPaymentType: (type: PaymentType) => void;
  tenderedAmount: string;
  setTenderedAmount: (value: string) => void;
  referenceNo: string;
  setReferenceNo: (value: string) => void;
  changeAmount: number;
  onClose: () => void;
  onCheckout: () => Promise<void> | void;
  formatAmount: (amount: number | null | undefined) => string;
}

export const ProductCheckoutModal: React.FC<ProductCheckoutModalProps> = ({
  isOpen,
  cart,
  cartTotal,
  paymentType,
  setPaymentType,
  tenderedAmount,
  setTenderedAmount,
  referenceNo,
  setReferenceNo,
  changeAmount,
  onClose,
  onCheckout,
  formatAmount,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className='rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200'
        style={{ backgroundColor: "white" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className='px-6 py-4 flex items-center justify-between border-b'
          style={{
            backgroundColor: `${colors.primary}08`,
            borderColor: `${colors.primary}15`,
          }}
        >
          <div className='flex items-center gap-3'>
            <div
              className='p-2 rounded-lg'
              style={{ backgroundColor: `${colors.secondary}20` }}
            >
              <Receipt
                className='w-5 h-5'
                style={{ color: colors.secondary }}
              />
            </div>
            <div>
              <h2
                className='text-xl font-bold'
                style={{ color: colors.primary }}
              >
                Checkout
              </h2>
              <p className='text-sm text-gray-500'>Complete your purchase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Modal Body */}
        <div className='p-6 overflow-y-auto space-y-6'>
          {/* Order Summary */}
          <div className='bg-gray-50 rounded-lg p-4'>
            <h3 className='font-medium text-gray-900 mb-3'>Order Summary</h3>
            <div className='space-y-2 max-h-32 overflow-y-auto'>
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className='flex justify-between text-sm'
                >
                  <span className='text-gray-600'>
                    {item.product.name} x{item.quantity}
                  </span>
                  <span className='font-medium'>
                    {formatAmount(
                      (Number(item.product.price) || 0) * item.quantity,
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className='border-t border-gray-200 mt-3 pt-3 flex justify-between'>
              <span className='font-bold' style={{ color: colors.primary }}>
                Total
              </span>
              <span
                className='font-bold text-lg'
                style={{ color: colors.secondary }}
              >
                {formatAmount(cartTotal)}
              </span>
            </div>
          </div>

          {/* Payment Type */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              <CreditCard className='w-4 h-4 inline mr-1' />
              Payment Type
            </label>
            <div className='grid grid-cols-3 gap-3'>
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
                  onClick={() => setPaymentType(value as PaymentType)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    paymentType === value
                      ? `border-${color}-500 bg-${color}-50`
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  style={
                    paymentType === value
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
                    className='w-5 h-5 mx-auto mb-1'
                    style={{
                      color:
                        paymentType === value
                          ? color === "green"
                            ? "#22c55e"
                            : color === "blue"
                              ? "#3b82f6"
                              : "#a855f7"
                          : "#9ca3af",
                    }}
                  />
                  <span
                    className='text-xs font-medium block'
                    style={
                      paymentType === value
                        ? {
                            color:
                              color === "green"
                                ? "#15803d"
                                : color === "blue"
                                  ? "#1d4ed8"
                                  : "#7e22ce",
                          }
                        : { color: "#6b7280" }
                    }
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash Payment - Tendered Amount */}
          {paymentType === "cash" && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                <DollarSign className='w-4 h-4 inline mr-1' />
                Tendered Amount
              </label>
              <div className='relative'>
                <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500'>
                  ₱
                </span>
                <input
                  type='number'
                  step='0.01'
                  min={cartTotal}
                  value={tenderedAmount}
                  onChange={(e) => setTenderedAmount(e.target.value)}
                  placeholder='0.00'
                  className='w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                />
              </div>
              {parseFloat(tenderedAmount) >= cartTotal && (
                <p className='mt-2 text-green-600 font-medium'>
                  Change: {formatAmount(changeAmount)}
                </p>
              )}
            </div>
          )}

          {/* Electronic Payment - Reference Number */}
          {(paymentType === "gcash" || paymentType === "bank_transfer") && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                <Hash className='w-4 h-4 inline mr-1' />
                Reference Number
              </label>
              <input
                type='text'
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder='Enter reference number'
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
            </div>
          )}

          {/* Submit Buttons */}
          <div className='flex gap-3 pt-4 border-t border-gray-200'>
            <button
              type='button'
              onClick={onClose}
              className='flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={onCheckout}
              className='flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors'
              style={{ backgroundColor: colors.secondary }}
            >
              Complete Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



