import React from "react";
import { X, FileText, User } from "lucide-react";
import { colors } from "../../colors";
import { OrderWithDetails } from "../../utils/billingUtils";

interface OrderDetailsModalProps {
  isOpen: boolean;
  order: OrderWithDetails | null;
  onClose: () => void;
  onRequestVoid: () => void;
  formatAmount: (amount: number | null | undefined) => string;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  order,
  onClose,
  onRequestVoid,
  formatAmount,
}) => {
  if (!isOpen || !order) return null;

  return (
    <div
      className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className='rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200'
        style={{ backgroundColor: "white" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className='px-6 py-4 flex items-center justify-between border-b'
          style={{
            backgroundColor: order.isvoided ? "#FEF2F2" : `${colors.primary}08`,
            borderColor: order.isvoided ? "#FECACA" : `${colors.primary}15`,
          }}
        >
          <div className='flex items-center gap-3'>
            <div
              className='p-2 rounded-lg'
              style={{
                backgroundColor: order.isvoided
                  ? "#FEE2E2"
                  : `${colors.secondary}20`,
              }}
            >
              <FileText
                className='w-5 h-5'
                style={{
                  color: order.isvoided ? "#DC2626" : colors.secondary,
                }}
              />
            </div>
            <div>
              <h2
                className='text-xl font-bold'
                style={{
                  color: order.isvoided ? "#DC2626" : colors.primary,
                }}
              >
                {order.ar_number ||
                  `Order #${order.id.toString().padStart(6, "0")}`}
              </h2>
              <p className='text-sm text-gray-500'>
                {order.ar_number && <span className='mr-2'>ID: {order.id}</span>}
                {new Date(order.order_date).toLocaleString()}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {order.isvoided && (
              <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800'>
                VOIDED
              </span>
            )}
            <button
              onClick={onClose}
              className='p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600'
            >
              <X className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className='p-6 overflow-y-auto space-y-6'>
          {/* Student Info */}
          {order.student_name && (
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
              <div className='flex items-center gap-3'>
                <div className='p-2 rounded-lg bg-blue-100'>
                  <User className='w-5 h-5 text-blue-600' />
                </div>
                <div>
                  <p className='font-medium text-blue-900'>
                    {order.student_name}
                  </p>
                  <p className='text-sm text-blue-700'>
                    {order.student_number}
                  </p>
                  {order.student_program && (
                    <p className='text-xs text-blue-600'>
                      {order.student_program}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div>
            <h3 className='font-medium text-gray-900 mb-3'>Order Items</h3>
            <div className='bg-gray-50 rounded-lg overflow-hidden'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-gray-200'>
                    <th className='px-4 py-2 text-left text-sm font-medium text-gray-600'>
                      Item
                    </th>
                    <th className='px-4 py-2 text-center text-sm font-medium text-gray-600'>
                      Qty
                    </th>
                    <th className='px-4 py-2 text-right text-sm font-medium text-gray-600'>
                      Price
                    </th>
                    <th className='px-4 py-2 text-right text-sm font-medium text-gray-600'>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {order.order_details?.map((detail, index) => (
                    <tr key={index}>
                      <td className='px-4 py-3 text-sm text-gray-900'>
                        {detail.product_name || "Item"}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600 text-center'>
                        {detail.quantity || 0}
                      </td>
                      <td className='px-4 py-3 text-sm text-gray-600 text-right'>
                        {formatAmount(detail.selling_price || 0)}
                      </td>
                      <td
                        className='px-4 py-3 text-sm font-medium text-right'
                        style={{ color: colors.secondary }}
                      >
                        {formatAmount(detail.total || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Details */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='bg-gray-50 rounded-lg p-4'>
              <p className='text-sm text-gray-500 mb-1'>Payment Method</p>
              <p className='font-medium text-gray-900'>
                {order.payment_type || "N/A"}
              </p>
            </div>
            <div className='bg-gray-50 rounded-lg p-4'>
              <p className='text-sm text-gray-500 mb-1'>Total Amount</p>
              <p
                className='font-medium text-xl'
                style={{ color: colors.secondary }}
              >
                {formatAmount(order.order_amount || 0)}
              </p>
            </div>
          </div>

          {/* Payment Details (breakdown) */}
          {order.payment_details && (
            <div>
              <h3 className='font-medium text-gray-900 mb-3'>
                Payment Details
              </h3>
              <div className='bg-gray-50 rounded-lg p-4 space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-600'>Payment Method</span>
                  <span className='font-medium text-gray-900'>
                    {order.payment_details.payment_type_name || "N/A"}
                  </span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-600'>Amount Paid</span>
                  <span
                    className='font-medium'
                    style={{ color: colors.secondary }}
                  >
                    {formatAmount(order.payment_details.amount || 0)}
                  </span>
                </div>
                {order.payment_details.tendered_amount && (
                  <div className='flex justify-between text-sm'>
                    <span className='text-gray-600'>Tendered Amount</span>
                    <span className='font-medium text-gray-900'>
                      {formatAmount(order.payment_details.tendered_amount)}
                    </span>
                  </div>
                )}
                {order.payment_details.change_amount && (
                  <div className='flex justify-between text-sm'>
                    <span className='text-gray-600'>Change</span>
                    <span className='font-medium text-gray-900'>
                      {formatAmount(order.payment_details.change_amount)}
                    </span>
                  </div>
                )}
                {order.payment_details.transaction_ref && (
                  <div className='flex justify-between text-sm'>
                    <span className='text-gray-600'>Reference No.</span>
                    <span className='font-medium text-gray-900'>
                      {order.payment_details.transaction_ref}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!order.isvoided && (
          <div className='px-6 py-4 border-t border-gray-200 flex justify-end'>
            <button
              onClick={onRequestVoid}
              className='px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors'
            >
              Void Transaction
            </button>
          </div>
        )}
      </div>
    </div>
  );
};



